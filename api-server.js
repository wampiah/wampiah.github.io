/**
 * PrimeOfficeSolutions Ltd — Backend API (Node.js / Express)
 * 
 * Stack: Node.js, Express, PostgreSQL (pg), bcrypt, JWT, Stripe, SendGrid
 * Install: npm install express pg bcrypt jsonwebtoken stripe @sendgrid/mail
 *          npm install express-rate-limit helmet cors express-validator
 */

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const sgMail = require('@sendgrid/mail');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many attempts' });
const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use('/api', generalLimiter);

// ─── HELPERS ─────────────────────────────────────────────────
const handleErrors = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const signToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorised' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorised' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    req.admin = decoded;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

const auditLog = async (actorType, actorId, action, entityType, entityId, oldVal, newVal, req) => {
  await db.query(
    `INSERT INTO audit_log (actor_type, actor_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [actorType, actorId, action, entityType, entityId, JSON.stringify(oldVal), JSON.stringify(newVal),
     req?.ip, req?.headers['user-agent']]
  );
};

// ─── AUTH ROUTES ──────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('phone').optional().isMobilePhone('en-GB'),
], validate, handleErrors(async (req, res) => {
  const { email, password, firstName, lastName, phone, marketingConsent } = req.body;

  const existing = await db.query('SELECT id FROM clients WHERE email = $1', [email]);
  if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO clients (email, password_hash, first_name, last_name, phone, marketing_consent)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [email, passwordHash, firstName, lastName, phone, marketingConsent || false]
  );
  const clientId = result.rows[0].id;

  // Create notification preferences row
  await db.query('INSERT INTO notification_preferences (client_id) VALUES ($1)', [clientId]);

  // Send verification email
  const verifyToken = jwt.sign({ clientId, type: 'email_verify' }, process.env.JWT_SECRET, { expiresIn: '24h' });
  await sgMail.send({
    to: email,
    from: 'wampiah@yahoo.co.uk',
    subject: 'Verify your PrimeOfficeSolutions Ltd email',
    html: `<p>Click <a href="${process.env.APP_URL}/verify-email?token=${verifyToken}">here</a> to verify your email. Link expires in 24 hours.</p>`,
  });

  await auditLog('client', clientId, 'auth.register', 'client', clientId, null, { email }, req);
  res.status(201).json({ message: 'Account created. Please verify your email.', clientId });
}));

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, handleErrors(async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query('SELECT * FROM clients WHERE email = $1', [email]);
  const client = result.rows[0];

  if (!client || !(await bcrypt.compare(password, client.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!client.email_verified) return res.status(403).json({ error: 'Please verify your email first' });
  if (client.status === 'suspended') return res.status(403).json({ error: 'Account suspended. Please contact support.' });

  await db.query('UPDATE clients SET last_login_at = NOW(), last_login_ip = $1 WHERE id = $2', [req.ip, client.id]);
  await auditLog('client', client.id, 'auth.login', 'client', client.id, null, null, req);

  const token = signToken({ clientId: client.id, email: client.email });
  res.json({
    token,
    client: { id: client.id, email: client.email, firstName: client.first_name, lastName: client.last_name, status: client.status }
  });
}));

// POST /api/auth/verify-email
app.post('/api/auth/verify-email', handleErrors(async (req, res) => {
  const { token } = req.body;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== 'email_verify') return res.status(400).json({ error: 'Invalid token type' });
  await db.query('UPDATE clients SET email_verified = TRUE, email_verified_at = NOW() WHERE id = $1', [decoded.clientId]);
  res.json({ message: 'Email verified successfully' });
}));

// ─── CLIENT PROFILE ───────────────────────────────────────────

// GET /api/me
app.get('/api/me', requireAuth, handleErrors(async (req, res) => {
  const result = await db.query(
    `SELECT c.id, c.email, c.first_name, c.last_name, c.phone, c.status,
            c.email_verified, c.two_fa_enabled, c.created_at,
            p.name AS plan_name, p.slug AS plan_slug, p.free_scans,
            s.current_period_end, s.status AS sub_status, s.scans_used_this_period,
            (SELECT COUNT(*) FROM mail_items WHERE client_id = c.id AND status = 'awaiting_action') AS pending_mail
     FROM clients c
     LEFT JOIN subscriptions s ON s.client_id = c.id AND s.status IN ('active','trialing')
     LEFT JOIN plans p ON p.id = s.plan_id
     WHERE c.id = $1`,
    [req.user.clientId]
  );
  res.json(result.rows[0]);
}));

// ─── KYC ROUTES ───────────────────────────────────────────────

// POST /api/kyc/submit
app.post('/api/kyc/submit', requireAuth, [
  body('dateOfBirth').isDate(),
  body('idDocumentType').notEmpty(),
  body('addressLine1').notEmpty(),
  body('postcode').notEmpty(),
], validate, handleErrors(async (req, res) => {
  const { dateOfBirth, idDocumentType, addressLine1, city, postcode } = req.body;

  // Check client doesn't already have approved KYC
  const existing = await db.query(
    `SELECT id, status FROM kyc_verifications WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [req.user.clientId]
  );
  if (existing.rows[0]?.status === 'approved') return res.status(400).json({ error: 'KYC already approved' });

  await db.query(
    `INSERT INTO kyc_verifications (client_id, status, id_document_type) VALUES ($1,'pending',$2)
     ON CONFLICT DO NOTHING`,
    [req.user.clientId, idDocumentType]
  );

  await db.query(
    `INSERT INTO director_addresses (client_id, address_line1, city, postcode) VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [req.user.clientId, addressLine1, city, postcode]
  );

  await db.query('UPDATE clients SET date_of_birth = $1 WHERE id = $2', [dateOfBirth, req.user.clientId]);
  await auditLog('client', req.user.clientId, 'kyc.submitted', 'kyc_verification', null, null, null, req);

  res.json({ message: 'KYC documents submitted. Verification typically completes within 2 business hours.' });
}));

// ─── MAILBOX ROUTES ───────────────────────────────────────────

// GET /api/mailboxes
app.get('/api/mailboxes', requireAuth, handleErrors(async (req, res) => {
  const result = await db.query(
    `SELECT m.*, ml.name AS location_name, co.company_name
     FROM mailboxes m
     JOIN mailbox_locations ml ON ml.id = m.location_id
     LEFT JOIN companies co ON co.id = m.company_id
     WHERE m.client_id = $1 AND m.active = TRUE`,
    [req.user.clientId]
  );
  res.json(result.rows);
}));

// ─── MAIL ITEM ROUTES ─────────────────────────────────────────

// GET /api/mail
app.get('/api/mail', requireAuth, handleErrors(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let query = `SELECT * FROM mail_items WHERE client_id = $1`;
  const params = [req.user.clientId];

  if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
  query += ` ORDER BY received_date DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  const count = await db.query(`SELECT COUNT(*) FROM mail_items WHERE client_id = $1${status ? ' AND status = $2' : ''}`, status ? [req.user.clientId, status] : [req.user.clientId]);
  res.json({ items: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
}));

// POST /api/mail/:id/action
app.post('/api/mail/:id/action', requireAuth, [
  param('id').isUUID(),
  body('action').isIn(['scan_email', 'forward_post', 'shred', 'no_action']),
  body('forwardAddress').optional().notEmpty(),
], validate, handleErrors(async (req, res) => {
  const { id } = req.params;
  const { action, forwardAddress } = req.body;

  const mailResult = await db.query(
    'SELECT * FROM mail_items WHERE id = $1 AND client_id = $2',
    [id, req.user.clientId]
  );
  if (!mailResult.rows.length) return res.status(404).json({ error: 'Mail item not found' });
  const mail = mailResult.rows[0];
  if (mail.status !== 'awaiting_action' && mail.status !== 'received') {
    return res.status(400).json({ error: 'Action already taken on this item' });
  }

  // Determine cost (check if free scans available)
  let chargePence = 0;
  if (action === 'scan_email') {
    const subResult = await db.query(
      `SELECT s.scans_used_this_period, p.free_scans FROM subscriptions s 
       JOIN plans p ON p.id = s.plan_id WHERE s.client_id = $1 AND s.status IN ('active','trialing')`,
      [req.user.clientId]
    );
    const sub = subResult.rows[0];
    const freeScanLeft = sub && (sub.free_scans === -1 || sub.scans_used_this_period < sub.free_scans);
    chargePence = freeScanLeft ? 0 : 150;
    if (!freeScanLeft) {
      // Charge via Stripe
      const client = (await db.query('SELECT stripe_customer_id FROM subscriptions WHERE client_id = $1', [req.user.clientId])).rows[0];
      // Payment intent would be created here
    }
    if (sub && sub.free_scans !== -1) {
      await db.query('UPDATE subscriptions SET scans_used_this_period = scans_used_this_period + 1 WHERE client_id = $1', [req.user.clientId]);
    }
  } else if (action === 'forward_post') {
    chargePence = 350; // + actual postage
  } else if (action === 'shred') {
    chargePence = 50;
  }

  const oldStatus = mail.status;
  await db.query(
    `UPDATE mail_items SET status = 'in_progress', action_chosen = $1, action_at = NOW(), action_by = 'client',
     forward_address = $2, updated_at = NOW() WHERE id = $3`,
    [action, forwardAddress || null, id]
  );

  // Record payment if applicable
  if (chargePence > 0) {
    const vatPence = Math.round(chargePence * 0.2);
    await db.query(
      `INSERT INTO payments (client_id, amount_pence, vat_pence, total_pence, payment_type, description, method, status)
       VALUES ($1,$2,$3,$4,'addon',($5||' for mail item '||$6::TEXT),'card','pending')`,
      [req.user.clientId, chargePence, vatPence, chargePence + vatPence, action, id]
    );
  }

  await auditLog('client', req.user.clientId, `mail.action_${action}`, 'mail_item', id, { status: oldStatus }, { action }, req);
  res.json({ message: 'Action recorded. We will process your mail shortly.', chargePence });
}));

// ─── COMPANY ROUTES ───────────────────────────────────────────

// POST /api/companies
app.post('/api/companies', requireAuth, [
  body('companyName').trim().notEmpty(),
  body('companyType').notEmpty(),
], validate, handleErrors(async (req, res) => {
  const { companyName, companyType, companiesHouseNo, utrNumber, vatNumber, natureOfBusiness } = req.body;

  // Verify Companies House number if provided
  let chVerified = false;
  if (companiesHouseNo) {
    // In production: call Companies House API
    // https://api.company-information.service.gov.uk/company/{companiesHouseNo}
    chVerified = /^\d{8}$/.test(companiesHouseNo); // basic format check
  }

  const result = await db.query(
    `INSERT INTO companies (client_id, company_name, company_type, companies_house_no, ch_verified, utr_number, vat_number, nature_of_business)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [req.user.clientId, companyName, companyType, companiesHouseNo, chVerified, utrNumber, vatNumber, natureOfBusiness]
  );

  await auditLog('client', req.user.clientId, 'company.created', 'company', result.rows[0].id, null, { companyName }, req);
  res.status(201).json(result.rows[0]);
}));

// ─── SUBSCRIPTION / BILLING ROUTES ────────────────────────────

// POST /api/billing/create-subscription
app.post('/api/billing/create-subscription', requireAuth, [
  body('planSlug').isIn(['starter', 'pro', 'premium']),
  body('paymentMethodId').notEmpty(),
], validate, handleErrors(async (req, res) => {
  const { planSlug, paymentMethodId } = req.body;
  const clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [req.user.clientId]);
  const client = clientResult.rows[0];
  const planResult = await db.query('SELECT * FROM plans WHERE slug = $1', [planSlug]);
  const plan = planResult.rows[0];

  // Create or retrieve Stripe customer
  let stripeCustomerId;
  const existingSub = await db.query('SELECT stripe_customer_id FROM subscriptions WHERE client_id = $1', [req.user.clientId]);
  if (existingSub.rows[0]?.stripe_customer_id) {
    stripeCustomerId = existingSub.rows[0].stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: client.email,
      name: `${client.first_name} ${client.last_name}`,
      metadata: { clientId: client.id }
    });
    stripeCustomerId = customer.id;
  }

  // Attach payment method
  await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
  await stripe.customers.update(stripeCustomerId, { invoice_settings: { default_payment_method: paymentMethodId } });

  // Create subscription with 30-day trial
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: plan.stripe_price_id }],
    trial_period_days: 30,
    expand: ['latest_invoice.payment_intent'],
    metadata: { clientId: client.id, planSlug }
  });

  // Save to DB
  await db.query(
    `INSERT INTO subscriptions (client_id, plan_id, stripe_customer_id, stripe_subscription_id, status, trial_end, current_period_start, current_period_end)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (stripe_subscription_id) DO NOTHING`,
    [req.user.clientId, plan.id, stripeCustomerId, subscription.id, subscription.status,
     new Date(subscription.trial_end * 1000), new Date(subscription.current_period_start * 1000), new Date(subscription.current_period_end * 1000)]
  );

  await auditLog('client', req.user.clientId, 'subscription.created', 'subscription', null, null, { planSlug }, req);
  res.json({ subscriptionId: subscription.id, status: subscription.status, trialEnd: subscription.trial_end });
}));

// GET /api/billing/invoices
app.get('/api/billing/invoices', requireAuth, handleErrors(async (req, res) => {
  const result = await db.query(
    `SELECT id, invoice_number, description, amount_pence, vat_pence, total_pence, payment_type, status, paid_at, created_at
     FROM payments WHERE client_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.clientId]
  );
  res.json(result.rows);
}));

// POST /api/billing/webhook (Stripe webhook)
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleErrors(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'invoice.paid':
      const invoice = event.data.object;
      await db.query(`UPDATE subscriptions SET status = 'active' WHERE stripe_subscription_id = $1`, [invoice.subscription]);
      await db.query(
        `INSERT INTO payments (client_id, amount_pence, vat_pence, total_pence, payment_type, stripe_charge_id, status, paid_at)
         SELECT client_id, $1, $2, $3, 'subscription', $4, 'paid', NOW() FROM subscriptions WHERE stripe_subscription_id = $5`,
        [Math.round(invoice.amount_paid * 0.8333), Math.round(invoice.amount_paid * 0.1667), invoice.amount_paid, invoice.charge, invoice.subscription]
      );
      break;
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      await db.query(`UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1`, [failedInvoice.subscription]);
      break;
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      await db.query(`UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE stripe_subscription_id = $1`, [deletedSub.id]);
      break;
  }
  res.json({ received: true });
}));

// ─── ADMIN ROUTES ─────────────────────────────────────────────

// GET /api/admin/clients
app.get('/api/admin/clients', requireAdmin, handleErrors(async (req, res) => {
  const { status, search, page = 1, limit = 25 } = req.query;
  const offset = (page - 1) * limit;
  let query = `
    SELECT c.id, c.email, c.first_name, c.last_name, c.status, c.created_at,
           k.status AS kyc_status, p.name AS plan_name,
           (SELECT COUNT(*) FROM mail_items WHERE client_id = c.id AND status = 'awaiting_action') AS pending_mail,
           (SELECT suite_number FROM mailboxes WHERE client_id = c.id AND active = TRUE LIMIT 1) AS mailbox
    FROM clients c
    LEFT JOIN kyc_verifications k ON k.client_id = c.id
    LEFT JOIN subscriptions s ON s.client_id = c.id AND s.status = 'active'
    LEFT JOIN plans p ON p.id = s.plan_id WHERE 1=1`;
  const params = [];

  if (status) { params.push(status); query += ` AND c.status = $${params.length}`; }
  if (search) { params.push(`%${search}%`); query += ` AND (c.email ILIKE $${params.length} OR c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length})`; }
  query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  res.json(result.rows);
}));

// GET /api/admin/mail
app.get('/api/admin/mail', requireAdmin, handleErrors(async (req, res) => {
  const { status, urgent, page = 1, limit = 50 } = req.query;
  let query = `
    SELECT m.*, c.first_name, c.last_name, c.email,
           mb.suite_number, co.company_name
    FROM mail_items m
    JOIN clients c ON c.id = m.client_id
    LEFT JOIN mailboxes mb ON mb.client_id = m.client_id AND mb.active = TRUE
    LEFT JOIN companies co ON co.client_id = m.client_id
    WHERE 1=1`;
  const params = [];
  if (status) { params.push(status); query += ` AND m.status = $${params.length}`; }
  if (urgent === 'true') { query += ` AND m.is_urgent = TRUE`; }
  query += ` ORDER BY m.is_urgent DESC, m.received_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), (page - 1) * parseInt(limit));
  const result = await db.query(query, params);
  res.json(result.rows);
}));

// PATCH /api/admin/clients/:id/status
app.patch('/api/admin/clients/:id/status', requireAdmin, [
  param('id').isUUID(),
  body('status').isIn(['active', 'suspended', 'cancelled']),
], validate, handleErrors(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const old = await db.query('SELECT status FROM clients WHERE id = $1', [id]);
  await db.query('UPDATE clients SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  await auditLog('admin', req.admin.adminId, `client.status_changed`, 'client', id, old.rows[0], { status, reason }, req);
  res.json({ message: 'Client status updated' });
}));

// PATCH /api/admin/kyc/:clientId/review
app.patch('/api/admin/kyc/:clientId/review', requireAdmin, [
  param('clientId').isUUID(),
  body('decision').isIn(['approved', 'rejected']),
], validate, handleErrors(async (req, res) => {
  const { clientId } = req.params;
  const { decision, rejectionReason } = req.body;

  await db.query(
    `UPDATE kyc_verifications SET status = $1, reviewed_by = $2, reviewed_at = NOW(), 
     rejection_reason = $3, expires_at = $4 WHERE client_id = $5`,
    [decision, req.admin.adminId, rejectionReason || null,
     decision === 'approved' ? new Date(Date.now() + 365 * 3 * 24 * 60 * 60 * 1000) : null, clientId]
  );

  if (decision === 'approved') {
    await db.query(`UPDATE clients SET status = 'active' WHERE id = $1 AND status = 'pending_kyc'`, [clientId]);
    // Activate mailbox
    await db.query(`UPDATE mailboxes SET active = TRUE, activated_at = NOW() WHERE client_id = $1`, [clientId]);
    // Send welcome email
    const client = (await db.query('SELECT email, first_name FROM clients WHERE id = $1', [clientId])).rows[0];
    await sgMail.send({
      to: client.email, from: 'wampiah@yahoo.co.uk',
      subject: 'Welcome to PrimeOfficeSolutions Ltd — Your address is ready!',
      html: `<p>Hi ${client.first_name}, your KYC has been approved and your mailbox is now active.</p>`,
    });
  }

  await auditLog('admin', req.admin.adminId, `kyc.${decision}`, 'kyc_verification', null, null, { decision, rejectionReason }, req);
  res.json({ message: `KYC ${decision}` });
}));

// GET /api/admin/stats
app.get('/api/admin/stats', requireAdmin, handleErrors(async (req, res) => {
  const [clients, mail, revenue] = await Promise.all([
    db.query(`SELECT status, COUNT(*) as count FROM clients GROUP BY status`),
    db.query(`SELECT status, COUNT(*) as count FROM mail_items WHERE received_date >= CURRENT_DATE - 30 GROUP BY status`),
    db.query(`SELECT SUM(total_pence) AS total, COUNT(*) AS count FROM payments WHERE status = 'paid' AND paid_at >= date_trunc('month', NOW())`),
  ]);
  res.json({
    clients: clients.rows,
    mailLast30Days: mail.rows,
    revenueThisMonth: { totalPence: parseInt(revenue.rows[0].total || 0), count: parseInt(revenue.rows[0].count) }
  });
}));

// ─── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PrimeOfficeSolutions API running on port ${PORT}`));

module.exports = app;

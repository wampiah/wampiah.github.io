# PrimeOfficeSolutions Ltd — Full System Documentation

## Project Structure
```
primeofficesolutions/
├── index.html          ← Public marketing/landing page
├── register.html       ← Client signup + KYC flow (4-step)
├── client-portal.html  ← Client dashboard (mail, billing, settings)
├── admin-dashboard.jsx ← Admin React dashboard (separate deployment)
├── api-server.js       ← Node.js/Express REST API
├── database-schema.sql ← Full PostgreSQL schema (18 tables)
└── README.md           ← This file
```

---

## Tech Stack

| Layer         | Technology                                |
|---------------|-------------------------------------------|
| Frontend      | HTML/CSS/JS (landing, portal, register)   |
| Admin Panel   | React (JSX)                               |
| Backend API   | Node.js + Express                         |
| Database      | PostgreSQL 15+                            |
| Payments      | Stripe (cards, 3DS) + GoCardless (BACS)  |
| File Storage  | AWS S3 (encrypted, private)               |
| Email         | SendGrid                                  |
| SMS           | Twilio                                    |
| KYC/AML       | Onfido or Sumsub API                      |
| Auth          | JWT + bcrypt + optional TOTP 2FA          |
| Hosting       | Vercel (frontend) + AWS (API + DB)        |

---

## Environment Variables (.env)

```
# Server
PORT=3000
NODE_ENV=production
APP_URL=https://primeofficesolutions.co.uk
ALLOWED_ORIGINS=https://primeofficesolutions.co.uk,https://app.primeofficesolutions.co.uk

# Database
DATABASE_URL=postgresql://user:password@host:5432/primeofficesolutions

# Auth
JWT_SECRET=your-256-bit-secret

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# GoCardless (Direct Debit)
GOCARDLESS_ACCESS_TOKEN=live_...

# AWS S3 (for document/scan storage)
AWS_REGION=eu-west-2
AWS_S3_BUCKET=primeofficesolutions-documents
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Email
SENDGRID_API_KEY=SG....

# SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE=+447...

# KYC Provider (Onfido)
ONFIDO_API_TOKEN=api_live_...
```

---

## Setup & Installation

### 1. Database
```bash
psql -U postgres -c "CREATE DATABASE primeofficesolutions;"
psql -U postgres -d primeofficesolutions -f database-schema.sql
```

### 2. Backend API
```bash
npm install express pg bcrypt jsonwebtoken stripe @sendgrid/mail \
            express-rate-limit helmet cors express-validator

node api-server.js
```

### 3. Stripe Setup
- Create products in Stripe Dashboard for each plan
- Set up webhook endpoint: `POST /api/billing/webhook`
- Events to subscribe: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`

### 4. Frontend
- Host `index.html`, `register.html`, `client-portal.html` on Vercel or Nginx
- Admin dashboard: deploy `admin-dashboard.jsx` as a React app

---

## UK Compliance Checklist

### AML / KYC (Money Laundering Regulations 2017)
- [x] Government-issued photo ID collected
- [x] Proof of address (< 3 months) collected
- [x] Director date of birth recorded
- [x] PEP (Politically Exposed Person) check via Onfido
- [x] Sanctions list screening
- [x] KYC re-verification every 3 years
- [x] AML policy document available at /aml-policy
- [x] Full audit log of all KYC decisions

### HMRC / Companies House
- [x] Addresses accepted for HMRC correspondence
- [x] Accepted as Companies House registered office
- [x] Accepted as director service address
- [x] Companies House number verified via CH API on registration

### GDPR / ICO
- [x] ICO registration required (register at ico.org.uk)
- [x] Privacy Policy published
- [x] Data encrypted at rest (AES-256) and in transit (TLS 1.3)
- [x] Row-level security on client data
- [x] Right to erasure supported
- [x] 7-year document retention for HMRC compliance
- [x] Automated document deletion after retention period

### Payments / VAT
- [x] 20% UK VAT applied to all services
- [x] Making Tax Digital (MTD) compatible invoicing
- [x] Invoice numbers sequential (INV-YYYY-XXXXXX)
- [x] Stripe PCI DSS compliance
- [x] 3D Secure (Strong Customer Authentication) for all card payments
- [x] GoCardless BACS direct debit (FCA authorised)

### Mail Handling
- [x] Postal Services Act 2000 compliant
- [x] BS EN 15713:2009 certified shredding (use certified supplier)
- [x] Secure scan storage with access controls
- [x] Scans deleted after client download (configurable retention)

---

## API Endpoints Summary

### Auth
- `POST /api/auth/register`      — Create account
- `POST /api/auth/login`         — Login, receive JWT
- `POST /api/auth/verify-email`  — Email verification

### Client (requires auth)
- `GET  /api/me`                 — Profile + plan info
- `POST /api/kyc/submit`         — Submit KYC documents
- `GET  /api/mailboxes`          — List client's mailboxes
- `GET  /api/mail`               — List mail items (paginated)
- `POST /api/mail/:id/action`    — Scan / Post / Shred
- `POST /api/companies`          — Register company
- `POST /api/billing/create-subscription` — Subscribe to plan
- `GET  /api/billing/invoices`   — Invoice history

### Admin (requires admin JWT)
- `GET  /api/admin/clients`      — List all clients
- `GET  /api/admin/mail`         — All mail items
- `PATCH /api/admin/clients/:id/status` — Suspend/activate
- `PATCH /api/admin/kyc/:id/review`     — Approve/reject KYC
- `GET  /api/admin/stats`        — Dashboard statistics

### Webhooks
- `POST /api/billing/webhook`    — Stripe webhook handler

---

## Security Notes

1. **Never** store raw card data — use Stripe tokens only
2. All S3 document URLs are pre-signed and expire after 1 hour
3. KYC documents are encrypted before S3 upload (client-side encryption)
4. All passwords use bcrypt with salt rounds of 12
5. JWT tokens expire after 7 days; refresh tokens not implemented (re-login required)
6. Admin accounts require 2FA (TOTP via Google Authenticator)
7. All admin actions are audit-logged with IP address
8. Rate limiting on auth endpoints (10 req / 15 min)
9. SQL injection protection via parameterised queries throughout
10. CORS restricted to allowed origins only

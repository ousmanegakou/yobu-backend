# YOBU Backend — Deployment Guide

## Quick Deploy on Railway.app (recommended — free tier available)

### Step 1 — Create accounts
- [railway.app](https://railway.app) — backend + database hosting
- [twilio.com](https://twilio.com) — SMS (free trial: $15 credit)

### Step 2 — Push to GitHub
```bash
cd yobu-backend
git init
git add .
git commit -m "YOBU backend initial"
gh repo create yobu-backend --public --push
```

### Step 3 — Deploy on Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your `yobu-backend` repo
3. Add a **PostgreSQL** plugin (click + → Database → PostgreSQL)
4. Railway auto-sets `DATABASE_URL` — no manual config needed

### Step 4 — Set Environment Variables on Railway
Go to your service → Variables → Add:
```
NODE_ENV=production
JWT_SECRET=your_random_secret_min_32_chars
JWT_EXPIRES_IN=7d
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
APP_URL=https://app.yobu.com
PRICE_BASE=5
PRICE_PER_STOP=3
PRICE_PER_MILE=1
ALLOWED_ORIGINS=https://app.yobu.com,https://merchant.yobu.com
```

### Step 5 — Run database migrations
In Railway → your service → Shell:
```bash
npm run db:migrate
npm run db:seed
```

### Step 6 — Get your API URL
Railway gives you a URL like: `https://yobu-backend-production.up.railway.app`
This is your `API_BASE_URL` for the frontend.

---

## API Endpoints Summary

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/merchant/register | Register merchant |
| POST | /api/auth/merchant/login | Merchant login |
| POST | /api/auth/driver/register | Register driver |
| POST | /api/auth/driver/login | Driver login |
| POST | /api/auth/admin/login | Admin login |
| GET  | /api/auth/me | Get current user |

### Routes (Deliveries)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/routes | Create multi-stop route |
| GET  | /api/routes | List routes |
| GET  | /api/routes/:id | Get route + stops |
| PATCH| /api/routes/:id/assign | Assign driver |
| GET  | /api/routes/public/:token | Public tracking (no auth) |

### Scanning (Driver)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/scan/pickup | Scan barcode at store |
| POST | /api/scan/delivery | Scan QR at customer door |
| POST | /api/scan/confirm-delivery | Submit proof + mark delivered |

### Drivers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/drivers | List all drivers (admin) |
| GET  | /api/drivers/available | Available drivers |
| GET  | /api/drivers/my-routes | Driver's active routes |
| GET  | /api/drivers/earnings | Driver earnings |
| POST | /api/drivers/location | Update GPS position |
| GET  | /api/drivers/:id/location | Get driver location |
| POST | /api/drivers/notify-stop | Send ETA SMS to next customer |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST  | /api/billing/generate | Generate monthly invoices |
| GET   | /api/billing/invoices | All invoices (admin) |
| GET   | /api/billing/my-invoices | Merchant's invoices |
| GET   | /api/billing/invoices/:id | Invoice detail |
| PATCH | /api/billing/invoices/:id/pay | Mark as paid |
| GET   | /api/billing/summary | Platform revenue summary |

---

## WebSocket — Live Driver Tracking

Connect to: `wss://your-railway-url`

```js
const ws = new WebSocket("wss://yobu-backend.up.railway.app");
ws.onopen = () => {
  ws.send(JSON.stringify({ type: "subscribe_driver", driver_id: "DRIVER_UUID" }));
};
ws.onmessage = (e) => {
  const { lat, lng } = JSON.parse(e.data);
  // Update map marker
};
```

---

## Pricing Formula
```
Total = $5 (base) + (stops × $3) + (miles × $1)
```
Example: 3 stops, 8.4 miles → $5 + $9 + $8.40 = **$22.40**

---

## Default Credentials (after seed)
- Admin: `admin@yobu.com` / `admin123`
- Merchant: `urbanglow@yobu.com` / `merchant123`
- Driver: `marcus@yobu.com` / `driver123`

⚠️ Change all passwords in production!

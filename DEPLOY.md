# YOBU Backend — Deployment

## Railway
1. Add PostgreSQL: **+ Add → Database → PostgreSQL**
2. Set env vars: DATABASE_URL, JWT_SECRET, JWT_EXPIRES=7d, HMAC_SECRET, APP_URL, NODE_ENV=production
3. Shell: `npm run db:migrate && npm run db:seed`
4. Test: `GET /health` → `{"status":"ok"}`

## Test accounts
- merchant@yobu.com / password123
- driver@yobu.com / password123
- admin@yobu.com / password123

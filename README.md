# API Gateway Security Platform

Secure Node.js/Express API gateway with authentication, authorization, rate limiting, WAF-style threat detection, request validation, logging to MongoDB, caching, and a React + Tailwind admin dashboard.

## Prerequisites
- Node.js 18+
- MongoDB running locally or accessible URI

## Setup
1. Backend environment:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run seed
   npm run dev  # or npm start
   ```
   The seed script prints admin/client credentials and API keys. Use the admin API key for secured requests and the dashboard.

2. Frontend environment:
   ```bash
   cd frontend
   cp .env.example .env  # set VITE_ADMIN_API_KEY to the admin API key from the seed output
   npm install
   npm run dev
   ```
   Dashboard is served at http://localhost:5173 (proxied to the backend on http://localhost:4000).

## API Notes
- All protected routes require `x-api-key` (admin/client) or `Authorization: Bearer <token>` from `/auth/login`.
- Admin endpoints: `/admin/*`
- Gateway sample routes: `/api/service-a/data`, `/api/service-b/metrics`, `/api/public/ping`
- Health: `/health`

## Features
- API key + JWT auth, role-based access (admin/client)
- IP blocklist/allowlist with auto-block on abuse
- Per-key and per-route rate limiting with auto-blocking
- WAF checks for SQLi/XSS/command injection and abnormal frequency detection
- Request validation and size limits
- Helmet security headers, HTTPS-ready guard
- Logging of requests, auth failures, rate limits, and threats to MongoDB
- In-memory caching for GET requests
- Seeded demo data and admin dashboard for analytics, attacks, error rates, top APIs, blacklist, and rate-limit profiles

# BillFlow – Smart Billing Management

A full-stack billing app for small stores: register a store, create bills with items, tax and discount, finalize them, and view history.

**Live domain:** https://whiteblood.online

| Layer | Stack |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router (served by a small Express server) |
| Backend | Node.js 18, Express, TypeScript, JWT, bcrypt |
| Database | PostgreSQL 15+ running inside the Kubernetes cluster (AWS RDS is an optional alternative, see `rds-option/`) |
| Secrets | Kubernetes Secret / environment variables |
| Infra | Docker, Kubernetes, Ingress |

---

## Features

- Register and sign in (JWT, bcrypt password hashing)
- Create bills with multiple items, tax %, discount % and payment method (cash, card, UPI, online)
- Save a bill as a draft or finalize it (finalized bills are locked)
- Bill history, bill details with QR code, dashboard, profile and settings
- Security: Helmet, CORS, HPP, rate limiting (general, login, bill creation), input validation and sanitization
- Health endpoint at `/api/health` (reports database status)

---

## Project Structure

```
.
├── backend/            # Express + TypeScript API
│   ├── src/
│   │   ├── index.ts          # Entry point (CORS, security, routes)
│   │   ├── config/           # DB pool, secrets loader (AWS / .env)
│   │   ├── middleware/       # auth, rate limiter, error handler, requireDb
│   │   ├── routes/           # auth, bills, health
│   │   └── scripts/initDb.ts # Creates DB tables
│   └── Dockerfile
├── frontend/           # React app
│   ├── server.js             # Serves the build and /config.js (runtime config)
│   ├── src/                  # pages, components, contexts, services/api.ts
│   └── Dockerfile
├── k8s/                # Kubernetes manifests
├── rds-option/         # Optional: AWS RDS + Secrets Manager setup (not used in the demo)
└── docker-compose.yml
```

---

## How It Fits Together (whiteblood.online)

The Ingress routes both apps on **one domain**, so no CORS is needed in production. The database is only reachable inside the cluster.

```
https://whiteblood.online/        → frontend-service (port 80 → container 3000)
https://whiteblood.online/api/*   → backend-service  (port 4000)
```

- The frontend reads `BACKEND_URL` **at runtime** from `/config.js`. Leave it **empty** so the app calls the relative path `/api`.
- The backend uses `FRONTEND_URL` for CORS. It accepts a comma-separated list.

---

## Environment Variables

### Backend

| Variable | Example | Notes |
|---|---|---|
| `ENV` | `local` | Reads DB and JWT settings from environment variables. Use this for the in-cluster database |
| `PORT` | `4000` | |
| `FRONTEND_URL` | `https://whiteblood.online,https://www.whiteblood.online` | Comma-separated allowed origins |
| `DB_HOST` | `postgres` | Name of the Postgres Service in the cluster |
| `DB_PORT` | `5432` | |
| `DB_NAME` | `billflow_db` | |
| `DB_USER` | `billflow_admin` | |
| `DB_PASSWORD` | *(from a K8s Secret)* | |
| `DB_SSL` | `false` | In-cluster Postgres has no SSL. Use `true` for RDS |
| `JWT_SECRET` | *(from a K8s Secret)* | **Must be set** to a long random value. The built-in default is not safe |
| `JWT_EXPIRES_IN` | `7d` | |

For AWS RDS with Secrets Manager (`ENV=aws`), see [`rds-option/README.md`](rds-option/README.md).

### Frontend

| Variable | Example | Notes |
|---|---|---|
| `BACKEND_URL` | *(empty)* | Runtime setting. Empty means use `/api` on the same domain |
| `PORT` | `3000` | |
| `VITE_API_URL` | `http://localhost:4000/api` | Local `npm run dev` only |

---

## Run Locally

**Prerequisites:** Node.js 18+, PostgreSQL 15+

```bash
# 1. Backend
cd backend
cp .env.example .env        # edit DB credentials and JWT_SECRET
npm install
npm run db:init             # creates the tables (run once)
npm run dev                 # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Set `FRONTEND_URL=http://localhost:5173` in `backend/.env` and `VITE_API_URL=http://localhost:4000/api` in `frontend/.env`.

Check the API: `curl http://localhost:4000/api/health`

---

## Deploy to whiteblood.online

1. **Database:** run PostgreSQL in the cluster (StatefulSet or Deployment with a PersistentVolumeClaim, plus a **ClusterIP** Service named `postgres`). Use database name `billflow_db`. Keep this Service ClusterIP so the database is never exposed outside the cluster.
2. **Secrets:** put `DB_PASSWORD` and `JWT_SECRET` in a Kubernetes Secret and pass them to the backend (and the Postgres pod) as environment variables.
3. **Create the tables once**, after the Postgres pod is running:
   ```bash
   kubectl exec deploy/backend -- node dist/scripts/initDb.js
   ```
4. **Build and push images:**
   ```bash
   docker build -t <registry>/billflow-backend:latest  ./backend
   docker build -t <registry>/billflow-frontend:latest ./frontend
   docker push <registry>/billflow-backend:latest
   docker push <registry>/billflow-frontend:latest
   ```
5. **Manifest values:**
   - Backend: `ENV=local`, `DB_HOST=postgres`, `DB_SSL=false`, `FRONTEND_URL=https://whiteblood.online,https://www.whiteblood.online`, plus the DB and JWT values from the table above
   - Frontend: `BACKEND_URL` empty
6. **Expose the apps** (your choice of Service type / Ingress):
   - Host `whiteblood.online` (plus `www.whiteblood.online`); `/api` → backend:4000, `/` → frontend
   - TLS certificate that covers `whiteblood.online` and `www.whiteblood.online`
   - Health check paths: backend `/api/health`, frontend `/`
7. **DNS:** point `whiteblood.online` and `www` to the public IP or hostname of your ingress / load balancer / node.
8. **Restart** pods after any config change: `kubectl rollout restart deployment <name>`

> **Data persistence:** give the Postgres pod a PersistentVolumeClaim. Without one, all data is lost whenever the pod restarts.

---

## API Reference

All routes are under `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Service and database status |
| POST | `/auth/register` | No | Create an account |
| POST | `/auth/login` | No | Returns JWT and user |
| GET | `/auth/me` | Yes | Current profile |
| PUT | `/auth/me` | Yes | Update profile |
| POST | `/bills` | Yes | Create a bill (draft or finalized) |
| GET | `/bills` | Yes | List your bills |
| GET | `/bills/:id` | Yes | Get one bill |
| PATCH | `/bills/:id/finalize` | Yes | Finalize a draft bill |

**Validation rules:** password at least 8 characters (the UI also requires an uppercase letter and a number); phone is 10 digits starting with 6–9; tax and discount are 0–100.

---

## Demo Script (5 minutes)

1. Open `https://whiteblood.online/api/health` and show `"database": "connected"`.
2. Open `https://whiteblood.online`, click **Register**, and create an account (for example, phone `9876543210`, password `Demo@1234`).
3. Sign in and show the dashboard.
4. **Create Bill:** add a customer and 2–3 items, set tax and discount, and click **Finalize**.
5. Open the bill details and show the QR code.
6. Create another bill and **Save Draft**, then finalize it from the details page.
7. Show **Bill History**, **Profile** and **Settings**.
8. Log out and back in to show that the data is stored in the database.

---

## Pre-Demo Checklist

- [ ] `https://whiteblood.online/api/health` returns `"database": "connected"`
- [ ] The Postgres pod is `Running` and has a PersistentVolumeClaim
- [ ] The tables were created (`kubectl exec deploy/backend -- node dist/scripts/initDb.js`)
- [ ] Register, login and create-bill work on the live domain
- [ ] Bills created appear after logout and login (data comes from the database)
- [ ] Bills survive a Postgres pod restart (`kubectl delete pod <postgres-pod>`, then check again)
- [ ] Backend and frontend images were rebuilt after the latest code changes
- [ ] The TLS certificate is valid and HTTPS shows no warnings
- [ ] Test both `whiteblood.online` and `www.whiteblood.online`
- [ ] `JWT_SECRET` is a long random value (not the default)

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Login or register fails with a network or CORS error | `FRONTEND_URL` doesn't match the site's URL exactly (including `https://`). Fix it and restart the backend |
| `/api/health` returns 207 or `database: disconnected` | Wrong `DB_HOST` / password, Postgres pod not ready, or `DB_SSL` not set to `false`. Check the backend pod logs. Restart the backend after Postgres is ready |
| Auth routes return 503 "Database is not available" | Same as above. The API starts without a database in limited mode |
| Load balancer / ingress shows the backend unhealthy | The health check path is wrong. Use `/api/health` for the backend and `/` for the frontend |
| Too many requests (429) | Rate limit hit (login: 15 per 15 min per IP). Wait or restart the pod |
| Old UI after a deploy | Hard refresh. `index.html` is served with `no-store`, so new deploys appear right away |

---

## Known Limitations

- **Offline fallback:** if the API is unreachable, the frontend falls back to browser `localStorage`. This is only meant as a fallback, so make sure the backend is healthy before the demo. Bills created in fallback mode are not saved in the database.
- **Forgot password** is a UI placeholder only; no email is sent.
- **Draft bills** cannot be edited after saving; they can only be finalized.
- **In-cluster database:** a single Postgres pod is fine for a demo, but has no backups or replication. Use RDS (`rds-option/`) for real production use.
- With `DB_SSL=true` (RDS), the connection uses SSL with `rejectUnauthorized: false`. For production, use the RDS CA bundle.

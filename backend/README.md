# BillFlow Backend

Production-grade **Node.js + TypeScript + Express** backend for the BillFlow Billing Management System.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Language | TypeScript |
| Framework | Express.js |
| Database | PostgreSQL 15+ |
| Auth | JWT (bcrypt hashing) |
| Secrets | Environment variables / K8s Secret (AWS Secrets Manager optional) |
| Security | Helmet, CORS, HPP, Rate Limiting, Input Validation |

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── config/
│   │   ├── database.ts          # PostgreSQL connection pool
│   │   ├── secrets.ts           # AWS Secrets Manager / .env loader
│   │   └── types.ts             # Config type definitions
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication + role guard
│   │   ├── errorHandler.ts      # Global error handler
│   │   ├── rateLimiter.ts       # DDoS / brute-force protection
│   │   └── requireDb.ts         # DB availability gate
│   ├── routes/
│   │   ├── auth.ts              # Register, Login, Profile
│   │   ├── bills.ts             # CRUD + Finalize bills
│   │   └── health.ts            # Health check endpoint
│   └── scripts/
│       └── initDb.ts            # Database schema initializer
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## 🗄️ Database Setup (PostgreSQL)

The backend needs a PostgreSQL 15+ database with these settings (as environment variables when `ENV=local`):

| Variable | Example (PostgreSQL inside Kubernetes) |
|---|---|
| `ENV` | `local` |
| `DB_HOST` | `postgres` (the name of your Postgres Service) |
| `DB_PORT` | `5432` |
| `DB_NAME` | `billflow_db` |
| `DB_USER` | `billflow_admin` |
| `DB_PASSWORD` | a strong password (from a K8s Secret) |
| `DB_SSL` | `false` (in-cluster Postgres has no SSL) |
| `JWT_SECRET` | a long random string (**must be set**, the default is not safe) |
| `JWT_EXPIRES_IN` | `7d` |

Create the tables **once** after the database is up:

```bash
# Local machine (from backend/)
npm run db:init

# Inside the running backend container (compiled build)
kubectl exec deploy/backend -- node dist/scripts/initDb.js
```

> Prefer AWS RDS + Secrets Manager? See [`../rds-option/README.md`](../rds-option/README.md).

---

## 🚀 Running Locally

```bash
cd backend
npm install

# Set up .env
cp .env.example .env
# Edit .env with your database credentials

# Initialize database (only once)
npm run db:init

# Start development server
npm run dev
```

The server will start at `http://localhost:4000`.

> **Note:** The server starts even WITHOUT a database connection. Health endpoint and non-DB routes will work. DB-dependent routes return `503 Service Unavailable`.

### Health Check

```bash
curl http://localhost:4000/api/health
```

Response:
```json
{
  "status": "ok",
  "service": "BillFlow API",
  "version": "1.0.0",
  "timestamp": "2026-05-30T10:00:00.000Z",
  "uptime": "42s",
  "database": "connected",
  "environment": "local",
  "dbLatencyMs": 3
}
```

---

## 🛡️ Security Features

| Protection | Implementation |
|-----------|---------------|
| **DDoS** | Rate limiting (200 req/15min general, 15 req/15min auth) |
| **Brute Force** | Auth endpoints rate-limited separately |
| **XSS** | Helmet security headers + input escaping |
| **SQL Injection** | Parameterized queries (never string concatenation) |
| **CSRF** | CORS restricted to frontend origin |
| **Parameter Pollution** | HPP middleware |
| **Data Exposure** | No secrets in code, AWS Secrets Manager |
| **Payload Size** | Request body limited to 10KB |
| **Password Storage** | bcrypt with 12 salt rounds |

---

## 📡 API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in (returns JWT) |

### Protected (requires `Authorization: Bearer <token>`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Get profile |
| PUT | `/api/auth/me` | Update profile |
| GET | `/api/bills` | List all bills |
| POST | `/api/bills` | Create bill |
| GET | `/api/bills/:id` | Get single bill |
| PATCH | `/api/bills/:id/finalize` | Finalize a bill |

---

## 🏭 Production Build

```bash
cd backend
npm run build
ENV=local node dist/index.js   # ENV=aws only if you use AWS Secrets Manager
```

---

## 📋 Complete SQL Schema (manual reference)

If you prefer to run SQL manually instead of `npm run db:init`:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    store_name      VARCHAR(255) NOT NULL,
    store_address   TEXT DEFAULT '',
    phone           VARCHAR(15) NOT NULL,
    role            VARCHAR(20) DEFAULT 'admin',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number     VARCHAR(50) UNIQUE NOT NULL,
    date            DATE NOT NULL,
    time            VARCHAR(20) NOT NULL,
    store_name      VARCHAR(255) NOT NULL,
    store_address   TEXT DEFAULT '',
    customer_name   VARCHAR(255) NOT NULL,
    customer_phone  VARCHAR(15) DEFAULT '',
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate        DECIMAL(5,2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_rate   DECIMAL(5,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total     DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method  VARCHAR(20) NOT NULL DEFAULT 'cash',
    finalized       BOOLEAN DEFAULT FALSE,
    created_by      UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id         UUID REFERENCES bills(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_price     DECIMAL(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);
CREATE INDEX IF NOT EXISTS idx_bills_finalized ON bills(finalized);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

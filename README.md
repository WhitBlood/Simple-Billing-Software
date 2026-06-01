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
| Secrets | AWS Secrets Manager / `.env` |
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

## 🗄️ Database Setup (PostgreSQL on AWS RDS)

### Step 1: Create the RDS Instance

1. Go to **AWS Console → RDS → Create Database**
2. Choose **PostgreSQL** engine (version 15 or 16)
3. Settings:

| Setting | Value |
|---------|-------|
| **DB Instance Identifier** | `billflow-db` |
| **Master Username** | `billflow_admin` |
| **Master Password** | *(choose a strong password)* |
| **DB Instance Class** | `db.t3.micro` (free tier) or `db.t3.small` |
| **Storage** | 20 GB gp3 |
| **Public Access** | Yes *(for initial setup, disable later)* |
| **VPC Security Group** | Allow inbound TCP port **5432** from your IP |

4. Under **Additional Configuration**:
   - **⚠️ IMPORTANT — Initial Database Name: `billflow_db`**
   - This is the field most people miss. You **MUST** set this, otherwise RDS creates the instance without a database and your app will fail with "database does not exist".

5. Click **Create Database** and wait for status = "Available"

### Step 2: Note Your Connection Details

After creation, find these in the RDS console:

| Value | Where to Find |
|-------|--------------|
| **DB_HOST** | RDS → Connectivity & Security → **Endpoint** (e.g. `billflow-db.xxxx.ap-south-1.rds.amazonaws.com`) |
| **DB_PORT** | `5432` |
| **DB_NAME** | `billflow_db` (the one you set in step 4) |
| **DB_USER** | `billflow_admin` |
| **DB_PASSWORD** | The master password you chose |

### Step 3: Initialize the Schema

```bash
# From the backend/ folder
cp .env.example .env
# Edit .env with your RDS connection details
npm run db:init
```

This creates the `users`, `bills`, and `bill_items` tables with all indexes.

### Step 4: Verify

Connect using `psql` or any SQL client:

```bash
psql -h <YOUR_RDS_ENDPOINT> -U billflow_admin -d billflow_db
```

Then run:

```sql
\dt
```

You should see:

```
 Schema |    Name    | Type  |     Owner
--------+------------+-------+----------------
 public | bill_items | table | billflow_admin
 public | bills      | table | billflow_admin
 public | users      | table | billflow_admin
```

---

## 🔐 AWS Secrets Manager Setup

### Step 1: Create the Secret

1. Go to **AWS Console → Secrets Manager → Store a new secret**
2. Secret type: **Other type of secret**
3. Add these key/value pairs:

```json
{
  "DB_HOST": "billflow-db.xxxx.ap-south-1.rds.amazonaws.com",
  "DB_PORT": "5432",
  "DB_NAME": "billflow_db",
  "DB_USER": "billflow_admin",
  "DB_PASSWORD": "YourStrongPassword",
  "JWT_SECRET": "a-very-long-random-string-min-64-chars",
  "JWT_EXPIRES_IN": "7d"
}
```

4. Secret name: **`=billing-app-backend-secret`**
5. Click **Store**

### Step 2: IAM Permissions

Your EC2/ECS/Lambda role needs this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:<region>:<account-id>:secret:=billing-app-backend-secret-*"
    }
  ]
}
```

### How It Works

| `ENV` value | Behavior |
|-------------|----------|
| `local` | Reads secrets from `.env` file |
| `aws` | Fetches secrets from AWS Secrets Manager |

Set `ENV=aws` in your production environment (EC2 user data, ECS task definition, etc.)

---

## 🚀 Running Locally

```bash
cd backend
npm install

# Set up .env
cp .env.example .env
# Edit .env with your local or RDS database credentials

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
ENV=aws node dist/index.js
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

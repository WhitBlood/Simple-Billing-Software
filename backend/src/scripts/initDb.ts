import dotenv from 'dotenv';
dotenv.config();

import { getSecrets } from '../config/secrets';
import { Pool } from 'pg';

const SQL = `
-- ============================================
-- BillFlow Database Schema
-- Run this ONCE after creating the database
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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

-- Bills table
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

-- Bill Items table
CREATE TABLE IF NOT EXISTS bill_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id         UUID REFERENCES bills(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_price     DECIMAL(12,2) NOT NULL DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);
CREATE INDEX IF NOT EXISTS idx_bills_finalized ON bills(finalized);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

SELECT 'Schema created successfully!' AS result;
`;

async function initDb() {
  console.log('🗄️  Initializing BillFlow database schema...\n');

  const secrets = await getSecrets();
  const pool = new Pool({
    host: secrets.DB_HOST,
    port: secrets.DB_PORT,
    database: secrets.DB_NAME,
    user: secrets.DB_USER,
    password: secrets.DB_PASSWORD,
    ssl: secrets.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query(SQL);
    console.log('✅ Database schema initialized successfully!');
  } catch (err) {
    console.error('❌ Schema initialization failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();

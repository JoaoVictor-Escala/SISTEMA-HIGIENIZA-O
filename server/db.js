import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'saas.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    subscription_status TEXT DEFAULT 'beta',
    email_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config (
    tenant_id TEXT PRIMARY KEY,
    companyName TEXT,
    ownerName TEXT,
    whatsapp TEXT,
    monthlyGoal INTEGER,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    last_service_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    scheduled_for TEXT,
    status TEXT NOT NULL,
    price REAL NOT NULL,
    assigned_to TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    min_quantity INTEGER,
    cost REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    services TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS followups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    sent_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    title TEXT,
    message TEXT,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS affiliates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    discount_percentage INTEGER DEFAULT 0,
    commission_percentage INTEGER DEFAULT 0,
    pix_key TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id TEXT PRIMARY KEY,
    affiliate_code TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    invoice_amount REAL NOT NULL,
    commission_amount REAL NOT NULL,
    commission_percentage INTEGER NOT NULL,
    status TEXT DEFAULT 'pendente',
    paid_at DATETIME,
    stripe_invoice_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_chats (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS collaborators (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'tecnico',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );
`);

// Graceful schema update for existing DBs
const migrations = [
  'ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT "beta"',
  'ALTER TABLE tenants ADD COLUMN email_verified INTEGER DEFAULT 0',
  'ALTER TABLE tenants ADD COLUMN verification_token TEXT',
  'ALTER TABLE tenants ADD COLUMN demo_seeded INTEGER DEFAULT 0',
  'ALTER TABLE tenants ADD COLUMN referred_by TEXT',
  'ALTER TABLE orders ADD COLUMN description TEXT',
  'ALTER TABLE orders ADD COLUMN down_payment REAL DEFAULT 0',
  'ALTER TABLE orders ADD COLUMN quote_id TEXT',
  'ALTER TABLE clients ADD COLUMN tipo TEXT DEFAULT \'cliente\'',
  'ALTER TABLE quotes ADD COLUMN client_id TEXT',
  'ALTER TABLE quotes ADD COLUMN notes TEXT DEFAULT \'\'',
  'ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT',
  'ALTER TABLE tenants ADD COLUMN stripe_plan TEXT',
  'ALTER TABLE config ADD COLUMN followup_days INTEGER DEFAULT 60',
  'ALTER TABLE config ADD COLUMN followup_message TEXT DEFAULT \'\'',
  'ALTER TABLE config ADD COLUMN whatsapp_instance_name TEXT',
  'ALTER TABLE config ADD COLUMN whatsapp_status TEXT DEFAULT \'disconnected\'',
  'ALTER TABLE tenants ADD COLUMN reset_password_token TEXT',
  'ALTER TABLE tenants ADD COLUMN reset_password_expiry DATETIME',
  'CREATE TABLE IF NOT EXISTS ai_chats (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE)',
  'CREATE TABLE IF NOT EXISTS ai_chat_sessions (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, title TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE)',
  'ALTER TABLE ai_chats ADD COLUMN session_id TEXT',
  'ALTER TABLE ai_chats ADD COLUMN image TEXT',
  'ALTER TABLE affiliates ADD COLUMN pix_key TEXT DEFAULT ""',
  // Trial system — tracks when free trial started
  'ALTER TABLE tenants ADD COLUMN trial_started_at DATETIME',
  // Affiliate commissions table
  'CREATE TABLE IF NOT EXISTS affiliate_commissions (id TEXT PRIMARY KEY, affiliate_code TEXT NOT NULL, tenant_id TEXT NOT NULL, tenant_name TEXT NOT NULL, invoice_amount REAL NOT NULL, commission_amount REAL NOT NULL, commission_percentage INTEGER NOT NULL, status TEXT DEFAULT \'pendente\', paid_at DATETIME, stripe_invoice_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
  // Affiliate portal login
  'ALTER TABLE affiliates ADD COLUMN password_hash TEXT',
  // Role based access
  'ALTER TABLE tenants ADD COLUMN role TEXT DEFAULT "user"',
  // Onboarding wizard — track if user completed setup
  'ALTER TABLE config ADD COLUMN onboarding_completed INTEGER DEFAULT 0',
  // Trial warning email — avoid sending duplicate alerts
  'ALTER TABLE tenants ADD COLUMN trial_warning_sent INTEGER DEFAULT 0',
  // Multi-collaborator migrations
  'ALTER TABLE orders ADD COLUMN assigned_to TEXT',
  'CREATE TABLE IF NOT EXISTS collaborators (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT \'tecnico\', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE)',
];
migrations.forEach(sql => { try { db.prepare(sql).run(); } catch { /* ignore */ } });

// Ensure any existing ai_chats without a session get assigned a default session
db.prepare("INSERT OR IGNORE INTO ai_chat_sessions (id, tenant_id, title) SELECT 'default_' || tenant_id, tenant_id, 'Chat Antigo' FROM ai_chats WHERE session_id IS NULL GROUP BY tenant_id").run();
db.prepare("UPDATE ai_chats SET session_id = 'default_' || tenant_id WHERE session_id IS NULL").run();

// Ensure master admin and personal accounts are always pro and admin (never expire)
const MASTER_EMAILS = ['admin@limpeja.com', 'joaovictorwbdesigner@gmail.com'];
for (const email of MASTER_EMAILS) {
  db.prepare("UPDATE tenants SET subscription_status = 'pro', email_verified = 1, role = 'admin' WHERE email = ?").run(email);
}

// Create default admin user if none exists
const stmt = db.prepare('SELECT * FROM tenants WHERE email = ?');
const defaultAdmin = stmt.get('admin@limpeja.com');
if (!defaultAdmin) {
  // Use a predictable tenant ID for testing if needed
  const tenantId = 'tenant_admin_123';
  const adminPass = process.env.ADMIN_PASSWORD || '123456';
  const hash = bcrypt.hashSync(adminPass, 10);
  db.prepare('INSERT INTO tenants (id, name, email, password_hash, subscription_status, role) VALUES (?, ?, ?, ?, ?, ?)').run(tenantId, 'LimpeJá Master', 'admin@limpeja.com', hash, 'pro', 'admin');
  db.prepare('INSERT INTO config (tenant_id, companyName, ownerName, whatsapp, monthlyGoal) VALUES (?, ?, ?, ?, ?)').run(tenantId, 'LimpeJá', 'Administrador', '', 10000);
}

// Clean up any existing quotes that are linked to finalized orders
try {
  const deletedQuotes = db.prepare(`
    DELETE FROM quotes 
    WHERE id IN (
      SELECT quote_id 
      FROM orders 
      WHERE status = 'Finalizado' AND quote_id IS NOT NULL
    )
  `).run();
  if (deletedQuotes.changes > 0) {
    console.log(`🧹 Limpeza inicial: ${deletedQuotes.changes} orçamento(s) de OS já finalizadas foram excluídos.`);
  }
} catch (err) {
  console.error('❌ Erro na limpeza inicial de orçamentos finalizados:', err.message);
}

export default db;

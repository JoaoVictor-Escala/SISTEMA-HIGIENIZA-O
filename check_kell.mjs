import Database from 'better-sqlite3';
const db = new Database('./server/database.sqlite');
const tenants = db.prepare('SELECT id, name, email, referred_by FROM tenants WHERE UPPER(referred_by) = UPPER(?) OR UPPER(referred_by) = UPPER(?)').all('KELL20', 'KELL');
console.log(tenants);

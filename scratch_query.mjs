const db = require('better-sqlite3')('server/database.sqlite');
console.log(db.prepare("SELECT id, quote_id FROM orders WHERE id = 'mrtrfd5hqnsq' OR quote_id = 'mrtrfd5hqnsq'").all());
console.log(db.prepare("SELECT id FROM quotes WHERE id = 'mrtrfd5hqnsq'").all());

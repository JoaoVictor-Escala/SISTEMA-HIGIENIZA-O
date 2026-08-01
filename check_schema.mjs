import db from './server/db.js';

const info = db.prepare('PRAGMA table_info(affiliates)').all();
console.log(info);

import { Client } from 'ssh2';
const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`docker exec limpeja-docker-backend-1 node -e "const db=require('better-sqlite3')('/app/data/saas.db'); console.log(db.prepare('SELECT id, name, email, referred_by FROM tenants WHERE UPPER(referred_by) = \\'KEEL20\\'').all());"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
});
conn.connect(VPS);

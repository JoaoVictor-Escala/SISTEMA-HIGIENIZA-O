import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => { process.stderr.write(d.toString()); });
      stream.on('close', () => resolve(out));
    });
  });
}

const fixScript = `
const fs = require('fs');
const file = '/var/www/limpeja/server/index.js';
let content = fs.readFileSync(file, 'utf8');

// Remove old trust proxy if it exists
content = content.replace("app.set('trust proxy', 1);\\n", "");

// Insert right after const app = express();
content = content.replace("const app = express();", "const app = express();\\napp.set('trust proxy', 1);");

fs.writeFileSync(file, content);
console.log('Fixed trust proxy in index.js properly');
`;

function uploadFile(conn, content, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const ws = sftp.createWriteStream(remotePath);
      ws.on('close', resolve);
      ws.on('error', reject);
      ws.write(Buffer.from(content));
      ws.end();
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  await uploadFile(conn, fixScript, '/tmp/fix_proxy2.js');
  await exec(conn, 'node /tmp/fix_proxy2.js');
  await exec(conn, 'pm2 restart limpeja-backend');
  await exec(conn, 'pm2 flush'); // Clear old logs!
  await exec(conn, 'rm -f /tmp/fix_proxy2.js');
  conn.end();
});
conn.connect(VPS);

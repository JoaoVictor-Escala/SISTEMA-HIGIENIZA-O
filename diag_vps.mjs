import { Client } from 'ssh2';
import fs from 'fs';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => process.stderr.write(d.toString()));
      stream.on('close', () => resolve(out));
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, {}, err => {
        if (err) reject(err); else resolve();
      });
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  console.log('📤 Enviando database.js corrigido...');
  await uploadFile(conn, 'server/database.js', '/var/www/limpeja/server/database.js');
  
  console.log('🔄 Reiniciando backend...');
  await exec(conn, 'pm2 restart limpeja-backend');
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Test the fix
  console.log('\n✅ Testando filtro via API...');
  const testScript = `
    const http = require('http');
    const loginData = JSON.stringify({ email: 'joaovictorwbdesigner@gmail.com', password: '88183170' });
    function req(options, body) {
      return new Promise((resolve, reject) => {
        const r = http.request(options, res => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        r.on('error', reject);
        if (body) r.write(body);
        r.end();
      });
    }
    async function main() {
      const loginRes = await req({ hostname: '127.0.0.1', port: 3002, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length } }, loginData);
      const { token } = JSON.parse(loginRes.body);
      const c = await req({ hostname: '127.0.0.1', port: 3002, path: '/api/clients?page=1&limit=50&tipo=cliente', headers: { 'Authorization': 'Bearer ' + token } });
      const l = await req({ hostname: '127.0.0.1', port: 3002, path: '/api/clients?page=1&limit=50&tipo=lead', headers: { 'Authorization': 'Bearer ' + token } });
      console.log('Clientes:', JSON.parse(c.body).total, '| Leads:', JSON.parse(l.body).total);
    }
    main().catch(console.error);
  `;
  
  const { execSync } = await import('child_process');
  
  console.log('\n=== Resultado ===');
  await exec(conn, `node -e "${testScript.replace(/\n/g, ' ').replace(/"/g, '\\"').replace(/'/g, "'\\''")}" 2>&1 || echo 'Usando curl...'`);
  
  conn.end();
});
conn.connect(VPS);

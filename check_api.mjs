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

const conn = new Client();
conn.on('ready', async () => {
  console.log('--- Checking API ---');
  await exec(conn, 'curl -s -i http://localhost:3002/api/health');
  console.log('\n--- Checking API with IP ---');
  await exec(conn, 'curl -s -i -H "X-Forwarded-For: 8.8.8.8" http://localhost:3002/api/health');
  conn.end();
});
conn.connect(VPS);

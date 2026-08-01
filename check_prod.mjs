import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@', readyTimeout: 20000 };

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

const conn = new Client();
conn.on('ready', async () => {
  console.log('=== Check if 204 fix is in the deployed JS ===');
  await exec(conn, 'docker exec limpeja-docker-frontend-1 grep -c "204" /usr/share/nginx/html/assets/*.js 2>/dev/null || echo "Not found"');

  console.log('\n=== Check sw.js exists ===');
  await exec(conn, 'docker exec limpeja-docker-frontend-1 ls -la /usr/share/nginx/html/sw.js 2>/dev/null');

  console.log('\n=== List JS files with timestamps ===');
  await exec(conn, 'docker exec limpeja-docker-frontend-1 ls -la /usr/share/nginx/html/assets/*.js 2>/dev/null | head -10');

  conn.end();
});
conn.connect(VPS);

import { Client } from 'ssh2';
const conn = new Client();
conn.on('ready', () => {
  // Find where the backend files actually are inside the container
  conn.exec('docker exec limpeja-docker-backend-1 find / -name "index.js" -path "*/server/*" 2>/dev/null | head -5', (err, stream) => {
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => {
      // Also check the mounted volume path
      conn.exec('docker inspect limpeja-docker-backend-1 --format "{{json .Mounts}}"', (err2, s2) => {
        s2.on('data', d => process.stdout.write(d));
        s2.on('close', () => conn.end());
      });
    });
  });
}).connect({ host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' });

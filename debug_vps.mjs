import { Client } from 'ssh2';
const conn = new Client();
conn.on('ready', () => {
  conn.exec('docker ps && echo "---" && pm2 list && echo "---" && ls -la /var/www', (err, stream) => {
    stream.on('data', d => process.stdout.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' });

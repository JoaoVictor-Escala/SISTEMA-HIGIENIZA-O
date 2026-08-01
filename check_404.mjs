import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -s -I -H "Host: 72.62.138.34" http://127.0.0.1/login && nginx -T | grep -A 10 "server_name 72.62.138.34"', (err, stream) => {
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
});
conn.connect(VPS);

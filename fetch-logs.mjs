import { Client } from 'ssh2';

const VPS = {
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@',
  readyTimeout: 20000,
};

const conn = new Client();
conn.on('ready', () => {
  conn.exec('docker logs --tail 50 limpeja-docker-backend-1', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => { conn.end(); });
  });
}).connect(VPS);

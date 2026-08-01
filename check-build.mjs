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
  conn.exec('cd /var/www/limpeja-docker && docker compose build backend', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => process.stdout.write(data))
          .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect(VPS);

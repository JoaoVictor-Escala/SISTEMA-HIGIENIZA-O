import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH conectado. Parando nginx container...');
  conn.exec(`
    cd /var/www/limpeja-docker && docker compose stop frontend
    if ! command -v certbot &>/dev/null; then
      apt-get update && apt-get install -y certbot
    fi
    certbot certonly --standalone -d higigestor.com -d www.higigestor.com --non-interactive --agree-tos -m suporte@jlescala.com
  `, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', (code) => {
      console.log('Certbot terminou com código', code);
      conn.end();
    });
  });
});
conn.on('error', err => console.error(err));
conn.connect(VPS);

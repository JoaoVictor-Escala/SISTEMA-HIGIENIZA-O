import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

const nginxConfig = `server {
    listen 80;
    listen [::]:80;
    server_name higigestor.com www.higigestor.com 72.62.138.34;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name higigestor.com www.higigestor.com;

    ssl_certificate /etc/letsencrypt/live/higigestor.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/higigestor.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/limpeja/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}`;

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
  console.log('--- Uploading proper Nginx Config ---');
  await uploadFile(conn, nginxConfig, '/etc/nginx/sites-available/limpeja');
  
  // Make sure default is removed so limpeja can bind to 80/443 without conflict if needed
  await exec(conn, 'rm -f /etc/nginx/sites-enabled/default');
  
  console.log('--- Testing Nginx Config ---');
  await exec(conn, 'nginx -t');
  
  console.log('--- Restarting Nginx ---');
  await exec(conn, 'systemctl restart nginx');
  
  conn.end();
});
conn.connect(VPS);

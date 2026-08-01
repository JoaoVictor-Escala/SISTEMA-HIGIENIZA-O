import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

function runSSH(conn, command) {
  return new Promise((resolve, reject) => {
    let out = '';
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => process.stdout.write(d.toString()));
      stream.on('close', () => resolve(out));
    });
  });
}

const conn = new Client();
await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', rej); conn.connect(VPS); });

// Check catchall config
console.log('=== catchall config ===');
await runSSH(conn, 'cat /etc/nginx/sites-available/catchall');

// Fix: make limpeja the default_server and update APP_URL
console.log('\n=== Fixing Nginx — setting limpeja as default_server ===');
const nginxConf = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 72.62.138.34 _;

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

await runSSH(conn, `cat > /etc/nginx/sites-available/limpeja << 'NGINXEOF'\n${nginxConf}\nNGINXEOF`);

// Remove catchall from sites-enabled since it conflicts
await runSSH(conn, `
  rm -f /etc/nginx/sites-enabled/catchall
  nginx -t && systemctl reload nginx
  echo "Nginx reloaded OK"
`);

console.log('\n=== Test from outside (via curl with verbose) ===');
await runSSH(conn, 'curl -v http://72.62.138.34/ 2>&1 | head -30');

console.log('\n=== API from outside ===');
await runSSH(conn, 'curl -s http://72.62.138.34/api/health');

conn.end();
console.log('\n\nDone! Try http://72.62.138.34 now.');

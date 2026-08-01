import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

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

const nginxConf = `server {
    listen 80;
    server_name higigestor.com www.higigestor.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name higigestor.com www.higigestor.com;

    client_max_body_size 50M;

    ssl_certificate     /etc/letsencrypt/live/higigestor.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/higigestor.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

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
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60;
    }

    location ~* (index\\.html|sw\\.js|workbox-.+\\.js)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files $uri /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}`;

const conn = new Client();
conn.on('ready', async () => {
  console.log('✅ SSH conectado. Corrigindo Nginx com SSL para higigestor.com...\n');

  // Write the config
  await exec(conn, `cat > /etc/nginx/sites-available/limpeja << 'NGINXEOF'\n${nginxConf}\nNGINXEOF`);
  
  // Enable it
  await exec(conn, 'ln -sf /etc/nginx/sites-available/limpeja /etc/nginx/sites-enabled/limpeja');
  await exec(conn, 'rm -f /etc/nginx/sites-enabled/default');

  // Test and reload nginx
  console.log('\n🔍 Testando configuração do Nginx...');
  await exec(conn, 'nginx -t');

  console.log('\n🔄 Recarregando Nginx...');
  await exec(conn, 'systemctl reload nginx');

  // Check if cert exists
  console.log('\n🔒 Verificando certificado SSL...');
  await exec(conn, 'ls -la /etc/letsencrypt/live/higigestor.com/ 2>/dev/null || echo "CERT NÃO ENCONTRADO"');

  // Check PM2 backend
  console.log('\n🚀 Status do backend (PM2)...');
  await exec(conn, 'pm2 status');

  // Quick test
  console.log('\n🌐 Teste da API...');
  await exec(conn, `curl -s http://127.0.0.1:3002/api/health`);

  console.log('\n\n✅ Nginx reconfigurado com SSL para https://higigestor.com');
  conn.end();
});
conn.connect(VPS);

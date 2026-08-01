import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname; // deploy.mjs is at the project root

const VPS = {
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@',
  readyTimeout: 20000,
};

const APP_DIR = '/var/www/limpeja';

function runSSH(conn, command) {
  return new Promise((resolve, reject) => {
    let out = '', err = '';
    conn.exec(command, (error, stream) => {
      if (error) return reject(error);
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => { err += d; process.stderr.write(d.toString()); });
      stream.on('close', (code) => {
        if (code !== 0 && code !== null) reject(new Error(`Exit ${code}: ${err}`));
        else resolve(out);
      });
    });
  });
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

function mkdirRemote(sftp, dir) {
  return new Promise((resolve) => {
    sftp.mkdir(dir, () => resolve()); // ignore errors (dir may exist)
  });
}

function uploadDir(sftp, localDir, remoteDir) {
  return new Promise(async (resolve, reject) => {
    try {
      await mkdirRemote(sftp, remoteDir);
      const entries = fs.readdirSync(localDir, { withFileTypes: true });
      for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        const remotePath = remoteDir + '/' + entry.name;
        if (entry.isDirectory()) {
          await uploadDir(sftp, localPath, remotePath);
        } else {
          process.stdout.write(`  ↑ ${remotePath}\n`);
          await uploadFile(sftp, localPath, remotePath);
        }
      }
      resolve();
    } catch(e) { reject(e); }
  });
}

function getSftp(conn) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) reject(err); else resolve(sftp);
    });
  });
}

async function deploy() {
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(VPS);
  });

  console.log('\n✅ SSH conectado!\n');

  // ── 1. Instalar Node.js 20 via NodeSource ──
  console.log('📦 Instalando Node.js 20...');
  await runSSH(conn, `
    if ! command -v node &>/dev/null; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &&
      apt-get install -y nodejs 2>&1 | grep -E '(Setting up|already)'
    else
      echo "Node já instalado: $(node --version)"
    fi
  `);

  // ── 2. Instalar PM2 e Nginx ──
  console.log('\n📦 Instalando PM2 e Nginx...');
  await runSSH(conn, `
    npm install -g pm2 2>&1 | tail -1
    apt-get install -y nginx 2>&1 | grep -E '(Setting up|already|nginx)'
  `);

  // ── 3. Criar diretório da aplicação ──
  console.log('\n📁 Criando estrutura de diretórios...');
  await runSSH(conn, `mkdir -p ${APP_DIR}/server ${APP_DIR}/dist`);

  // ── 4. Upload via SFTP ──
  const sftp = await getSftp(conn);

  // Upload server files
  console.log('\n📤 Enviando backend (server/)...');
  const serverFiles = ['index.js', 'database.js', 'db.js', '.env', 'package.json'];
  for (const f of serverFiles) {
    const localPath = path.join(ROOT, 'server', f);
    if (fs.existsSync(localPath)) {
      process.stdout.write(`  ↑ ${APP_DIR}/server/${f}\n`);
      await uploadFile(sftp, localPath, `${APP_DIR}/server/${f}`);
    }
  }

  // Upload db.js needs to find better-sqlite3
  // DB file lives in server dir
  console.log('\n📤 Enviando frontend (dist/)...');
  const distDir = path.join(ROOT, 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error('dist/ não encontrado — rode "npm run build" primeiro');
  }
  await uploadDir(sftp, distDir, `${APP_DIR}/dist`);

  // ── 5. Instalar dependências do backend ──
  console.log('\n📦 Instalando dependências do backend no VPS...');
  await runSSH(conn, `cd ${APP_DIR}/server && npm install --omit=dev 2>&1 | tail -3`);

  // ── 6. Iniciar backend com PM2 ──
  console.log('\n🚀 Iniciando backend com PM2...');
  await runSSH(conn, `
    cd ${APP_DIR}/server
    pm2 delete limpeja-backend 2>/dev/null || true
    pm2 start index.js --name limpeja-backend --interpreter node --node-args="--experimental-vm-modules"
    pm2 save
    pm2 startup systemd -u root --hp /root 2>&1 | tail -2
  `);

  // ── 7. Configurar Nginx ──
  console.log('\n🌐 Configurando Nginx...');
  const nginxConf = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name higigestor.com www.higigestor.com 72.62.138.34 _;

    # Frontend estático
    root ${APP_DIR}/dist;
    index index.html;

    # API → backend Node.js
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SPA fallback — todas as rotas vão para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}`;

  // Write nginx config via heredoc
  const escapedConf = nginxConf.replace(/'/g, "'\\''");
  await runSSH(conn, `
    cat > /etc/nginx/sites-available/limpeja << 'NGINXEOF'
${nginxConf}
NGINXEOF
    ln -sf /etc/nginx/sites-available/limpeja /etc/nginx/sites-enabled/limpeja
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl restart nginx && systemctl enable nginx
  `);

  // ── 8. Status final ──
  console.log('\n📊 Status final...');
  await runSSH(conn, `
    echo "=== PM2 ===" && pm2 list
    echo "=== Nginx ===" && systemctl is-active nginx
    echo "=== Node.js ===" && node --version
    echo "=== API health ===" && curl -s http://localhost:3001/api/health || echo "backend ainda iniciando..."
  `);

  conn.end();
  console.log('\n\n🎉 DEPLOY CONCLUÍDO!');
  console.log(`🌐 Sistema disponível em: http://72.62.138.34`);
  console.log(`⚙️  Backend rodando em:   http://72.62.138.34/api`);
  console.log('\n📋 Próximos passos:');
  console.log('  1. Acesse http://72.62.138.34 e teste o sistema');
  console.log('  2. Configure o domínio apontando para 72.62.138.34');
  console.log('  3. Instale SSL: certbot --nginx -d seudominio.com');
  console.log('  4. Configure o webhook Stripe: https://dashboard.stripe.com/webhooks');
  console.log('     URL: http://72.62.138.34/api/stripe/webhook');
}

deploy().catch(err => {
  console.error('\n❌ Erro no deploy:', err.message);
  process.exit(1);
});

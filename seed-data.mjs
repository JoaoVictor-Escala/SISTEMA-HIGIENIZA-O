import { Client } from 'ssh2';

const VPS = {
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@',
  readyTimeout: 20000,
};

const script = `
import { seedDemoData, clearDemoData } from '/app/database.js';
import db from '/app/db.js';

const tenants = db.prepare('SELECT id, email FROM tenants').all();
for (const t of tenants) {
  console.log('🌱 Gerando dados fictícios para:', t.email);
  clearDemoData(t.id);
  seedDemoData(t.id);
}
console.log('✅ Concluído!');
`;

const conn = new Client();
conn.on('ready', () => {
  // Use echo to write the script to a temporary file inside the container, then run it.
  const cmd = `docker exec -i limpeja-docker-backend-1 sh -c "cat > /tmp/seed.js && node --experimental-modules /tmp/seed.js"`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => { conn.end(); });
    
    // Write the script to stdin
    stream.write(script);
    stream.end();
  });
}).connect(VPS);

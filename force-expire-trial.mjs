// Script to force trial expiration for a specific account on the VPS
// Connects to the running Docker container's SQLite DB via the app API

import { execSync } from 'child_process';

const email = 'joaovicorred@gmail.com';

// Use plink or ssh depending on availability
// This script will try to run sqlite3 inside the container
const cmd = `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@72.62.138.34 "docker exec limpeja-docker-backend-1 sqlite3 /app/data/saas.db 'UPDATE tenants SET trial_started_at=\\\"2020-01-01 00:00:00\\\" WHERE email=\\\"${email}\\\"; SELECT email, trial_started_at FROM tenants WHERE email=\\\"${email}\\\";'"`;

try {
  const result = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
  console.log('✅ Resultado:', result);
} catch (err) {
  console.error('❌ Erro:', err.message);
  console.log('\nTente manualmente na VPS:');
  console.log(`docker exec limpeja-docker-backend-1 sqlite3 /app/data/saas.db "UPDATE tenants SET trial_started_at='2020-01-01' WHERE email='${email}';"`);
}

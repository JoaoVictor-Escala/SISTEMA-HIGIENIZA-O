import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };
const conn = new Client();

conn.on('ready', () => {
  console.log('Connected');
  conn.exec('docker exec limpeja-docker-backend-1 node -e "try { require(\'better-sqlite3\')(\'/app/data/saas.db\').exec(\'ALTER TABLE tenants ADD COLUMN trial_started_at DATETIME;\'); console.log(\'Column added\'); } catch(e) { console.log(e.message); }"', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log('OUT:', d.toString()));
    stream.stderr.on('data', d => console.log('ERR:', d.toString()));
    stream.on('close', () => {
      console.log('Done, restarting backend');
      conn.exec('docker restart limpeja-docker-backend-1', (err, s) => {
        s.on('close', () => conn.end());
      });
    });
  });
}).connect(VPS);

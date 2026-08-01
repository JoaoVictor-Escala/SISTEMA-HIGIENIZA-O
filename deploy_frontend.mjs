import { Client } from 'ssh2';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

console.log('Building frontend...');
execSync('npm run build', { stdio: 'inherit' });

function execRemote(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on('data', d => process.stdout.write(d.toString()));
      stream.stderr.on('data', d => process.stderr.write(d.toString()));
      stream.on('close', resolve);
    });
  });
}

function uploadDir(conn, localDir, remoteDir) {
  return new Promise((resolve, reject) => {
    conn.sftp(async (err, sftp) => {
      if (err) return reject(err);

      async function walk(dir, remoteBase) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const localPath = path.join(dir, file);
          const remotePath = `${remoteBase}/${file}`;
          const stat = fs.statSync(localPath);
          if (stat.isDirectory()) {
            await new Promise((res, rej) => sftp.mkdir(remotePath, (e) => {
              if (e && e.code !== 4) return rej(e); // 4 = already exists
              res();
            }));
            await walk(localPath, remotePath);
          } else {
            await new Promise((res, rej) => sftp.fastPut(localPath, remotePath, (e) => {
              if (e) return rej(e);
              res();
            }));
          }
        }
      }

      await new Promise((res, rej) => sftp.mkdir(remoteDir, (e) => {
        if (e && e.code !== 4) return rej(e);
        res();
      }));
      await walk(localDir, remoteDir);
      resolve();
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  console.log('Clearing remote dist...');
  await execRemote(conn, 'rm -rf /var/www/limpeja/dist/*');
  console.log('Uploading dist...');
  await uploadDir(conn, path.join(process.cwd(), 'dist'), '/var/www/limpeja/dist');
  console.log('Done!');
  conn.end();
});
conn.connect(VPS);

import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -sL -k https://localhost:443', (err, stream) => {
    let data = '';
    stream.on('data', d => data += d).on('close', () => {
      console.log('localhost:443 index.html:');
      const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
      console.log(match ? match[1] : 'No JS found. Data was: ' + data.substring(0, 100));
      conn.end();
    });
  });
}).connect({
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@',
  readyTimeout: 60000
});

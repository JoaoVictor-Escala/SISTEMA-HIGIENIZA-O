import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('cat /var/www/limpeja-docker/dist/index.html', (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('data', (d) => {
      data += d;
    }).on('close', (code, signal) => {
      const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
      if (match) {
        console.log('Found JS file:', match[1]);
        conn.exec('cat /var/www/limpeja-docker/dist' + match[1], (err, stream2) => {
          let jsData = '';
          stream2.on('data', (d) => { jsData += d; }).on('close', () => {
            console.log('Includes 14px 24px 18px?', jsData.includes('14px 24px 18px'));
            conn.end();
          });
        });
      } else {
        console.log('No JS file found in HTML');
        conn.end();
      }
    });
  });
}).connect({
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@',
  readyTimeout: 60000
});

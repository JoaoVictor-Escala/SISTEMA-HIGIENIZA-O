import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('netstat -tulpn | grep -E ":80|:443"', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@'
});

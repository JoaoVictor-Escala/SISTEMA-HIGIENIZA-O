import https from 'https';

https.get('https://sistema.impactoclean.com.br/', { rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      console.log('Found JS:', match[1]);
      https.get('https://sistema.impactoclean.com.br' + match[1], { rejectUnauthorized: false }, (res2) => {
        let jsData = '';
        res2.on('data', d => jsData += d);
        res2.on('end', () => {
          console.log('Includes 14px 24px 18px?', jsData.includes('14px 24px 18px'));
        });
      });
    } else {
      console.log('No JS');
    }
  });
});

fetch('https://sistema.impactoclean.com.br/')
  .then(res => res.text())
  .then(html => {
    const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if(match) {
      console.log('Found JS file:', match[1]);
      return fetch('https://sistema.impactoclean.com.br' + match[1]).then(r => r.text());
    }
  })
  .then(js => {
    if(js.includes('setInterval')) {
      console.log('✅ Polling logic IS in production JS!');
    } else {
      console.log('❌ Polling logic is MISSING in production JS!');
    }
  })
  .catch(console.error);

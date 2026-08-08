const https = require('https');
https.get('https://www.vinted.fr/catalog?search_text=nike', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml'
  }
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const hrefs = [...data.matchAll(/href="(\/items\/[^"]+)"/g)].slice(0, 20).map(m => m[1]);
    console.log('hrefs', hrefs);
    const titles = [...data.matchAll(/alt="([^"]+)"/g)].slice(0, 20).map(m => m[1]);
    console.log('alts', titles);
    const imgUrls = [...data.matchAll(/src="([^"]+)"/g)].slice(0, 20).map(m => m[1]);
    console.log('imgs', imgUrls);
  });
}).on('error', err => {
  console.error(err);
  process.exit(1);
});

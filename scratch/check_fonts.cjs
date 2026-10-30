const https = require('https');
https.get('https://talkaor.tech', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const cssLinks = d.match(/\/_[^"']+\.css/g);
    console.log('CSS links:', cssLinks);
    const fonts = d.match(/font-[^"'\s>]+/g);
    console.log('Font classes:', [...new Set(fonts || [])]);
  });
});


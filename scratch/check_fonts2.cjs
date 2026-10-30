const https = require('https');
https.get('https://talkaor.tech/_next/static/css/34249a4e7f26d59f.css', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const ff = d.match(/font-family:[^;}]+/g);
    console.log('Font families:', [...new Set(ff || [])]);
    const fontFaces = d.match(/@font-face\s*\{[^}]+\}/g);
    console.log('Font faces count:', fontFaces ? fontFaces.length : 0);
    if (fontFaces) {
      fontFaces.slice(0, 5).forEach(f => console.log(f));
    }
  });
});


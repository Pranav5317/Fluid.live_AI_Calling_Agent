const https = require('https');
https.get('https://talkaor.tech/_next/static/css/34249a4e7f26d59f.css', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const fontFaces = d.match(/@font-face\s*\{[^}]*__display[^}]*\}/g);
    console.log(fontFaces);
  });
});


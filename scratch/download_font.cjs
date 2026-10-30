const https = require('https');
const fs = require('fs');
const file = fs.createWriteStream('scratch/display.otf');
https.get('https://talkaor.tech/_next/static/media/734b2949ae2187ea-s.p.otf', res => {
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Downloaded display.otf, size:', fs.statSync('scratch/display.otf').size);
    // Read first few KB to find font name
    const buf = fs.readFileSync('scratch/display.otf');
    const str = buf.toString('latin1');
    const names = str.match(/[A-Z][a-zA-Z0-9_\-\s]{3,30}/g);
    console.log('Sample names in otf:', names ? names.slice(0, 20) : 'none');
  });
});


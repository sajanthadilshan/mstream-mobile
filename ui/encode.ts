import fs from 'node:fs';

const html = fs.readFileSync('./dist-single/index.html', 'utf-8');

const encoded = Buffer.from(html, 'utf-8').toString('base64');

const output = `<script> document.write(decodeURIComponent(escape(atob('${encoded}')))); </script>`;

fs.writeFileSync('./dist-single/out.html', output);

console.log('HTML encoded successfully!');

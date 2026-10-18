import {readFile,writeFile}from 'node:fs/promises';
const html=(await readFile('index.html','utf8')).replace('<script type="module" src="/src/main.js"></script>','<script type="module" src="/scripts/ora-fixture/preview.js"></script>');
await writeFile('tests/fixtures/ora-review.html',html);
console.log('Local synthetic UI only: /tests/fixtures/ora-review.html');

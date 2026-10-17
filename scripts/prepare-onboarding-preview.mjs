import {readFile,writeFile,mkdir}from 'node:fs/promises';
await mkdir('tests/fixtures',{recursive:true});
const html=(await readFile('index.html','utf8')).replace('<script type="module" src="/src/main.js"></script>','<script type="module" src="/scripts/onboarding-fixture/preview.js"></script>');
await writeFile('tests/fixtures/onboarding-review.html',html);
console.log('Local synthetic UI only: /tests/fixtures/onboarding-review.html?reset=1');

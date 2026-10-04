import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
await mkdir('tests/fixtures',{recursive:true});
const html=(await readFile('index.html','utf8')).replace('<script type="module" src="/src/main.js"></script>','<script type="module" src="/tests/fixtures/load-preview.js"></script>');
await writeFile('tests/fixtures/load-review.html',html);
await copyFile('scripts/load-fixture/preview.js','tests/fixtures/load-preview.js');
await copyFile('scripts/load-fixture/avatar.svg','tests/fixtures/load-avatar.svg');
console.log('Local-only load preview: http://127.0.0.1:4173/tests/fixtures/load-review.html');

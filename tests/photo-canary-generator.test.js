import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preflightCanaryFixtures,canaryJpeg,CANARY_SEEDS} from './fixtures/photo-canary-generator.mjs';
import {inspectPhoto} from '../src/photo-contract.js';
import {validateJpegPayload} from '../supabase/functions/_shared/photo-jpeg-validation.js';
test('repaired deterministic canary fixtures pass the unchanged full PHOTO-01 path before network use',async()=>{
 const fixtures=await preflightCanaryFixtures();assert.equal(fixtures.size,CANARY_SEEDS.length);
 for(const [seed,bytes]of fixtures){const h=inspectPhoto(bytes);assert.equal(h.format,'JPEG');assert.equal(h.width,320);assert.equal(h.height,240);assert.equal(h.orientation,1);assert.ok(bytes.length<20000);validateJpegPayload(bytes,h);assert.deepEqual(bytes,await canaryJpeg(seed));}
 assert.equal(createHash('sha256').update(fixtures.get(40)).digest('hex'),'5f1a68c2a0a4e477e7539a037a6b73c640b6c30e675dc2d581631f98b561aa7d');
 await assert.rejects(canaryJpeg(999));
});

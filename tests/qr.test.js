import test from 'node:test';
import assert from 'node:assert/strict';
import { venueTokenFromQr } from '../src/qr.js';
test('only valid venue links for this app are accepted',()=>{
  const origin='https://spot.example',token='30000000-0000-0000-0000-000000000001';
  assert.equal(venueTokenFromQr(`${origin}/?venue=${token}`,origin),token);
  for(const qr of ['javascript:alert(1)','hello',`${origin}/?venue=invalid`,`https://other.example/?venue=${token}`,`${origin}/`]) assert.equal(venueTokenFromQr(qr,origin),null);
});

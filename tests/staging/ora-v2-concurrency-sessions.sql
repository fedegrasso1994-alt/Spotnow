-- Two independent PostgreSQL sessions. Run A, then B while A is sleeping.
-- No account credentials. Synthetic principal comes from the named setup file.
-- Repeat with the B operation changed as documented below.
-- SESSION A
begin;
set local statement_timeout='45s';
set local role authenticated;
select set_config('request.jwt.claim.sub','fe323000-0000-4000-8000-000000000001',true);
select start_ora_manual('fe324000-0000-4000-8000-000000000001');
select pg_sleep(12);
commit;
-- SESSION B: different Place (also proves manual vs QR, second device).
begin;
set local statement_timeout='45s';
set local role authenticated;
select set_config('request.jwt.claim.sub','fe323000-0000-4000-8000-000000000001',true);
select start_ora_qr('fe325000-0000-4000-8000-000000000001');
commit;
-- Other B variants: start_ora_manual('fe324000-0000-4000-8000-000000000002')
-- and start_ora_manual('fe324000-0000-4000-8000-000000000001').
-- Postcondition: exactly one checkins row; same-Place A/B return identical
-- presence_id, started_at and expires_at. Test RR separately: a stale snapshot
-- may fail with 40001/23505; retry in a fresh transaction, never bypass locks.
select user_id,venue_id,presence_id,presence_source,checked_in_at,expires_at
from public.checkins where user_id='fe323000-0000-4000-8000-000000000001';

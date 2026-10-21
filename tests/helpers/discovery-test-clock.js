import{PGlite}from'@electric-sql/pglite';
/** Deterministic server time in one disposable local test database only.
 * Never exported from src, packaged as migration, or executable against staging.
 * Caller must be the local DB owner (admin), then restore its test actor.
 */
export async function freezeDiscoveryTestClock(db,stamp){
 if(!(db instanceof PGlite))throw Error('LOCAL_PGLITE_TEST_DATABASE_REQUIRED');
 if(typeof stamp!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(stamp)||!Number.isFinite(Date.parse(stamp)))throw Error('EXPLICIT_TEST_TIMESTAMP_REQUIRED');
 await db.query("select pg_catalog.set_config('soma.test_clock',$1,false)",[stamp]);
 await db.exec(`create or replace function pg_catalog.clock_timestamp()returns timestamptz
 language sql volatile as $$select pg_catalog.current_setting('soma.test_clock')::timestamptz$$`);
}

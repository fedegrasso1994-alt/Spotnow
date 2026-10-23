# OPS Phase A — canonical migration map

Generated from exact repository bytes and read-only staging history. Checksums are file identities, not assertions of historical execution. Full hashes/status in `evidence/ops-phase-a/migration-map.json`. No repair or replay on staging.

| Version / file | Purpose | History / identity | SHA-256 |
|---|---|---|---|
| 001_profiles_checkins.sql | profiles checkins | REGISTERED_EXACT_FILE | a020ba78174523ba286c63ecb54a1e89125da3c8a4331bab768600ee3e589ee6 |
| 002_matches_messages.sql | matches messages | REGISTERED_EXACT_FILE | b01530fd3174ef589ef2ab9268cf707cb3cef0928c962620b50c7889320dcff1 |
| 003_reports.sql | reports | REGISTERED_EXACT_FILE | e5676644b3b2bc655e066573d289acf7a10f4e93471b030643d917e929976ea9 |
| 004_suspensions.sql | suspensions | REGISTERED_EXACT_FILE | 819c08139c67c16e018496b05eb5e1c65caa11d65e22284c34d4c9f31bca3f43 |
| 005_account_status.sql | account status | REGISTERED_EXACT_FILE | a6d4f8b8a5a92e2939b7862ae0fcfc00839329c10e321a21dcab18f7b1084edf |
| 006_moderation_panel.sql | moderation panel | REGISTERED_EXACT_FILE | d79f844a14a421fa008ad757c699231f70b4e3ebcf042b1ee20276b6503ad59c |
| 007_tribes.sql | tribes | REGISTERED_EXACT_FILE | 3f56e9b80c68308eb45f77755a9b322c0c9895367d7d93889ffaebbaa94ec9ff |
| 008_account_deletion.sql | account deletion | REGISTERED_EXACT_FILE | d3490d527f986bd356636fde3399db4bca145696d396aee25cccffdd82694d4f |
| 009_adversarial_revision.sql | adversarial revision | REGISTERED_EXACT_FILE | fa59158d43d9ed4625693c6071b7c51e02229033315f0825402f314c8229d39a |
| 010_profile_occupation.sql | profile occupation | REGISTERED_EXACT_FILE | 5a2df33f7dc57661c9aa7d38febabdaae3383a2c9ccdcc929ffd84314cb75a4f |
| 011_load_scaling.sql | load scaling | REGISTERED_EXACT_FILE | 134a3142ddcbcde31dea63d78053a2da0860a418442b7d18b47457de607331df |
| 012_photo_assets.sql | photo assets | REGISTERED_EXACT_FILE | 9890c1060501aea2ea4ebff9058452dd875cff8e9a0ba1eb16e8701bd8582aaf |
| 013_detail_photo_assets.sql | detail photo assets | REGISTERED_EXACT_FILE | 83cfba0110af6159ed7fc9433842deb2ff7732a6d14a6ad6f9525319070247ec |
| 014_discovery_presence_privacy.sql | discovery presence privacy | REGISTERED_EXACT_FILE | ec69e7f2f8d6fda984f1231dfb78b8a6455be5ec4dfd9b99edf07970aa884e9f |
| 015_private_profile_preference.sql | private profile preference | REGISTERED_EXACT_FILE | e645bd80344fa47ecf784b36ac1c4499dffb9b7a7869f3357ee7e802436ad7b3 |
| 016_authoritative_photo_uploads.sql | authoritative photo uploads | REGISTERED_NOT_BYTE_PROVEN | 41dc5d3983d23027e9e5d231726098cec99daa6d3dc9927ea9a746e496169e22 |
| 017_photo_lifecycle.sql | photo lifecycle | UNREGISTERED_UNRESOLVED | a812b7bc717eaf34f97ab518db8217f4e2abc6a685b849c62ef29e4519d486ea |
| 018_photo_review.sql | photo review | UNREGISTERED_UNRESOLVED | 39627f032682f60e6bbf9f6990f9a7802d06b0a8a26df18ab8432528d618cf8b |
| 019_photo_cutover.sql | photo cutover | UNREGISTERED_UNRESOLVED | d90294b58be7beb1e682bf4d6073c2619ba54d3d7c238af8079ccd438e8285cd |
| 020_age_eligibility.sql | age eligibility | UNREGISTERED_UNRESOLVED | a2e393be4102ea3a6263672821302186ee4c65d604fa85cb47676f4f783f2d7d |
| 021_dating_consent.sql | dating consent | UNREGISTERED_UNRESOLVED | 7c5c59651d08c20f9299e0ada50772465e72aaaa7470d298e2c3532ec344637e |
| 022_location_minimization.sql | location minimization | UNREGISTERED_UNRESOLVED | 1ada722f8f0ccc1d4838987b6e2e1262d1a827d90d07864547d9f06712c29668 |
| 023_privacy_retention.sql | privacy retention | UNREGISTERED_UNRESOLVED | 001743c3b1332735ac114385b0427900131bfa547b72e4055ca2fc3d63f67599 |
| 024_user_rights.sql | user rights | UNREGISTERED_UNRESOLVED | f55c4f608c9f0a4b6db55ec5817309fc8c5804cf7d557a2698f176e2dd40a453 |
| 025_moderation.sql | moderation | UNREGISTERED_UNRESOLVED | 0bdd1f3e69816f1531299656a3517f5ab3c6e789b28368e00de3dbf00c0fdd01 |
| 026_tribe_board.sql | tribe board | UNREGISTERED_UNRESOLVED | 7d557ab8f3e6504face654b1e207fa23d1efa4b8e6dd204de226e7746d61e532 |
| 027_soma_v2_schema_off.sql | soma v2 schema off | UNREGISTERED_UNRESOLVED | 1e69ad2b2b1a483a6a32b67ce5f6681dffc268ae9a5d143d940b1397b9344fc2 |
| 028_ora_spot_quota_schema_off.sql | ora spot quota schema off | UNREGISTERED_UNRESOLVED | 15ca0c931b5eb2de274eaf429e6bb76e4f88a140241bea32339ee12e9228ac10 |
| 029_controlled_staging_backfill.sql | controlled staging backfill | UNREGISTERED_UNRESOLVED — snapshot backfill, data provenance unresolved | c356cac2472a6bc462697c85c79ff4d9deeb89f92cf9b9a6a385c5007eb30a0b |
| 030_tribe_membership_engine.sql | tribe membership engine | UNREGISTERED_UNRESOLVED | 006f52cc69ddf38cb22bb0593461bfc064f1251ab9d2569177bfd3cbcdf0c73d |
| 031_signup_without_qr.sql | signup without qr | UNREGISTERED_UNRESOLVED | a95f81d3ce4a7f828d42ffa9dd8f0aff05f9d2488e567cb79bbcc694e0604568 |
| 032_places_ora_v2.sql | places ora v2 | UNREGISTERED_UNRESOLVED | 286ce048425a639f361ac8cb1e298d92a8646842ce7db329526f0d6942333b81 |
| 033_privacy_welcome_checkbox.sql | privacy welcome checkbox | UNREGISTERED_UNRESOLVED | 141dfcf9091fe4e7ef36373d416d481e2c9e2cb82888d2f15a097cbd7960f147 |
| 034_spot_v2_engine.sql | spot v2 engine | UNREGISTERED_UNRESOLVED | 75422ae49fd87a02a789b9d7c2d7a0369d9cd31dc48eefe3c3a06b727b41a5aa |
| 035_spot_v2_isolation_guard.sql | spot v2 isolation guard | UNREGISTERED_UNRESOLVED | b57ba9bba890efac89e1766f48575f4f8a25b41268db77366020cae5d72edcff |
| 036_profile_photo_authorization.sql | profile photo authorization | UNREGISTERED_UNRESOLVED | 3955779081693ba220acfd9da77d243aaa25c9b8afe3d8d84efaad70722f396e |
| 037_daily_discovery_engine.sql | daily discovery engine | UNREGISTERED_UNRESOLVED | a9f24a00a360e9708760f6b8440adcb1771b60eb1e6bfd4acac21801ae0f8b73 |
| 038_daily_discovery_policy.sql | daily discovery policy | UNREGISTERED_UNRESOLVED | d69adbc6cff3aa6c170ee55c6287ec08dc42feca8c6c80969dcc3b7b55ad55e5 |
| 039_dd_outgoing_spot_state.sql | dd outgoing spot state | UNREGISTERED_UNRESOLVED | 15ac03f43581d0161ce216ee4f814d3dab6ff6550a168c10101aee0ff3f57307 |
| 040_dd_idempotent_window_read.sql | dd idempotent window read | UNREGISTERED_UNRESOLVED | ee686f089119b8bddfedaf9c9c4a776e8045a95c589f2e313448fe2d6e1f3692 |
| 041_dd_controlled_admission.sql | dd controlled admission | UNREGISTERED_UNRESOLVED | e055f00fcbcb73661c0addf3229b87e3fc13bda9acd338c1a2ed55e9e8d51ea8 |
| 042_spotted_social_core.sql | spotted social core | UNREGISTERED_UNRESOLVED | 44839af1017938f87ac0f4edabeb3868b87b3c03d2428aa64239a6c139872b3b |
| 043_spotted_romantic_requests.sql | spotted romantic requests | UNREGISTERED_UNRESOLVED | 5450eb16c6db87ffcfc3ed5889d0d37fee4fe7f87d683a82e8c1cd53e0b5f555 |
| 044_romantic_overquota_minimization.sql | romantic overquota minimization | UNREGISTERED_UNRESOLVED | 2608a8435d042d6cf4fbe3a3a90de4076f9b37c19bc42226d563010dfabe005b |
| 046_spotted_remove_daily_post_quota.sql | spotted remove daily post quota | UNREGISTERED_UNRESOLVED | 5b3f991d2591694f0a18bb470f9a40255b45dbb4c6fe95c8664f2b6c969b0123 |
| 047_spotted_qod.sql | spotted qod | UNREGISTERED_UNRESOLVED | 2be950f146de57e43b95b0ac64ac76495e4f0796eb533b0a6ad6e18663d8d344 |
| 048_spotted_share.sql | spotted share | UNREGISTERED_UNRESOLVED | d0a9925a7271fc6bbf82c0dfaa990cc34683753dce67c2e4a4988d2583b83339 |
| 049_notifications_mvp.sql | notifications mvp | UNREGISTERED_UNRESOLVED | 923578119b13ed70e9b1f9ead8275d559d2943465071a3faeb50bc39aea6ed2b |
| 050_analytics_mvp.sql | analytics mvp | UNREGISTERED_UNRESOLVED | 07aea47c234052387a0e9a7616710c9edfcf3b8592178a1fb4abc60a9391bd28 |
| 051_admin_analytics_dashboard.sql | admin analytics dashboard | UNREGISTERED_UNRESOLVED | 216ca03be54546ddb93caca7bf90d89e8b109688e70f98ab479afd8e925e7ac1 |
| 052_moderation_finalization.sql | moderation finalization | UNREGISTERED_UNRESOLVED | 75fb85faeff630a355698f6131c9c4c88eb2a7ada4dd9e930cf843a156dd1f9f |
| 053_operational_observability.sql | operational observability | UNREGISTERED_UNRESOLVED | 83550a4a7ae7796e0c9bac018d3355ede0f5e168a663fe78176aec2bef9b4e4f |
| 054_retention_phase_a.sql | retention phase a | REGISTERED_NOT_BYTE_PROVEN | 7a9a7acf27fb909243e2b38a030e355106f80c29445c8e46b7c7c32bad685455 |

045: intentionally absent/unapplied superseded draft;047 replaces it. Do not fill the numbering gap. 016 is registered with zero statements;054 stores24 parsed statements, whose joined bytes are not the original file.001–015 match the one stored statement byte-for-byte.017–044 and046–053 have no ledger row; final component equality cannot retroactively authenticate the full historical scripts or backfills.

Supplementary dependencies: cutover/prepare.sql BEFORE017 after016 with drain; staging environment declaration before024/025; historical029 snapshot exception; unnumbered scheduler definitions (not activated by replay); managed Supabase Auth/Storage/cron/net/Vault and roles. Historical nonce patch is already incorporated in026; no new application permitted.

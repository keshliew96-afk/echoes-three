# Retired probes

These 76 probes import critic libraries (`gntcmenu3-lib.mjs`, `gntcmenu6-lib.mjs`,
`gntccontent4-lib.mjs`, `gntccontent5-lib.mjs`, `gntcnet1/4/5/6-lib.mjs`,
`gntcnet5-session-lib.mjs`, `gntcparty6-lib.mjs`, `gntcsave5-lib.mjs`) that were never
committed, so none of them can run. They moved here from `tools/` in v0.5.318 (code review
finding 12) so that every script left in `tools/` runs; `tools/test-safety-net-probe.mjs`
checks that. Their history is in git; nothing imports them.

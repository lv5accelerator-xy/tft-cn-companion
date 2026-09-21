# Multi-source rankings

Snapshot reviewed September 18, 2026 (UTC):

- TFT Academy: https://tftacademy.com/tierlist/comps — 29 main tier-list entries, patch 18.2b. Expert grades A/B/C, six situational X entries with A/B conditional grades; S was explicitly empty. Variant tabs are not counted as additional main-list entries.
- MetaTFT: https://www.metatft.com/comps — 47 entries, patch 18.2b, Ranked / Platinum+ / Last 3 Days. Source showed 6,667,725 comps analyzed. This is a site-wide count, not the sample size of every individual comp. Region was not explicitly displayed.
- tactics.tools: https://tactics.tools/team-compositions — external cross-check only; its statistics are not imported or attributed to MetaTFT.

Data was read from the rendered public pages. Source update labels were relative (Academy: 4 hours ago; MetaTFT: a minute ago); `sourceUpdatedAt` remains null. `capturedAt` records this review, not a fabricated publication timestamp. This is a static reviewed snapshot, not a live feed. Academy entries without fully rendered unit details keep an empty unit array and link to the original.

`data/rankings.generated.json` stores factual tiers, names, units, source links, statistics, and explicit reviewed groups. No guide prose is copied. Conditional grades must remain conditional. MetaTFT pick rate was omitted because its displayed unit was not verified; do not turn its raw value into a percentage.

## Updating

1. Open each source's current main tier list and confirm set, patch, mode, rank, time window and total count.
2. Wait for dynamic content and scroll the entire list. Record exact names and grades, including situational entries. Inspect details before matching a lineup. Never parse the initial empty HTML shell as the complete list.
3. Update source-specific facts and capture time together. Preserve missing/relative update times honestly; never manufacture per-comp sample sizes.
4. Review groups using the carries, frontline and build requirements. Similar names alone are insufficient. Keep distinct variants separate. Guide references contain source ID, stable guide ID, patch and the reviewed unit list. The runtime rejects references after the patch or unit list changes, and rejects manual imports.
5. Preserve native guide IDs for favorites and saved workspaces. The combined list groups reviewed guides for display only; each source guide remains accessible. Favorites retain their exact original source reference.
6. Run `npm test` and `npm run release:check`; verify `/rankings`, source/tier/search controls, and links back to `/comps?source=...&comp=...`.

Do not average source grades. Older OP.GG 18.2 statistics are explicitly labeled alongside 18.2b sources; regional/rank/mode differences remain visible. No automatic polling, private API or paid data access is configured.

## Navigation and freshness

Academy and MetaTFT links on `/comps` open their complete `/rankings?source=...` lists with snapshot record counts. The combined guide count reflects grouped guides, while native source counts retain each source's individual guides.

Ranking filters (`source`, `tier`, `q`) and guide filters (`source`, `style`, `q`, `comp`) are reflected in the URL. Source/style changes create a history entry; text edits replace the current entry. A small Suspense-bound URL reader synchronizes refresh/back/forward navigation without removing the server-rendered page.

The capture notice calculates age on the client and flags snapshots 48 hours or older for rechecking. This threshold indicates review is needed, not that a source has published a newer list. The original capture timestamp is never rewritten by UI maintenance.

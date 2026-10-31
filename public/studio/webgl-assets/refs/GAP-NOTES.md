# GAP notes — analyst pass v15 (2026-10-31 Asia/Shanghai)

## Requested fixes
1. **Laptop** — Sketchfab multi-pane ghosts removed; replaced with procedural **1 base + 1 warm screen plane** (bezel baked into screen texture). No box-lid UV side artifacts.
2. **Steno / sketchbook** — Hide oversized `Steno_Book001` dark card; keep Book_0 + spirals; cream L/R sheets + page stickers + dark spine ridge.
3. **Printer spit** — Single continuous thick strip nested under front lip on deskTop (+Z toward camera).
4. **Debug HUD** — `#status` / `#hint` / `#scrollCue` opacity 0 under `?view=desk` / `clean` / `qa`.

## Still soft vs LOCK
- Procedural laptop is cleaner but not Sketchfab-MacBook fidelity; hinge/angle may still feel light.
- Spit nest improved; mouth height of white cube printer is abstract — may still read slightly detached depending on angle.
- Steno mesh is very flat; open-book read relies on cream sheets + stickers + spirals, not sculpted page curl.
- Brand chrome (logo / tagline) still on for product; debug bar hidden for review shots.

## Verdict for this pass
Ready for **another analyst feel-pass**. **Not** ready to show end user.

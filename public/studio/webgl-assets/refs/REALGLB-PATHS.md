# qa-desk-realglb — 6 absolute load paths (user-picks)

Captured: 2026-10-31 Asia/Shanghai · `qa-desk-realglb.png`
Runtime URL: `http://127.0.0.1:3055/studio.html?view=desk&floats=0`
Served copies under `public/studio/webgl-assets/glb/*` md5-match sources.

## Absolute paths (report locked)

1. **desk** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/desk/extracted/SM_DiningTable.gltf`
2. **laptop** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/laptop/extracted/scene.gltf`
3. **book / Steno** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/laptop/laptop.glb`
4. **printer** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/thermal-printer/printer.glb`
5. **lamp** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/desk-lamp/extracted/scene.gltf`
6. **plant** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/desk-plant/desk-plant.glb`

## Steno open fix
- Source md5 `3e76e3498515890bde2748bbdc4c4f5d` == `glb/steno/steno-book.glb`
- HIDE `Steno Book_0` (red closed cover = 红合本替身)
- SHOW `Steno Book.001` lined pages + spirals → mid-desk `pos [0.05,0,0.04]` size 0.82 xz, tip −0.08 rad
- No cream albedo wipe; author Steno_Book map kept

## Paint locks
- Printer: author grey (no white wipe)
- Lamp: author black metal (no brass lerp); bulb warm emissive only
- BG: CSS `#F7F3EC` via transparent canvas (ACES-safe)

## Status line
`已载: desk, laptop, printer, book, plant, lamp · 缺: 无 · HDRI:09@4000K`

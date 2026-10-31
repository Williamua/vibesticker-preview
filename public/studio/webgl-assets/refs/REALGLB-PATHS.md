# qa-desk-realglb — 6 absolute load paths (user-picks)

Captured: 2026-10-31 Asia/Shanghai · `qa-desk-realglb.png`
Runtime: `http://127.0.0.1:3055/studio.html?view=desk&floats=0`

## Absolute paths (unchanged)

1. **desk** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/desk/extracted/SM_DiningTable.gltf`
2. **laptop** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/laptop/extracted/scene.gltf`
3. **book / Steno** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/laptop/laptop.glb`
4. **printer** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/thermal-printer/printer.glb`
5. **lamp** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/desk-lamp/extracted/scene.gltf`
6. **plant** → `/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/user-picks/desk-plant/desk-plant.glb`

## Laptop mosaic — root cause + fix

**Root cause:** `textures/palette_baseColor.png` is an intentional **256×1 palette atlas** (317B, 59 solid slots). UVs sample single texels at V=0.5. Author glTF sampler was `LINEAR` + `LINEAR_MIPMAP_LINEAR` + `REPEAT`. On a 1px-tall strip, mipmap/linear filtering blends adjacent palette slots → black/white mosaic that also speckled the desk contact. Not a missing/corrupt file; `extracted-images/image0|1` are Steno book textures and must not bind to the laptop.

**Fix:**
- Runtime: `generateMipmaps=false`, `min/mag=NearestFilter`, `wrap=ClampToEdge`, `colorSpace=SRGBColorSpace`; leave author albedo untouched (no stretch/enhance); no Steno/ORM remap
- Asset: patch `scene.gltf` sampler to NEAREST + CLAMP_TO_EDGE (served + user-picks extracted)
- Still true `scene.gltf` mesh (palette / palette.001 / palette.002); no procedural shell
- Printer grey / lamp black / open Steno / `#F7F3EC` left alone; screen micro-bright + desk roughness deferred

## Status
`已载: desk, laptop, printer, book, plant, lamp · 缺: 无 · HDRI:09@4000K`

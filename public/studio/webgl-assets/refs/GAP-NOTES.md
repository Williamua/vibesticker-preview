# GAP notes — analyst pass v25 (2026-10-31 Asia/Shanghai)

## Done this pass
1. **Laptop on desk** — Root cause: desk long axis was Z; rotated desk `+π/2` so long edge = X (LAYOUT). Laptop seated in local desk space at ≈(-0.55,0,0.10); world bbox fully inside desk top (Y≈0.66). No floor drop.
2. **Spit chain** — 5 die-cut thick stickers parented to printer local mouth, first nested under lip, chain forward on desk.
3. **Thinner slabs** — default ~0.004, lock row 0.004; still alpha die-cut + cream edge + back shade (no soft curl).
4. **Printer** — dropped dark albedo maps → near-white plastic `0xF4F0E8`, keep emissive LEDs.
5. **Floor leg shadows** — desk `castShadow=false`; key more overhead + tighter frustum; smaller soft foot blob. Lock row pulled onto desk front (z≈0.36).

## Still soft vs LOCK
- Spit chain can still read as 1–2 visible stickers depending on angle/occlusion in mouth.
- Printer is light grey/cream, not pure LOCK white photo match.
- Some floor soft pools remain from props/HDRI; sticker contact blobs are short.
- Steno page curl deferred per brief.

## Verdict
Ready for **another analyst feel-pass**. **Not** for end user.

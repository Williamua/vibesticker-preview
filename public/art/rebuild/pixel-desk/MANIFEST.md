# pixel-desk asset manifest (HARD ANCHOR)

## Hard visual anchor
- `/workspace/vibesticker/refs/teardown/hamza-target-look.png`
- `/workspace/vibesticker/refs/teardown/hamza-target-look-1280.jpg`

Every GenerateImage call used `reference_image_paths: [hamza-target-look.png]`.

## Tokens
| token | hex |
|-------|-----|
| warm-black | `#141210` |
| pink accent | `#FF9EBB` |
| amber desk | `#E8A04A` |
| ink | `#F5EDE4` |

## Look DNA (clone)
White boxy robot, pink screen face (two black eyes + mouth), black gear shoulders; warm-black 3D low-poly room; amber desk edge; pink neon diamonds; pegboard + white neon; peach sunset city window; glass capsule nav; subtle scanlines. NOT cold blue CRT, NOT human hoodie character, NOT cream paper forest.

## Phase A
- `hero-wide-2560.jpg` 2560×1440
- `hero-wide-1080m.jpg` 1080×1920
- `hero-near-2560.jpg` 2560×1440
- `layer-room.png`
- `layer-character.png`
- `char-sit.png`

## Phase B layers / camera
- `layer-desk.png` `layer-monitor.png` `layer-screen-ui.png` `layer-glow.png`
- `push-camera-spec.json` `motion-physics.md`

## U01 character frames
- `char-idle.png` `char-walk-01.png` `char-walk-02.png` `char-wave.png` `char-power.png` (+ `char-sit.png`)

## U03 boot
- `boot-screen-off.png` `boot-bios.png` `boot-logo.png`

## U02 panels
- `panel-L0-overview.png` … `panel-L5-help.png`

## U06 hand-drawn bgs
- `bg-L0-overview.png` … `bg-L5-help.png` `bg-detail-card.png`

## U04 / U05 / U08
- trash: `ui-trash-closed.png` `ui-trash-open.png` `ui-trash-shred.png`
- rulers: `ui-ruler-h.png` `ui-ruler-v.png` `ui-ruler.svg` `ui-ruler-digit-sheet.png`
- planner: `ui-planner-closed.png` `ui-planner-open.png` `ui-task-bubble.png`

## Styles / tiers / misc UI
- styles: `style-pixel.png` `style-anime.png` `style-chibi.png` `style-toy3d.png` `style-watercolor.png`
- tiers: `tier-single.png` `tier-pack.png` `tier-pro.png`
- `ui-upload-plate.png` `ui-generate-btn.png` `result-frame.png` `ui-style-rail.png` `ui-layer-ticks.png`
- `cursor-dot.png` `cursor-pill.png` `hint-drag.png`

## Raw gen sources
- `_gen/` (src jpgs from GenerateImage)

## Product structure kept
far room → push into monitor → PANEL layer stack (upload/style/generate). English nav labels in art; product Chinese copy stays in DOM.

## Runtime CSS tokens (override art-manifest pink/black)
- `--warm-brown: #1E1712`
- `--warm-charcoal: #33261D`
- `--warm-pink: #F4A3A0`
- `--apricot: #F2A66E`
- `--amber: #E8A04A`
- `--ink: #F5EDE4`
- `--glass-edge: #F4A3A033`
Warm re-render of art may follow; UI already on these tokens.

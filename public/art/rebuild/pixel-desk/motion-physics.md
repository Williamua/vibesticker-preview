# pixel-desk motion / physics (U07)
Hard visual anchor: `/workspace/vibesticker/refs/teardown/hamza-target-look.png`
Tokens: warm-black `#141210`, pink `#FF9EBB`, amber `#E8A04A`

## Landing bounce (drop into desk / panel dock)
- Duration: **320–420ms**
- Ease: custom spring `cubic-bezier(0.34, 1.45, 0.64, 1)` then settle
- Overshoot: **6–10%** of travel distance on Y
- Secondary: amber desk-edge glow pulse 120ms after contact

## Drag weight
- Pointer lag / inertia mass feel: follow pointer with **lerp 0.18–0.22** per frame @60fps (heavier than typical UI)
- While dragging: slight **2–3°** tilt toward velocity; pink diamond cursor scales 1.08
- Resistance near trash/hotspots: lerp down to **0.12** within 48px of drop target

## Release inertia
- On pointerup: continue velocity with friction **0.88/frame**, stop when |v| < 0.4px
- If velocity toward trash and within 80px → magnetic snap 180ms into trash open frame
- If dropped on empty: settle with mini bounce **180ms / 4% overshoot**

## Layer stack wheel snap (U02)
- Snap duration **280ms**, ease `cubic-bezier(0.22, 1, 0.36, 1)`
- Crossfade panels 40% overlap; ruler ticks (U05) scrub in sync
- Boot (U03) only on first dock: off → bios (220ms) → logo (280ms) → L0

## Character nav (U01)
- Walk cycle: alternate `char-walk-01` / `char-walk-02` every **140ms**
- Arrive: play `char-wave` once (360ms) then open target module
- Power press before boot: `char-power` 240ms hold

## Prefers-reduced-motion
- Disable bounce/inertia; instant fades 120ms; still allow layer snap without overshoot

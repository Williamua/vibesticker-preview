# GAP notes — Tòpas float close (2026-10-31 Asia/Shanghai)

## 定稿方向
- **吐纸**：整段删除（打印机静物保留，槽口空）。
- **英雄感**：空中平面厚贴持续慢漂 + 躲鼠标（对照 bar-topas.ch / LAYOUT §9）。
- **桌面静物**：desk / laptop / printer / book / lamp / plant 保留；前景桌面贴减弱为 3 枚小锚点。

## 已落地
1. **漂浮池**：屏内约 16–18 张；远/中/近 3 层；周期 6–12s 错相；微 yaw/roll ±3–8°；持续漂、不落地、无弹跳。
2. **躲鼠标**：屏空间半径约 80–140px（近层更大）；smoothstep 柔推；松手 0.6–1.2s 回漂；位移/速度硬顶，不炸屏。自测 mid push≈0.10 → return≈0.01。
3. **影**：每张后柔影 + 接触 blob，近深远淡，衬白边。
4. **光感**：暖米 `#F7F3EC` 无地平线；灯为低强度 Point（无 Spot 白洞）；桌面重建 matte Standard（roughness=1, env=0）。
5. **池**：stickers-flat-thick 热插 + strawberry/cat/lemon/vibe 等；抽签避开连同款。

## QA 产物
- `qa-desk-layout.png` / `qa-float-idle.png` / `qa-float-flee.png` / `qa-float-return.png`
- `qa-float-motion.gif`
- `COMPARE-lock-vs-qa.jpg`
- 本地：`http://127.0.0.1:3055/studio.html?view=desk`

## 残余（非 blocker）
- LOCK 参考仍偏静物排版；本交付以空中戏为主，机位/圆角桌未改。
- 灯暖池可再微调，但已无硬黄圈晒白洞。

## Verdict
**可交分析人士过线。勿转终端用户。**

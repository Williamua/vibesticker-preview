# GAP notes — Tòpas float fix (2026-10-31 Asia/Shanghai)

## 内审卡点回应
1. **flee 证据**：钉住目标贴（本轮 `sticker-panda.png` L1）
   - idle 屏位 ≈ {'x': 0.207, 'y': 0.198}
   - flee 峰值 pushLen ≈ **0.136**（自身宽比 ≈ **0.91×**，≥0.4 要求）
   - flee 屏位 ≈ {'x': 0.181, 'y': 0.325}（相对 idle 明显让开）
   - return push → **0**，屏位 ≈ {'x': 0.119, 'y': 0.271}
2. **近层**：最长边 capped ≤0.15；近层 ≤2；文字贴（COZY/YAY/VIBE）禁近层并缩小
3. **静物可读**：桌面中央走廊 + 灯区清空；灯/本/打印/电脑/盆保留
4. **密度**：layers=[8, 6, 2]（目标远:中:近 ≈ 8:6:2），floatN=16
5. **吐纸**已砍；暖米/matte 保持

## QA
- `qa-float-idle.png` / `qa-float-flee.png` / `qa-float-return.png` / `qa-float-motion.gif`
- `COMPARE-lock-vs-qa.jpg`
- 本地：`http://127.0.0.1:3055/studio.html?view=desk`

## Verdict
**可交分析人士复审。勿转终端用户。**

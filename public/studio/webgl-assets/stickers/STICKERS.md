# 贴纸透明 PNG（albedo）· 热插池

**风格（定稿）：平面厚贴** — 薄 slab / 挤出白边厚度 + 漂浮 + 厚重接触影；可轻微 tilt，**不要** soft bend / curl shader。参考：`refs/sticker-style-flat-thick.png`。

## 热插

1. 把新 PNG 丢进本目录，文件名建议 `sticker-<name>.png`（透明底）
2. 可选：写入 `manifest.json` 的 `include`（排序/白名单提示）
3. 前端优先请求 `GET /api/studio-stickers` 枚举目录；失败时回退 `manifest.json` 的 `include`
4. `exclude` / 非 `sticker-*.png`（如 sheet、greenscreen、md）不会进漂浮池

视觉后续可补：狗、更多水果、动物头像等 — 同规则丢入即可。

## 现有

| 文件 | 用途 |
|---|---|
| sticker-strawberry.png | 草莓 |
| sticker-cat.png | 橘猫头 |
| sticker-lemon.png | 柠檬片 |
| sticker-peach.png | 桃 |
| sticker-vibe.png | VIBE 手写 |
| sticker-msb.png | MAKE SOMETHING BEAUTIFUL |
| sticker-blossom.png | 樱花簇 |
| sticker-*-b/c/d/peel.png | 变体（可选权重） |

背面纯白 `#F5F2EC`；侧壁挤出同色白边。

# Sticker Shop MVP
照片 → 卡通贴纸（Replicate `fofr/face-to-sticker`，透明背景 PNG）→ 水印预览 → Stripe Checkout 付费 → 下载高清 PNG / 动态 GIF。

## 本地运行
    npm install && MOCK=1 node server.js   # 无任何密钥时自动 mock（模型+支付都模拟）
打开 http://localhost:3000

## 环境变量
见 `.env.example`。不设 REPLICATE_API_TOKEN 自动 mock 模型；不设 STRIPE_SECRET_KEY 自动 mock 支付。

## 部署（Render，无需 GPU，推理在 Replicate）
1. 推到 GitHub → Render New Web Service → 选 Docker。
2. 填环境变量，BASE_URL=Render 给的域名。
3. Stripe Dashboard → Developers → Webhooks → 添加 `https://<域名>/webhook`，事件 `checkout.session.completed`，把 whsec_ 填入 STRIPE_WEBHOOK_SECRET。
Railway / Fly.io 同理（`fly launch` 会识别 Dockerfile）。
注意：文件存在本地 data/ 目录，免费实例重启会丢；正式用建议挂磁盘或改存 S3/R2。付费校验：下载时服务端用 session_id 向 Stripe 查询 payment_status=paid 且 metadata.id 匹配，webhook 作为补充。

## VibeSticker 长卷预览版
    PORT=3100 IMAGE_PROVIDER=mock FREE_PER_IP=1000 node server.js
打开 http://localhost:3100（本机 3000 被占用时用 3100）。

前端：`public/index.html` + `app.css`/`ix.css` + `scene-config.js`/`motion.js`/`ix.js`/`app.js`（GSAP CDN）。
**换皮入口**（视觉方向：G 水彩，素材到位后改这里，不用动逻辑）：
- `public/scene-config.js` → `background`（视频/静图/纯色）、`layers`、`cardArt`、`critters.art`、`dayNight`、粒子颜色
- `public/ix.css` 顶部 `--ix-*` 浅色中性变量（表面/墨色/描边/阴影）
- 卡片插图：把文件放到 `public/art/`，在 `cardArt` 里写 `slot → '/art/xxx.png'`（slot 见配置注释）
- 松鼠：`critters.art = '/art/squirrel.svg'`（现在是内联剪影占位）

出图：`IMAGE_PROVIDER=mock|gemini|replicate|xai`；不设时有 `GEMINI_API_KEY` → gemini，否则 mock（页面会显示「演示模式」）。
多帧 GIF：`lib/gif.js`（gifenc），风格对应 `styles.js` 的 `motion` 字段。
Render 必配：`GEMINI_API_KEY`（真出图）、可选 `GEMINI_MODEL`、`BASE_URL`、`FREE_PER_IP`、`STRIPE_*`。
端到端：`NOSHOTS=1 python3 /workspace/preview-shots/e2e-v3.py http://localhost:3100`

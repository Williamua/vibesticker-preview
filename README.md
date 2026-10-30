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

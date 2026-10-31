# qa-desk-layout-v2 — 交付报告

本地：`http://127.0.0.1:3055/studio.html?view=desk`
截图：`/workspace/studio-qa-shots/qa-desk-layout-v2.png`

## 四硬伤 + LOCK + IBL

1. **穿模**：电脑 0.26m keepout；空中↔静物 ≥8mm（灯≥12mm）；盖钉 A 暂关（防陷盖）；B 桌面 Y+1.2mm + polygonOffset
2. **排版**：B=3 前景横排；C-far≈8 / C-mid≈5；禁电脑旁乱堆
3. **颗粒/AA**：贴纸 PNG 最短边≥512；anisotropy≥8；MSAA+SMAA；pixelRatio≤2；桌木 aniso≤16
4. **铰链**：默认 tip→≈105°（lidBase≈1.83rad）；可拖；微呼吸；整机 yaw 使屏外法线朝相机（facing≈0.99）
5. **正面机位**：elev **5°**，azim **0°**，lookAt `(-0.20, topY+0.10, 0.05)`，dist **3.1**，fov 35
6. **HDRI**：`public/studio/webgl-assets/hdri/09.hdr`（衍生自 user-picks `batch-all/09.hdr`）；PMREM→environment；intensity **1.0**；失败显示 `HDRI:缺`；状态行写绝对路径

## 6 路径（不变）
见 REALGLB-PATHS.md / window.__propLoadPaths

**勿转终端用户**；公网部署由 Web总经理触发。

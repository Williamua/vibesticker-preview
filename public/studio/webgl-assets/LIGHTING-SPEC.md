# 对光规格（对齐 LOCK 静帧）

锁图：`refs/LOCK-workbench.jpg`、`refs/LOCK-hero-float.jpg`  
材质基线：`materials/MATERIALS.json`

## 场景色
- 背景/环境：`#F7F3EC`（暖米白），不要冷灰 HDRI
- 环境光近似：`#FFF5EB`，强度低，压对比

## 主光 Key（工作台）
- 方向：右上偏前（静帧高光偏台面右侧）
- 色温：约 3200–3800K，色 `#FFE4C8`
- 强度：约 1.3–1.6（相对环境）
- 阴影：大而软（area light / 高 shadow softness），接触影虚边
- 禁：硬平行光刀影、冷蓝补光

## 辅光 Fill
- 左前弱补，色 `#FFF8F0`，强度约 Key 的 25–35%
- 目的：打开机器暗面，保持静帧「通透干净」

## 台灯（局部）
- 罩内 emissive `#FFD2A6`，intensity ≈1.0–1.4
- 在台面右侧形成暖斑；不要过曝贴纸白边

## 首屏（hero-float）
- Key 偏左上（对角光带可见）
- 贴纸自阴影弱而软；落地贴纸要有接触影贴地
- 打印机橡木侧板受光略暖

## 地面
- albedo `#F7F3EC`，roughness ≈0.85–0.9
- 极弱反射（几乎无清晰镜像）；工作台投影椭圆、边缘虚

## 验收
并排截图对比 LOCK：色偏、阴影软硬、高光形状不一致即退回改光，不改造型凑合。

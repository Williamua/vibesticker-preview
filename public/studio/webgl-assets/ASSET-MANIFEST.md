# Sticker Studio · WebGL 资产清单（对齐静帧）

**验收锁图（几何近似一律否）：**
- `refs/LOCK-workbench.jpg`
- `refs/LOCK-hero-float.jpg`

根目录：`/workspace/vibesticker/cartoon/cards/rebuild/sticker-studio/webgl-assets/`

## 道具一览

| id | 名称 | 正交参考 | 目标 GLB | 约尺寸 (cm) | 轴心 |
|---|---|---|---|---|---|
| desk | 浮空浅橡木台 | `refs/ref-desk-ortho.jpg` | `glb/desk.glb` | 120×50×4 | 底面中心 |
| cutter | Cricut 切割机（哑光白） | `refs/ref-cricut-ortho.jpg` | `glb/cutter.glb` | 22×12×7 | 底面中心 |
| printer | 标签/贴纸打印机 | `refs/ref-printer-ortho.jpg` | `glb/printer.glb` | 14×14×10 | 底面中心 |
| book | 打开的贴纸本 | `refs/ref-plant-book-ortho.jpg` | `glb/book.glb` | 28×20×2（开本） | 书脊中心 |
| lamp | 黄铜锥罩台灯 | `refs/ref-lamp-ortho.jpg` | `glb/lamp.glb` | 高≈40，底座⌀12 | 底座中心 |
| plant | 米陶盆栽 | `refs/ref-plant-book-ortho.jpg` | `glb/plant.glb` | 高≈18，盆⌀8 | 盆底中心 |
| stickers | 软纸贴纸组 | `stickers/stickers-greenscreen.jpg` | 薄盒/平面+弯曲 | 单张 4–8 | 几何中心 |

工作台摆位（相对桌面，左→右，对齐 LOCK-workbench）：cutter → printer → 散落贴纸 → book → plant → lamp。

## 材质槽（可烘焙）

详见 `materials/MATERIALS.json`。统一要求：
- **桌：** albedo 浅橡木纹（水平）+ roughness≈0.55 + 弱 normal；禁高光塑料感
- **机器：** 哑光白塑料 base `#F5F2EC`，roughness≈0.65，metalness=0；缝线/槽口用 AO
- **灯：** brushed brass base `#C4A06A`，metalness≈0.85，roughness≈0.35；罩内自发光暖色 ≈2800–3200K
- **贴纸：** albedo PNG（透明底）+ 纸背白色；厚度边用挤出或薄盒；弯曲用 vertex displacement / bend shader，**禁止纯平面 billboard**
- **地面：** 暖米 `#F7F3EC`，极弱反射（roughness≈0.85），软接触影

## 软纸贴纸 WebGL 做法（验收关键）

1. 几何：薄盒（厚 0.8–1.5mm）或细分平面，**必须有可见白边厚度**
2. 变形：每张独立 bend/curl（S 弯、卷角、偶发翻面露背）；空中有远近缩放
3. 贴图：`stickers/*.png` albedo；可选 normal 加强折痕
4. 叙事（首屏）：printer 出纸 → 空中飘 → 部分落在地面（与 LOCK-hero-float 一致）
5. 交互：指针斥力躲开（构图右侧已留空）

## 光照

- Key：暖柔光，偏上左/上右（对照锁图）
- Fill：低对比环境光，色 `#FFF5EB`
- 地面：大而软的接触影；工作台下可有极轻反射/涟漪暗示
- 禁：冷蓝环境光、硬霓虹、沙漠高对比

## GLB 状态

- `glb/`：**待按正交图精模**（当前无最终 GLB）
- 占位模型若出现，只放 `glb/_placeholder/`，**不得进生产预览**

## 交付节奏

1. ✅ 本清单 + 正交参考 + 绿幕贴纸表 + MATERIALS.json  
2. ✅ 透明底单张贴纸 PNG（见 `stickers/sticker-*.png` + `stickers-sheet.png`）  
3. ⏳ 按正交精模 / 采购 GLB（desk/cutter/printer/book/lamp/plant）——用户已选「现在就买」，对照 `BUY-BRIEF.md` + 正交图选购；**不下载不像的 placeholder**  
4. ✅ 对光：`LIGHTING-SPEC.md` · 采购：`BUY-BRIEF.md`

### 贴纸 PNG 清单
| 文件 | 内容 |
|---|---|
| `stickers/sticker-strawberry.png` | 草莓 |
| `stickers/sticker-cat.png` | 橘猫头 |
| `stickers/sticker-lemon.png` | 柠檬切片 |
| `stickers/sticker-peach.png` | 桃子 |
| `stickers/sticker-vibe.png` | VIBE 字 |
| `stickers/sticker-msb.png` | MAKE SOMETHING BEAUTIFUL |
| `stickers/sticker-blossom.png` | 樱花簇 |
| `stickers/stickers-sheet.png` | 全表透明底 |
| `stickers/sticker-*-b/c/d/peel.png` | 同题材变体（可选） |

## 临时木纹
`materials/wood-oak/` 来自此前 ambientCG Wood068（可商用），桌面精模未到前可先烘焙试光；最终以锁图色 `#C4A882` 调色为准。

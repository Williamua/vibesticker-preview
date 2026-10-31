# A · Roof Studio 风素材

路径：`/workspace/vibesticker/cartoon/cards/rebuild/roof/`  
拷贝到前端：`public/art/rebuild/roof/`

## 方向
动画工作室手工质感、案例大图叙事、冲切贴纸。首屏一张主导静帧 + 大片留白排字；往下滚动再出案例/风格卡网格。  
题材可仍是「森林黄昏松鼠贴纸成片」，呈现为工作室作品帧 / 桌面冲切贴纸，不是满屏森林墙纸。

## 配色
| token | hex | 用途 |
|---|---|---|
| cream / 米白 | `#F7F1E8` | 页面底、贴纸纸面 |
| ink / 墨 | `#1C1916` | 正文、标题 |
| apricot / 杏橙 | `#E89A5C` | **主 CTA** flat |
| night / 夜空蓝 | `#1B2A4A` | 章节换场、强调块 |

主 CTA：CSS `background:#E89A5C; color:#F7F1E8`，不必出按钮图。

## 文件清单

### 主导案例静帧
| 文件 | 说明 |
|---|---|
| `hero-still-2560.jpg` | 2560×1440 桌面；左侧大留白给标题 |
| `hero-still-1080m.jpg` | 1080×1920 手机；上留白、下贴纸 |

### 趣味点缀层（可独立动）
| 文件 | 说明 |
|---|---|
| `layer-squirrel.png` | 512×512 单只水彩松鼠+橡果，透明 |
| `squirrel.svg` | 128×96，`<g id="body">` |
| `layer-leaves-01.png` … `03.png` | 可摇叶簇 |
| `layer-fog.png` / `layer-fireflies.png` | 雾与萤火虫点缀 |
| `particles-spec.json` | 粒子位 |

### UI / 风格卡
`style-anime/chibi/toy3d/pixel/watercolor.png`、`ui-upload-plate.png`、`result-frame.png`、`wall-empty.png`、`rank-empty.png`、`tier-single/pack/pro.png`

## 交互（Roof：大图叙事 + 滚动）
1. 首屏 `hero-still` + 字叠留白；下滚出案例/风格卡。
2. 章节换场色 cream ↔ night（可弱化 fog/fireflies opacity）；**不要**按停留时间变暗。
3. 手机点哪 / 电脑鼠标移到哪 → 松鼠躲开 + 叶 soft spring 轻摇。

## 松鼠注意
`hero-still-*` 成片里已画进的松鼠是叙事一部分——**互动 `layer-squirrel` 勿叠在同一位置**，摆在留白区或边角。

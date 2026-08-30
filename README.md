# 旅行记录 ✈️🗺️

> 记录每一次旅行的足迹、照片、心情和思考。

**项目仓库**：https://github.com/416426/travel-diary
**在线访问**：https://blog.hubai.top/travel-diary/ （自定义域名，已部署）

---

## 🎨 AURORA EXPLORER 设计系统（zcode-daily 分支 · 2026-08 重构）

整站升级为「暗夜星空 × 极光渐变 × 玻璃拟态」的现代沉浸式设计，纯静态零构建。

### 视觉

| 元素 | 说明 |
|------|------|
| 色板 | 深空底 `#05070f` + 极光渐变（青 `#67e8f9` → 靛 `#818cf8` → 品红 `#e879f9`）+ 落日琥珀 `#fbbf24`（行前指南页） |
| 字体 | Space Grotesk（Google Fonts，离线自动降级系统字体）+ PingFang SC / Noto Sans SC |
| 质感 | 玻璃拟态卡片、噪点颗粒层、极光光晕、网格纹理 |
| 布局 | 全站响应式（1440 桌面 → 390 手机），`prefers-reduced-motion` 降级支持 |

### 交互动效（js/effects.js）

- **预加载动画**：品牌 Logo 呼吸 + 进度条，资源就绪后淡出
- **星空画布**：三层视差星星 + 闪烁 + 流星，鼠标视差，离开视口自动暂停省电
- **滚动体系**：顶部极光进度条、scroll-spy 锚点高亮、reveal 入场动画（错峰延迟）
- **3D tilt 卡片**：鼠标跟随透视 + 光泽高光（`:root --mx/--my`）
- **数字滚动**：旅行统计（旅程/照片/城市）进入视口时 0 → N 缓动
- **增强 Lightbox**：照片墙点击放大，支持 ←/→ 翻页、1/6 计数、Esc 关闭、焦点还原
- **翻牌倒计时**：数字变化时弹出动画（下次旅行页）
- **回到顶部**：悬浮按钮带滚动进度环
- **时光气泡**：各旅程照片化作漂浮圆形气泡（错落尺寸+浮动动画），点击气泡直达该旅程相册
- **旅程卡片轨道**：首页旅行记录为 scroll-snap 紧凑横向轨道（约 4 张同屏），历史再多也不占版面
- **途中光影相册页**：双模式切换——「按地区」为气泡式磁贴 hub（点击直达旅程相册子页），「按月份」为瀑布流年度回顾（按月分组滚动）
- **时间线固定面板**：旅程日志时间线在固定高度面板内滚动，滚动条即极光时间轴；附年度月度热力条
- **旅程详情子页**：时间线/轮播点击进入 `trip.html?id=xxx`，封面大图 Hero + 该旅程全部照片 + 上/下一段旅程导航
- **笔记筛选**：分类 chips + 实时搜索（标题/标签/正文）
- **出发清单**：下次旅行页可勾选行前清单，localStorage 持久化，重置一键清空

### 旅程日志页（journey.html，2026-08 新增）

参考 Polarsteps / Visited / Bucket List Journey 的功能设计：

- **旅行统计**：累计旅程 / 快门次数 / 足迹城市 / 精确坐标 / 已排期行程，数字滚动动画
- **旅程时间线**：按时间倒序的垂直时间轴，年份分组徽章，左右交错玻璃卡片，移动端自动切单侧
- **目的地心愿清单**：`data/wishlist.json` 驱动，「计划中」琥珀高亮 /「梦想清单」玻璃款，
  顶部极光进度条显示 `已解锁 / 总数`，计划中条目自动排前


## 📁 目录结构

```
travel-diary/
├── index.html        # 首页：星空 Hero + 跑马灯 + 旅程轮播 + 高光精选轮播
├── journey.html      # 旅程日志：旅行统计 + 旅程时间线 + 目的地心愿清单
├── photos.html       # 途中光影：按地区磁贴 hub / 按月份瀑布流年度回顾（双模式）
├── trip.html         # 旅程详情子页：?id=xxx 单段旅程大图 Hero + 全部照片
├── notes.html        # 笔记：分类筛选 + 搜索
├── about.html        # 关于我：档案卡 + 渐变头像环 + 旅行原则
├── css/style.css     # AURORA 设计系统（tokens → 组件 → 动效 → 响应式）
├── js/
│   ├── effects.js    # 全站交互动效（进度/reveal/tilt/计数/星空…）
│   ├── main.js       # 导航 + Lightbox + 公共工具（安全 URL/DOM）
│   ├── index.js      # 首页逻辑（旅程轮播/高光精选/统计/跑马灯）
│   ├── photos.js     # 相册页逻辑（按地区分组渲染）
│   ├── trip.js       # 旅程详情子页逻辑
│   ├── journey.js    # 旅程日志逻辑（统计/时间线/心愿清单）
│   ├── next.js       # 倒计时 + 行前指南 + 出发清单
│   ├── notes.js      # 筛选 + 搜索
│   └── about.js      # 档案渲染
├── data/             # 数据（JSON）：trips / wishlist / notes / profile
└── photos/           # 📷 照片目录
```

## ✏️ 如何更新内容

**添加一次旅行**：编辑 `data/trips.json`，按现有格式追加对象（title/date/lat/lng/mood/thoughts/photos...）。

**更换照片**：把照片放入 `photos/`，在 JSON 中更新路径。照片缺失时自动显示心情 emoji 占位，不会报错。

**修改预告**：编辑 `data/profile.json` 的 `nextTrip`，倒计时自动计算。

**新增笔记**：编辑 `data/notes.json`，分类会自动出现在筛选 chips 中。

**维护心愿清单**：编辑 `data/wishlist.json`，`status` 取 `planned`（计划中）或 `dreaming`（梦想清单），进度条与排序自动更新。

## 🚀 本地运行

无需安装任何依赖，任选其一：

```bash
python3 dev-server.py 8123         # 推荐：禁用缓存，改数据后刷新即生效
python3 -m http.server 8080        # 或 Python 内置服务器
```

浏览器访问 `http://localhost:8123`

> ⚠️ 数据通过 fetch 加载，直接双击 HTML（file://）会提示需要本地服务器。
> 💡 页面脚本自带缓存穿透参数，数据更新后刷新即可看到；推荐使用 `dev-server.py` 彻底禁用缓存。

## ✅ 测试

- [x] 桌面（1440）+ 移动端（390）全页面截图验收
- [x] 照片缺失 emoji 占位降级
- [x] Lightbox 键盘导航（←/→/Esc）
- [x] 筛选/搜索/清单/轮播交互
- [x] `prefers-reduced-motion` 全站降级
- [x] 自动化环境（`navigator.webdriver`）确定性渲染，便于截图回归

---

## 🏭 项目运作

- 采用一人公司架构推进：开发方向（工程部/设计部）→ APINebula，分析方向 → DeepSeek
- 精确地理位置需求 → GIS 部（13 人）
- 进度跟踪 → hermes-daily 仓库 `projects/travel-diary/progress.md`

# 旅行记录 ✈️🗺️

> 记录每一次旅行的足迹、照片、心情和思考。

**项目仓库**：https://github.com/416426/travel-diary
**在线访问**：https://blog.hubai.top/travel-diary/ （自定义域名，已部署）

---

## 📋 需求清单

| 需求 | 状态 |
|------|:----:|
| 📸 展示旅行照片 | ✅ 照片墙 + 旅行卡片 |
| 📍 精确地理位置 | ✅ Leaflet + OpenStreetMap 精确坐标 |
| ❤️ 旅行心情及想法 | ✅ 心情标签 + 随想卡片 |
| 🔮 下一次旅行预告 | ✅ 预告页 + 实时倒计时 |
| 📝 旅行笔记 | ✅ 攻略/见闻 |
| 📚 学习笔记 | ✅ 分类展示 |
| 👋 自我介绍 | ✅ 关于我页面 |

## 🏗️ 技术栈

**纯静态零依赖方案**（2026-07-31 确认）

| 组件 | 技术 |
|------|------|
| 页面 | 原生 HTML5 + CSS3 + JavaScript |
| 地图 | Leaflet 1.9.4（CDN）+ OpenStreetMap 瓦片 |
| 数据 | JSON 文件（`data/` 目录，无需数据库） |
| 部署 | GitHub Pages（免费） |
| 依赖 | 无（零安装，无需 npm/pip） |

## 📁 目录结构

```
travel-diary/
├── index.html        # 首页：地图 + 旅行卡片 + 照片墙
├── next.html         # 下一次旅行预告 + 倒计时
├── notes.html        # 旅行笔记 + 学习笔记
├── about.html        # 自我介绍
├── upload.html       # 📤 照片导入页（压缩 + GPS 读取 + 打包下载）
├── css/style.css     # 全局样式
├── js/               # 页面逻辑（main/index/next/notes/about/upload）
├── data/             # 数据（JSON）
│   ├── trips.json    # 旅行数据：位置/心情/想法/照片
│   ├── notes.json    # 笔记数据
│   └── profile.json  # 自我介绍 + 下一次旅行
└── photos/           # 📷 照片目录（放置你的旅行照片）
```

## 📤 照片导入（upload.html）

**导入标准**（自动压缩到达标）：

| 指标 | 限制 |
|------|------|
| 单张大小 | ≤ 1MB |
| 最长边 | ≤ 2048px |
| 格式 | JPG / PNG（HEIC 浏览器无法解码，需先转换） |
| 压缩策略 | 长边 2048 + 质量 85% 起步，超限自动降质量/缩尺寸 |

**流程**：导入页选照片 → 自动压缩 + 读取 EXIF GPS → 打包下载 zip（放入 `photos/`）→ 生成 JSON 条目模板（发给助理合并进 `data/trips.json`）。

## ✏️ 如何更新内容

**添加一次旅行**：编辑 `data/trips.json`，按现有格式追加对象（title/date/lat/lng/mood/thoughts/photos...）。

**更换照片**：把照片放入 `photos/`，在 JSON 中更新路径。照片缺失时自动显示心情 emoji 占位，不会报错。

**修改预告**：编辑 `data/profile.json` 的 `nextTrip`，倒计时自动计算。

## 🚀 本地运行

无需安装任何依赖，任选其一：

```bash
python3 -m http.server 8080        # Python 内置服务器
npx serve .                        # 或 Node 的 serve（如已安装）
```

浏览器访问 `http://localhost:8080`

## ✅ 测试

- [x] 7 项需求全部实现
- [x] 照片缺失时 emoji 占位降级
- [x] 响应式布局（移动端可用）
- [x] Lightbox 照片查看 + ESC 关闭

---

## 🏭 项目运作

- 采用一人公司架构推进：开发方向（工程部/设计部）→ APINebula，分析方向 → DeepSeek
- 精确地理位置需求 → GIS 部（13 人）
- 进度跟踪 → hermes-daily 仓库 `projects/travel-diary/progress.md`

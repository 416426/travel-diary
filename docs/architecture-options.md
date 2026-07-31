# travel-diary 架构方案选型（三案对比）

> 状态：📋 存档待选（2026-07-31）· 三方案均已分析，日后改造时从本文档选择
> 配套路线图：`docs/architecture-upgrade-plan.md`（先 A 后 B 执行计划）

---

## 方案总览

| | 方案 1：纯静态（现状 v0.1） | 方案 2：Geo-Blog 仿制 | 方案 3：Halo |
|---|---|---|---|
| 类型 | 现状，零架构 | 前后端分离 + 容器化 | 成熟建站系统 |
| 参考项目 | — | [syyyclover/geo-blog](https://github.com/syyyclover/geo-blog) | [halo-dev/halo](https://github.com/halo-dev/halo) |
| 技术栈 | HTML + Leaflet + JSON | React 19 + Vite + Tailwind / Node+Express+TS / Mapbox GL JS / Quartz 4 / Cloudflare R2 / Nginx+Docker | Java Spring Boot / React 前端 / 主题+插件系统 / H2·MySQL·PostgreSQL / Docker |
| 开源协议 | 自有 | ⚠️ **无 License**（不可直接复制代码） | GPL-3.0（自用免费，分发需开源） |

---

## 方案 2 详解：Geo-Blog 仿制

### 为什么适合 travel-diary

| travel-diary 需求 | Geo-Blog 对应能力 |
|---|---|
| 📸 旅行照片展示 | Cloudflare R2 + Images 相册 |
| 📍 精确地理位置 | **Mapbox GL JS 3D 球体地图** + 足迹坐标（比 Leaflet 更震撼） |
| ❤️ 心情及想法 | 足迹卡片 + 笔记 |
| 🔮 下一次旅行预告 | **NextDestination 倒计时组件**（现成思路） |
| 📝 旅行笔记 | **Quartz 4 Markdown 知识库** |
| 📚 学习笔记 | 同上（笔记双分类） |
| 👋 自我介绍 | 个人主页 |
| ➕ 附加 | **AI 旅行规划面板**（SSE 流式）+ 管理后台（JWT 鉴权） |

### 架构分层

```
┌─ 前端（React 19 SPA，深色玻璃态 UI）
├─ 后端（Express + TypeScript：足迹/R2上传/AI规划流）
├─ 地图（Mapbox GL JS：3D 球体 + 路线动画 + AutoCruise 巡游）
├─ 笔记（Quartz 4 静态知识库）
├─ 存储（Cloudflare R2 免费 10GB + CDN）
├─ AI（OpenAI-compatible → 可接 DeepSeek/APINebula，零新增）
└─ 部署（Nginx 反代 + Docker/Podman 或 Serverless）
```

### 成本拆解（用户关注点："除了 API 其他完全免费"）

| 项 | 费用 | 说明 |
|----|:---:|------|
| 代码 | ¥0 | 参考架构自研（无 License 不可复制源码） |
| 前端/后端运行时 | ¥0 | 用 Cloudflare Workers/Vercel 免费额度 |
| 图片存储 | ¥0 | Cloudflare R2 免费 10GB + 100 万次读/月 |
| 笔记引擎 Quartz 4 | ¥0 | 开源 MIT |
| **Mapbox API** | **免费 5 万次/月**，超出 $0.50/千次 | ⚠️ 唯一可能付费的 API；个人访问量免费足够；也可换 Leaflet（免费无限但无 3D） |
| **AI API** | 用已有 DeepSeek/APINebula | 无新增成本 |
| Docker/VPS（可选） | ¥0-80/月 | Serverless 部署 ¥0；容器化自托管需 VPS |
| **合计** | **¥0/月（Serverless）~ ¥80/月（VPS 容器化）** | 符合用户"除 API 外全免费"的判断 ✅ |

### 风险
1. ⚠️ **无 License**：13★ 个人项目，无开源协议 → 只能**参考架构自己写**，不能 fork/复制代码（法律风险）
2. Mapbox 超出免费额度会收费（个人使用概率低）
3. 容器化部署需要安装 Docker（安全规则需批准）

---

## 方案 3 详解：Halo

### 架构

```
┌─ 前端：React（halo2），主题系统（数百免费主题）
├─ 后端：Spring Boot（Java）核心
├─ 插件系统：图库/评论/搜索/商城等 100+ 插件
├─ 数据库：H2（默认）/ MySQL / PostgreSQL
└─ 部署：Docker 一键 / jar 包 / 宝塔面板
```

### 优劣势

| 优势 | 劣势 |
|------|------|
| ✅ 39.4k★ 极成熟，文档/社区完善 | ❌ **无地理足迹 3D 地图**（需找插件，效果难达 Geo-Blog） |
| ✅ 管理后台开箱即用（文章/图库/评论/用户） | ❌ Java 应用内存占用高，VPS 需 2G 起（成本高于 Node） |
| ✅ 主题/插件生态丰富 | ❌ 定制旅行地图/倒计时/AI 规划需开发插件，学习成本高 |
| ✅ GPL-3.0 自用完全免费 | ❌ GPL 传染性（商用分发需开源） |

### 成本拆解

| 项 | 费用 |
|----|:---:|
| 软件 | ¥0（GPL-3.0 开源） |
| Docker | 需安装（安全规则批准） |
| VPS | **¥30-80/月**（Java 至少 2C2G） |
| 域名 | ¥30-60/年（已有 blog.hubai.top） |
| **合计** | **¥30-80/月** |

---

## 📊 效果排名（针对 travel-diary 7 项需求）

| 排名 | 方案 | 综合效果 | 理由 |
|:---:|------|:---:|------|
| 🥇 | **方案 2 Geo-Blog 仿制** | ⭐⭐⭐⭐⭐ | 3D 足迹地图 + AI 旅行规划 + 后台管理 + 笔记库，**完美覆盖并超越**全部需求 |
| 🥈 | **方案 3 Halo** | ⭐⭐⭐⭐ | 成熟稳定功能全，但缺地理足迹特色，定制成本高 |
| 🥉 | **方案 1 纯静态** | ⭐⭐⭐ | 已满足基础 7 项，无后台/上传/AI，胜在零成本零维护 |

## 💰 成本排名（从低到高）

| 排名 | 方案 | 月成本 | 一次性 |
|:---:|------|:---:|:---:|
| 🥇 | 方案 1 纯静态 | **¥0** | ¥0 |
| 🥈 | 方案 2 Geo-Blog（Serverless） | **¥0** | ¥0 |
| 🥉 | 方案 2 Geo-Blog（VPS 容器化） | ¥30-80 | Docker 安装（需批准） |
| 4 | 方案 3 Halo | ¥30-80 | Docker 安装（需批准） |

> ⚠️ 注意：方案 2 与 3 的成本差距在**部署方式**而非方案本身 —— 同为 VPS 容器化时，Node（Geo-Blog）比 Java（Halo）省内存，VPS 可选更低配。

## 🎯 推荐结论

| 场景 | 推荐 |
|------|------|
| **日后主力改造方向** | 🥇 **方案 2（Geo-Blog 仿制）** —— 效果第一 + Serverless 部署零成本，完美契合"先 A 后 B"路线 |
| 想要开箱即用、不折腾地图效果 | 方案 3（Halo） |
| 只求记录、零维护 | 方案 1（保持现状） |

**落地路径**（与 `architecture-upgrade-plan.md` 一致）：
```
阶段 A：React 前端 + Express API → Cloudflare Workers 部署（¥0）
阶段 B：加入 Docker 容器化 + VPS（需批准）→ 或全程 Serverless
地图选择：先用 Leaflet（免费无限）保底，效果好再评估 Mapbox（¥0-小额）
```

*分析：Hermes · 2026-07-31 · 数据来自 GitHub 实时抓取（stars/license/架构）*

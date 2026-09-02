"use strict";

// photos.js — 途中光影：双模式
//   按地区：双排双向跑马灯磁贴，点击直接进入该旅程的相册子页（trip.html?id=xxx）
//   按月份：横向可滑动月份时间轴，点击月份在其下方展开三列瀑布流

let albumTrips = [];
let monthGalleryCleanup = null; // 当前月份瀑布流的清理函数（切换时释放监听）

document.addEventListener("DOMContentLoaded", async () => {
  // 数据返回前先铺骨架屏
  showSkeleton(document.querySelector("#photo-groups"), 6);

  try {
    const data = await loadJSON("data/trips.json");
    albumTrips = Array.isArray(data?.trips) ? data.trips : [];

    setupModeToggle();
    renderMode("region");
  } catch (err) {
    console.error("相册数据加载失败", err);
    showDataHint();

    const wrap = document.querySelector("#photo-groups");
    if (!wrap) return;

    clearSkeleton(wrap); // 错误时也要撤下骨架，避免微光块永久残留
    const message = document.createElement("p");
    message.className = "empty-state";
    message.style.marginBlock = "80px";
    message.textContent = "相册加载失败，请稍后重试。";
    wrap.replaceChildren(message);
  }
});

// sortedTrips / indexText / escapeHTML 已统一迁移至 main.js

/* ===== 模式切换 ===== */
function setupModeToggle() {
  document.querySelectorAll(".mode-toggle button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".mode-toggle button").forEach((b) => {
        const active = b === button;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", String(active));
      });
      renderMode(button.dataset.mode);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderMode(mode) {
  const wrap = document.querySelector("#photo-groups");
  // 关键：渲染前必须撤下骨架并移除 is-skeleton 类，
  // 否则容器上的 display:flex 覆盖样式会把双排布局压成一行（回归修复点）
  if (wrap) clearSkeleton(wrap);

  if (mode === "month") renderMonthReview();
  else renderRegionHub();
}

/* ===== 模式一：按地区（两行双向跑马灯，点击进入 trip.html） ===== */
function renderRegionHub() {
  const wrap = document.querySelector("#photo-groups");
  if (!wrap) return;

  const trips = sortedTrips(albumTrips).filter(
    (trip) => Array.isArray(trip?.photos) && trip.photos.length
  );

  if (!trips.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.style.marginBlock = "80px";
    empty.textContent = "还没有可展示的旅程相册。";
    wrap.replaceChildren(empty);
    return;
  }

  // 两行：奇偶分组，方向相反
  const row1 = document.createElement("div");
  row1.className = "album-row";
  const row2 = document.createElement("div");
  row2.className = "album-row";

  trips.forEach((trip, index) => {
    const tile = createAlbumTile(trip, index);
    (index % 2 === 0 ? row1 : row2).appendChild(tile);
  });
  trips.forEach((trip, index) => {
    const tile = createAlbumTile(trip, index);
    (index % 2 === 0 ? row1 : row2).appendChild(tile);
  });

  wrap.replaceChildren(row1, row2); // 替换而非追加：切模式不残留上一模式内容

  setupAutoMarquee(row1, { speed: 0.5, direction: 1 });
  setupAutoMarquee(row2, { speed: 0.5, direction: -1 });

  document.title = `途中光影 · 按地区（${trips.length} 段旅程）`;
}

function createAlbumTile(trip, index) {
  const tile = document.createElement("a");
  tile.className = "album-tile beam-hover";
  tile.href = `trip.html?id=${encodeURIComponent(indexText(trip?.id, "", 60))}`;

  const url = safeSameOriginURL(thumbPath(String((trip?.photos || [])[0] || "")));
  if (url) {
    const image = new Image();
    image.loading = "eager";
    image.decoding = "async";
    image.alt = indexText(trip?.title, "旅程相册", 60);
    image.src = url.href;
    tile.appendChild(image);
  }

  const top = document.createElement("span");
  top.className = "tile-top";
  top.innerHTML =
    `<span class="tile-count">${(trip?.photos || []).length} 张</span>` +
    `<span class="tile-mood">${escapeHTML(indexText(trip?.moodEmoji, "🧭", 8))}</span>`;
  tile.appendChild(top);

  const body = document.createElement("span");
  body.className = "tile-body";
  body.innerHTML =
    `<b>${escapeHTML(indexText(trip?.title, "未命名旅程", 60))}</b>` +
    `<small><span>📅 ${escapeHTML(indexText(trip?.date, "待补充", 40))}</span>` +
    `<span>📍 ${escapeHTML(indexText(trip?.location, "", 80))}</span></small>`;
  tile.appendChild(body);

  return tile;
}

/* ===== 模式二：按月份（横向时间轴 + 点击展开三列瀑布流） ===== */
function renderMonthReview() {
  const wrap = document.querySelector("#photo-groups");
  if (!wrap) return;

  // 按「年-月」分组（新→旧），保留 trip 与照片列表
  const byMonth = new Map();
  sortedTrips(albumTrips).forEach((trip) => {
    const month = String(trip?.date || "").slice(0, 7); // 2026-08
    if (!month) return;
    const photos = (Array.isArray(trip?.photos) ? trip.photos : []).filter(
      (p) => typeof p === "string" && p.trim()
    );
    if (!photos.length) return;

    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push({ trip, photos });
  });

  const months = [...byMonth.keys()].sort((a, b) => b.localeCompare(a)); // 新→旧

  if (!months.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.style.marginBlock = "80px";
    empty.textContent = "还没有照片可以回顾。";
    wrap.replaceChildren(empty);
    return;
  }

  /* 顶部：横向月份时间轴（鼠标拖拽 / 触摸滑动均可） */
  const timeline = document.createElement("nav");
  timeline.className = "month-timeline";
  timeline.setAttribute("aria-label", "月份时间轴，可左右滑动浏览");

  const track = document.createElement("div");
  track.className = "month-track";
  track.setAttribute("role", "tablist");
  track.setAttribute("aria-label", "选择月份");

  months.forEach((month) => {
    const entries = byMonth.get(month);
    const photoTotal = entries.reduce((sum, e) => sum + e.photos.length, 0);

    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "month-pill";
    pill.setAttribute("role", "tab");
    pill.setAttribute("aria-selected", "false");
    pill.dataset.month = month;
    pill.innerHTML =
      `<b>${escapeHTML(month.replace("-", " · "))}</b>` +
      `<small>${photoTotal} 张</small>`;
    pill.addEventListener("click", () => selectMonth(month));
    track.appendChild(pill);
  });

  timeline.appendChild(track);

  /* 下方：当前选中月份的三列瀑布流画廊 */
  const gallery = document.createElement("section");
  gallery.className = "month-gallery";
  gallery.setAttribute("aria-live", "polite");

  function selectMonth(month) {
    // 高亮当前月份胶囊，并把它滚到可视区中间
    track.querySelectorAll(".month-pill").forEach((pill) => {
      const active = pill.dataset.month === month;
      pill.classList.toggle("active", active);
      pill.setAttribute("aria-selected", String(active));
    });
    const activePill = track.querySelector(".month-pill.active");
    if (activePill) {
      activePill.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
    renderMonthGallery(gallery, byMonth.get(month) || [], month);
  }

  wrap.replaceChildren(timeline, gallery);
  setupDragScroll(track); // 鼠标按住拖拽滚动；触摸设备走原生滑动

  selectMonth(months[0]); // 默认展示最近一个有照片的月份
  document.title = "途中光影 · 2026 年度回顾";
}

/* 渲染某个月份的画廊：标题 + 三列瀑布流（makeMasonry 在 ≥1024px 时分三列） */
function renderMonthGallery(gallery, entries, month) {
  const photoTotal = entries.reduce((sum, e) => sum + e.photos.length, 0);

  const head = document.createElement("header");
  head.className = "month-gallery-head";
  head.innerHTML =
    `<h2 class="section-title">${escapeHTML(month.replace("-", " · "))} ` +
    `<span class="count">${photoTotal} 张</span></h2>` +
    `<p class="trip-meta">${entries
      .map((e) => `<span>${escapeHTML(indexText(e.trip?.title, "旅程", 40))}</span>`)
      .join("")}</p>`;

  const wall = document.createElement("div");
  wall.className = "photo-wall month-photo-wall";

  const nodes = [];
  let photoIndex = 0;
  entries.forEach(({ trip, photos }) => {
    const title = indexText(trip?.title, "旅行照片", 60);
    const emoji = indexText(trip?.moodEmoji, "📷", 8);
    photos.forEach((photo) => {
      const el = photoEl(
        thumbPath(photo),
        emoji,
        `${title} · ${month} · 第 ${photoIndex + 1} 张`,
        photo
      );
      el.setAttribute("data-reveal", "zoom");
      el.style.setProperty("--d", `${Math.min(photoIndex * 0.03, 0.3)}s`);
      observeReveal(el); // 先注册入场动画，再交给瀑布流分列
      nodes.push(el);
      photoIndex += 1;
    });
  });

  // 释放上一次瀑布流的 resize 监听，避免跨月份/跨模式泄漏
  if (monthGalleryCleanup) monthGalleryCleanup();

  gallery.replaceChildren(head, wall);
  monthGalleryCleanup = makeMasonry(wall, nodes);
}
// indexText / escapeHTML 已统一迁移至 main.js

"use strict";

// photos.js — 途中光影：双模式
//   按地区：气泡式磁贴 hub，点击直接进入该旅程的相册子页（trip.html?id=xxx）
//   按月份：瀑布流年度回顾，按月分组滚动浏览

let albumTrips = [];

document.addEventListener("DOMContentLoaded", async () => {
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

    const message = document.createElement("p");
    message.className = "empty-state";
    message.style.marginBlock = "80px";
    message.textContent = "相册加载失败，请稍后重试。";
    wrap.replaceChildren(message);
  }
});

function sortedTrips(trips) {
  return [...trips].sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));
}

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
    });
  });
}

function renderMode(mode) {
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

  wrap.append(row1, row2);

  setupAutoMarquee(row1, { speed: 0.5, direction: 1 });
  setupAutoMarquee(row2, { speed: 0.5, direction: -1 });
  enableDragScroll(row1);
  enableDragScroll(row2);

  document.title = `途中光影 · 按地区（${trips.length} 段旅程）`;
}

function createAlbumTile(trip, index) {
  const tile = document.createElement("a");
  tile.className = "album-tile beam-hover";
  tile.href = `trip.html?id=${encodeURIComponent(indexText(trip?.id, "", 60))}`;

  const url = safeSameOriginURL(String((trip?.photos || [])[0] || ""));
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

/* ===== 模式二：按月份（可折叠的瀑布流年度回顾） ===== */
function renderMonthReview() {
  const wrap = document.querySelector("#photo-groups");
  if (!wrap) return;

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
  const fragment = document.createDocumentFragment();

  months.forEach((month, monthIndex) => {
    const entries = byMonth.get(month);
    const photoTotal = entries.reduce((sum, e) => sum + e.photos.length, 0);

    const section = document.createElement("section");
    section.className = "month-group";
    section.setAttribute("data-reveal", "");

    // 折叠头：月份 + 张数 + 旅程 + 箭头
    const head = document.createElement("button");
    head.className = "month-head";
    head.type = "button";
    head.setAttribute("aria-expanded", "false");

    const title = document.createElement("h2");
    title.className = "section-title";
    title.innerHTML =
      `${escapeHTML(month.replace("-", " · "))} ` +
      `<span class="count">${photoTotal} 张</span>`;

    const tripsLine = document.createElement("span");
    tripsLine.className = "trip-meta";
    tripsLine.innerHTML = entries
      .map((e) => `<span>${escapeHTML(indexText(e.trip?.title, "旅程", 40))}</span>`)
      .join("");

    const chev = document.createElement("span");
    chev.className = "chev";
    chev.textContent = "▾";
    chev.setAttribute("aria-hidden", "true");

    head.append(title, tripsLine, chev);
    section.appendChild(head);

    // 主体：默认收起，点击月份行展开全量瀑布流
    const body = document.createElement("div");
    body.className = "month-body";

    const wall = document.createElement("div");
    wall.className = "photo-wall";
    let photoIndex = 0;
    entries.forEach(({ trip, photos }) => {
      const title = indexText(trip?.title, "旅行照片", 60);
      const emoji = indexText(trip?.moodEmoji, "📷", 8);
      photos.forEach((photo) => {
        const el = photoEl(photo, emoji, `${title} · ${month} · 第 ${photoIndex + 1} 张`);
        el.setAttribute("data-reveal", "zoom");
        el.style.setProperty("--d", `${Math.min(photoIndex * 0.03, 0.3)}s`);
        wall.appendChild(el);
        photoIndex += 1;
      });
    });
    body.appendChild(wall);

    section.appendChild(body);

    head.addEventListener("click", () => {
      const open = section.classList.toggle("open");
      head.setAttribute("aria-expanded", String(open));
    });

    fragment.appendChild(section);
  });

  if (!fragment.childNodes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.style.marginBlock = "80px";
    empty.textContent = "还没有照片可以回顾。";
    wrap.replaceChildren(empty);
    return;
  }

  wrap.replaceChildren(fragment);
  wrap.querySelectorAll("[data-reveal]").forEach((el) => observeReveal(el));
  document.title = `途中光影 · 2026 年度回顾`;
}

function indexText(value, fallback = "", maxLength = 240) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function escapeHTML(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

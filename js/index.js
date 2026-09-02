"use strict";

// index.js — 首页：星空画布、跑马灯、旅程轮播、高光精选轮播（每地区一张）、统计数字滚动

document.addEventListener("DOMContentLoaded", async () => {
  createStarfield(document.querySelector("#starfield"));
  initSectionSpy(".section, .next-cta", ".anchor-nav a");

  // 数据返回前先铺骨架屏，避免内容区空白跳变
  const sliderWrap = document.querySelector("#trip-slider");
  const bubbleWrap = document.querySelector("#bubble-field");
  showSkeleton(sliderWrap, 4);
  showSkeleton(bubbleWrap, 6);

  try {
    const data = await loadJSON("data/trips.json");
    const trips = Array.isArray(data?.trips) ? data.trips : [];

    renderTripRail(trips);
    renderBubbles(trips);
    initPortal();
    renderStats(trips);
    renderTicker(trips);
  } catch {
    console.error("旅行数据加载失败。");
    showIndexError();
    showDataHint();
  }
});

/* ===== 跑马灯 ===== */
function renderTicker(trips) {
  const track = document.querySelector("#tickerTrack");
  if (!track) return;

  const places = trips
    .map((trip) => indexText(trip?.location, "", 60).split(/\s+/).pop())
    .filter(Boolean);

  const items = [
    ...places,
    "TENGER DESERT · NEXT",
    "KEEP EXPLORING",
    "PHOTOGRAPHS & FOOTPRINTS",
  ];

  const buildList = () => {
    const list = document.createElement("div");
    list.className = "ticker-list";
    items.forEach((text) => {
      const item = document.createElement("span");
      item.className = "ticker-item";
      item.textContent = text;
      list.appendChild(item);
    });
    return list;
  };

  track.replaceChildren(buildList(), buildList());
}

/* ===== 时光气泡 ===== */
// 预设散点槽位（百分比），避免重叠
const BUBBLE_SLOTS = [
  { x: 8,  y: 16, s: "b-lg" },
  { x: 27, y: 46, s: "b-md" },
  { x: 43, y: 10, s: "b-md" },
  { x: 58, y: 38, s: "b-lg" },
  { x: 76, y: 12, s: "b-sm" },
  { x: 89, y: 44, s: "b-md" },
  { x: 15, y: 68, s: "b-sm" },
  { x: 45, y: 70, s: "b-md" },
  { x: 68, y: 68, s: "b-lg" },
  { x: 90, y: 74, s: "b-sm" },
  { x: 33, y: 28, s: "b-sm" },
  { x: 70, y: 26, s: "b-sm" },
];

function renderBubbles(trips) {
  const field = document.querySelector("#bubble-field");
  if (!field) return;

  clearSkeleton(field);

  const pool = [];
  trips.forEach((trip) => {
    (Array.isArray(trip?.photos) ? trip.photos : []).forEach((photo) => {
      if (typeof photo === "string" && photo.trim()) {
        pool.push({ path: photo, trip });
      }
    });
  });

  if (!pool.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "还没有照片可以变成气泡。";
    field.replaceChildren(empty);
    return;
  }

  const count = Math.min(BUBBLE_SLOTS.length, pool.length);
  const step = pool.length / count;

  const hint = document.createElement("span");
  hint.className = "bubble-hint";
  hint.textContent = "TAP A BUBBLE";
  field.appendChild(hint);

  for (let i = 0; i < count; i += 1) {
    const slot = BUBBLE_SLOTS[i];
    const item = pool[Math.floor(i * step)];
    const trip = item.trip;

    const bubble = document.createElement("a");
    bubble.className = `bubble ${slot.s}`;
    bubble.href = `trip.html?id=${encodeURIComponent(indexText(trip?.id, "", 60))}`;
    bubble.style.left = `${slot.x}%`;
    bubble.style.top = `${slot.y}%`;
    bubble.style.animationDelay = `${(i % 5) * -1.3}s`;
    bubble.title = indexText(trip?.title, "旅程照片", 40);

    const url = safeSameOriginURL(thumbPath(item.path));
    if (url) {
      const image = new Image();
      image.loading = i < 4 ? "eager" : "lazy";
      image.decoding = "async";
      image.alt = indexText(trip?.title, "旅程照片", 40);
      image.addEventListener("load", () => image.classList.add("is-loaded"), { once: true });
      image.src = url.href;
      bubble.appendChild(image);
    }

    const tag = document.createElement("span");
    tag.className = "bubble-tag";
    tag.textContent = indexText(trip?.title, "旅程照片", 24);
    bubble.appendChild(tag);

    field.appendChild(bubble);
  }
}


/* ===== 旅程卡片轨道（旅行记录）：自动跑马灯，悬停手动滑动 ===== */
function renderTripRail(trips) {
  const wrap = document.querySelector("#trip-slider");
  if (!wrap) return;

  if (!trips.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "旅行记录正在整理中。";
    wrap.replaceChildren(empty);
    return;
  }

  wrap.className = "trip-rail-wrap";
  wrap.replaceChildren();

  const rail = document.createElement("div");
  rail.className = "trip-rail";
  rail.setAttribute("aria-label", "旅程卡片轨道，自动滚动，悬停可拖动");

  // 内容复制两份实现无缝循环（第二份独立构建，保证图片各自加载）
  trips.forEach((trip, index) => rail.appendChild(createRailCard(trip, index)));
  trips.forEach((trip, index) => {
    const copy = createRailCard(trip, index);
    copy.setAttribute("aria-hidden", "true");
    rail.appendChild(copy);
  });

  wrap.appendChild(rail);
  
  setupAutoMarquee(rail, { speed: 0.6, direction: 1 });
}

function createRailCard(trip, index) {
  const card = document.createElement("a");
  card.className = "rail-card";
  card.href = `trip.html?id=${encodeURIComponent(indexText(trip?.id, "", 60))}`;

  const url = safeSameOriginURL(
    thumbPath(Array.isArray(trip?.photos) ? String(trip.photos[0] || "") : "")
  );
  if (url) {
    const image = new Image();
    image.loading = "eager";
    image.decoding = "async";
    image.alt = indexText(trip?.title, "旅程照片", 60);
    image.src = url.href;
    card.appendChild(image);
  }

  const badge = document.createElement("span");
  badge.className = "rail-badge";
  badge.textContent = String(index + 1).padStart(2, "0");
  card.appendChild(badge);

  const body = document.createElement("span");
  body.className = "rail-body";

  const title = document.createElement("b");
  title.textContent = indexText(trip?.title, "未命名旅程", 60);

  const meta = document.createElement("small");
  const photoCount = Array.isArray(trip?.photos)
    ? trip.photos.filter((p) => typeof p === "string" && p.trim()).length
    : 0;
  meta.innerHTML =
    `<span>📅 ${escapeHTML(indexText(trip?.date, "待补充", 40))}</span>` +
    `<span class="rail-count">📷 ${photoCount} 张</span>`;

  body.append(title, meta);
  card.appendChild(body);

  return card;
}


/* ===== 旅程之门：滚动缩放传送门（移植自 21st.dev Scroll Zoom Portal） ===== */
function initPortal() {
  const scroller = document.querySelector("#portalScroll");
  const mask = document.querySelector(".portal-mask");
  const ring = document.querySelector("#portalRing");
  const media = document.querySelector("#portalMedia");
  const outro = document.querySelector("#portalOutro");
  if (!scroller || !mask) return;

  // 降级：不做滚动动画，直接全屏展示
  if (REDUCED_MOTION || window.WEBDRIVER_MODE) {
    mask.style.setProperty("--maskW", "260vmax");
    if (ring) ring.style.display = "none";
    if (outro) {
      outro.style.opacity = "1";
      outro.style.pointerEvents = "auto";
    }
    return;
  }

  const initialSize = () => (innerWidth < 640 ? 170 : innerWidth < 1024 ? 240 : 300);

  let ticking = false;
  const update = () => {
    ticking = false;

    const rect = scroller.getBoundingClientRect();
    const total = scroller.offsetHeight - innerHeight;
    const progress = Math.min(1, Math.max(0, -rect.top / (total || 1)));

    const size = initialSize() + Math.pow(progress, 2.3) * 4600;
    mask.style.setProperty("--maskW", `${size}px`);
    if (ring) ring.style.width = ring.style.height = `${size + 22}px`;

    if (media) media.style.transform = `scale(${1 + progress * 0.2})`;

    if (outro) {
      const fade = Math.min(1, Math.max(0, (progress - 0.55) / 0.15));
      outro.style.opacity = String(fade);
      outro.style.pointerEvents = fade > 0.5 ? "auto" : "none";
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", update, { passive: true });
  update();
}

/* ===== 统计（数字滚动，animateCount 为 main.js 共享实现） ===== */
function renderStats(trips) {
  const tripElement = document.querySelector("#stat-trips");
  const photoElement = document.querySelector("#stat-photos");
  const cityElement = document.querySelector("#stat-cities");

  const photoCount = trips.reduce((total, trip) => {
    if (!Array.isArray(trip?.photos)) return total;
    return (
      total +
      trip.photos.filter((photo) => typeof photo === "string" && photo.trim()).length
    );
  }, 0);

  const cities = new Set();
  trips.forEach((trip) => {
    const city = extractCity(trip);
    if (city) cities.add(city);
  });

  animateCount(tripElement, trips.length);
  animateCount(photoElement, photoCount);
  animateCount(cityElement, cities.size);
}

/* ===== 错误状态 ===== */
function showIndexError() {
  const slider = document.querySelector("#trip-slider");
  const bubbleField = document.querySelector("#bubble-field");

  // 错误时撤下骨架与 is-skeleton 类，避免微光占位永久残留
  if (slider) {
    clearSkeleton(slider);
    slider.textContent = "旅行记录暂时无法加载。";
  }
  if (bubbleField) {
    clearSkeleton(bubbleField);
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = "气泡需要启用 JavaScript；全部照片可在「途中光影」浏览。";
    bubbleField.replaceChildren(message);
  }

  ["#stat-trips", "#stat-photos", "#stat-cities"].forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = "--";
  });
}

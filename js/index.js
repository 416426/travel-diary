"use strict";

// index.js — 首页：星空画布、跑马灯、旅程轮播、高光精选轮播（每地区一张）、统计数字滚动

document.addEventListener("DOMContentLoaded", async () => {
  createStarfield(document.querySelector("#starfield"));
  initSectionSpy(".section, .next-cta", ".anchor-nav a");

  try {
    const data = await loadJSON("data/trips.json");
    const trips = Array.isArray(data?.trips) ? data.trips : [];

    renderTripRail(trips);
    renderBubbles(trips);
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

    const url = safeSameOriginURL(item.path);
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
  wrap.innerHTML = "";

  const rail = document.createElement("div");
  rail.className = "trip-rail";
  rail.setAttribute("aria-label", "旅程卡片轨道，自动滚动，悬停可拖动");

  // 复制两份实现无缝循环
  const cards = trips.map((trip, index) => createRailCard(trip, index));
  cards.forEach((card) => rail.appendChild(card));
  cards.forEach((card) => rail.appendChild(card.cloneNode(true)));

  wrap.appendChild(rail);
  enableDragScroll(rail);
  setupAutoMarquee(rail, { speed: 0.6, direction: 1 });
}

function createRailCard(trip, index) {
  const card = document.createElement("a");
  card.className = "rail-card";
  card.href = `trip.html?id=${encodeURIComponent(indexText(trip?.id, "", 60))}`;

  const url = safeSameOriginURL(
    Array.isArray(trip?.photos) ? String(trip.photos[0] || "") : ""
  );
  if (url) {
    const image = new Image();
    image.loading = index < 4 ? "eager" : "lazy";
    image.decoding = "async";
    image.alt = indexText(trip?.title, "旅程照片", 60);
    image.addEventListener("load", () => image.classList.add("is-loaded"), { once: true });
    image.addEventListener("error", () => image.remove(), { once: true });
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

/* ===== 统计（数字滚动） ===== *//* ===== 统计（数字滚动） ===== */
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

function animateCount(element, target) {
  if (!element) return;

  element.setAttribute("data-count", String(target));

  if (REDUCED_MOTION || window.WEBDRIVER_MODE) {
    element.textContent = String(target);
    return;
  }

  element.textContent = "0";

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0]?.isIntersecting) return;
      observer.disconnect();

      const duration = 1300;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        element.textContent = String(Math.round(target * eased));
        if (t < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    },
    { threshold: 0.5 }
  );

  observer.observe(element);
}

function extractCity(trip) {
  const explicitCity = indexText(trip?.city, "", 60);
  if (explicitCity) return explicitCity;

  const location = indexText(trip?.location, "", 120);
  if (!location) return "";

  const parts = location
    .replace(/[·、,/，/]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "";

  const municipalities = new Set(["北京", "上海", "天津", "重庆"]);
  const countries = new Set(["中国", "日本", "法国"]);

  const countryIndex = countries.has(parts[0]) ? 1 : 0;
  const candidate = parts[countryIndex] || parts[0];

  if (municipalities.has(candidate)) return candidate;

  return parts[parts.length - 1] || candidate || "";
}

/* ===== 错误状态 ===== */
function showIndexError() {
  const slider = document.querySelector("#trip-slider");
  const moments = document.querySelector("#moment-slider");

  if (slider) slider.textContent = "旅行记录暂时无法加载。";
  if (moments) moments.textContent = "高光时刻暂时无法加载。";

  ["#stat-trips", "#stat-photos", "#stat-cities"].forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = "--";
  });
}

/* ===== 数据校验与文本工具 ===== */
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

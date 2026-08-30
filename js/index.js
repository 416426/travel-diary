"use strict";

// index.js — 首页：星空画布、跑马灯、旅程轮播、高光精选轮播（每地区一张）、统计数字滚动

document.addEventListener("DOMContentLoaded", async () => {
  createStarfield(document.querySelector("#starfield"));
  initSectionSpy(".section, .next-cta", ".anchor-nav a");

  try {
    const data = await loadJSON("data/trips.json");
    const trips = Array.isArray(data?.trips) ? data.trips : [];

    renderTripRail(trips);
    renderMoments(trips);
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

/* ===== 通用轮播工厂 ===== */
// items: 数据数组；renderSlide(item, index) 返回一个 DOM 节点
// options: { auto: 自动播放毫秒数(0 关闭), ariaLabel, select }
function createSlider(container, items, renderSlide, options = {}) {
  if (!container || !items.length) return null;

  const track = document.createElement("div");
  track.className = "slider-track";

  items.forEach((item, index) => {
    const slide = document.createElement("div");
    slide.className = "slider-slide";
    const node = renderSlide(item, index);
    if (node) slide.appendChild(node);
    track.appendChild(slide);
  });

  const prevButton = document.createElement("button");
  prevButton.className = "moment-arrow prev";
  prevButton.type = "button";
  prevButton.textContent = "←";
  prevButton.setAttribute("aria-label", "上一个");

  const nextButton = document.createElement("button");
  nextButton.className = "moment-arrow next";
  nextButton.type = "button";
  nextButton.textContent = "→";
  nextButton.setAttribute("aria-label", "下一个");

  const counter = document.createElement("span");
  counter.className = "moment-counter";

  const dots = document.createElement("div");
  dots.className = "moment-dots";

  container.append(track, prevButton, nextButton, counter, dots);
  container.tabIndex = 0;

  const state = { index: 0, timer: 0 };
  const autoMs = options.auto ?? 0;
  const autoPlay = autoMs > 0 && !REDUCED_MOTION && !window.WEBDRIVER_MODE;

  function update() {
    track.style.transform = `translateX(-${state.index * 100}%)`;
    counter.textContent = `${state.index + 1} / ${items.length}`;
    dots.querySelectorAll("button").forEach((dot, index) => {
      const isActive = index === state.index;
      dot.classList.toggle("active", isActive);
      dot.setAttribute("aria-selected", String(isActive));
    });
    if (typeof options.onSlide === "function") {
      options.onSlide(state.index);
    }
  }

  function goTo(index) {
    state.index = (index + items.length) % items.length;
    update();
  }

  function restartAuto() {
    if (!autoPlay) return;
    window.clearInterval(state.timer);
    state.timer = window.setInterval(() => {
      if (document.hidden) return;
      goTo(state.index + 1);
    }, autoMs);
  }

  prevButton.addEventListener("click", () => { goTo(state.index - 1); restartAuto(); });
  nextButton.addEventListener("click", () => { goTo(state.index + 1); restartAuto(); });

  items.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `第 ${index + 1} 项`);
    dot.addEventListener("click", () => { goTo(index); restartAuto(); });
    dots.appendChild(dot);
  });

  container.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { goTo(state.index - 1); restartAuto(); }
    else if (event.key === "ArrowRight") { goTo(state.index + 1); restartAuto(); }
  });

  let dragStartX = null;
  container.addEventListener("pointerdown", (event) => { dragStartX = event.clientX; });
  container.addEventListener("pointerup", (event) => {
    if (dragStartX === null) return;
    const delta = event.clientX - dragStartX;
    dragStartX = null;
    if (Math.abs(delta) < 48) return;
    goTo(state.index + (delta < 0 ? 1 : -1));
    restartAuto();
  });
  container.addEventListener("pointercancel", () => { dragStartX = null; });
  container.addEventListener("pointerenter", () => window.clearInterval(state.timer));
  container.addEventListener("pointerleave", restartAuto);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) restartAuto();
        else window.clearInterval(state.timer);
      },
      { threshold: 0.3 }
    ).observe(container);
  }

  update();
  restartAuto();
  return { goTo };
}

/* ===== 旅程卡片轨道（旅行记录） ===== */
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
  rail.setAttribute("aria-label", "旅程卡片轨道");

  trips.forEach((trip, index) => {
    rail.appendChild(createRailCard(trip, index));
  });

  const prevButton = document.createElement("button");
  prevButton.className = "rail-arrow prev";
  prevButton.type = "button";
  prevButton.textContent = "←";
  prevButton.setAttribute("aria-label", "向前滚动");

  const nextButton = document.createElement("button");
  nextButton.className = "rail-arrow next";
  nextButton.type = "button";
  nextButton.textContent = "→";
  nextButton.setAttribute("aria-label", "向后滚动");

  wrap.append(rail, prevButton, nextButton);

  const step = () => {
    const card = rail.querySelector(".rail-card");
    return card ? (card.getBoundingClientRect().width + 20) * 2 : 600;
  };
  prevButton.addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: "smooth" }));
  nextButton.addEventListener("click", () => rail.scrollBy({ left: step(), behavior: "smooth" }));

  const syncArrows = () => {
    prevButton.toggleAttribute("disabled", rail.scrollLeft <= 4);
    nextButton.toggleAttribute(
      "disabled",
      rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4
    );
  };
  rail.addEventListener("scroll", syncArrows, { passive: true });
  window.addEventListener("resize", syncArrows, { passive: true });
  syncArrows();
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

function renderTripCover(container, path, fallbackEmoji, title) {
  const fallback = document.createElement("span");
  fallback.className = "media-fallback";
  fallback.textContent = fallbackEmoji;
  fallback.setAttribute("aria-hidden", "true");
  container.appendChild(fallback);

  const url = safeSameOriginURL(path);
  if (!url) return;

  const image = new Image();
  image.loading = "lazy";
  image.decoding = "async";
  image.alt = `${title}封面照片`;

  image.addEventListener(
    "load",
    () => {
      image.classList.add("is-loaded");
      fallback.remove();
    },
    { once: true }
  );

  image.addEventListener("error", () => image.remove(), { once: true });

  image.src = url.href;
  container.appendChild(image);
}

/* ===== 高光精选轮播（每个地区一张封面） ===== */
function renderMoments(trips) {
  const container = document.querySelector("#moment-slider");
  if (!container) return;

  const moments = trips
    .filter((trip) => Array.isArray(trip?.photos) && trip.photos.length)
    .map((trip) => ({
      path: trip.photos[0],
      title: indexText(trip?.title, "旅行照片", 60),
      meta: indexText(trip?.location, "", 60),
      id: indexText(trip?.id, "", 60),
    }));

  if (!moments.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "还没有高光照片，往 photos/ 里放几张旅途大片吧。";
    container.replaceChildren(empty);
    return;
  }

  createSlider(
    container,
    moments,
    (moment, index) => {
      const slide = document.createElement("figure");
      slide.className = "moment-slide";
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "幻灯片");
      slide.setAttribute("aria-label", `${index + 1} / ${moments.length}`);

      const url = safeSameOriginURL(moment.path);
      if (url) {
        const image = new Image();
        image.loading = index < 2 ? "eager" : "lazy";
        image.decoding = "async";
        image.alt = moment.title;
        image.addEventListener("load", () => image.classList.add("is-loaded"), { once: true });
        image.src = url.href;
        slide.appendChild(image);
      }

      const caption = document.createElement("figcaption");
      caption.className = "moment-caption";
      caption.innerHTML =
        `<span class="moment-title">${escapeHTML(moment.title)}</span>` +
        (moment.meta ? `<span class="moment-mood">${escapeHTML(moment.meta)}</span>` : "");
      slide.appendChild(caption);

      // 点击封面 → 该旅程相册
      if (moment.id) {
        slide.style.cursor = "pointer";
        slide.addEventListener("click", () => {
          window.location.href = `trip.html?id=${encodeURIComponent(moment.id)}`;
        });
        slide.title = "点击查看该旅程相册";
      }

      return slide;
    },
    { auto: 5000, ariaLabel: "旅行高光照片" }
  );
}

/* ===== 统计（数字滚动） ===== */
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

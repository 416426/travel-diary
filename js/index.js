"use strict";

// index.js — 首页：星空画布、跑马灯、旅行卡片（3D tilt）、照片墙、
// 高光时刻轮播、统计数字滚动

document.addEventListener("DOMContentLoaded", async () => {
  createStarfield(document.querySelector("#starfield"));
  initSectionSpy(".section, .next-cta", ".anchor-nav a");

  try {
    const data = await loadJSON("data/trips.json");
    const trips = Array.isArray(data?.trips) ? data.trips : [];

    renderTrips(trips);
    renderWall(trips);
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

/* ===== 旅程卡片 ===== */
function renderTrips(trips) {
  const wrapper = document.querySelector("#trips-grid");
  if (!wrapper) return;

  const fragment = document.createDocumentFragment();

  trips.forEach((trip, index) => {
    fragment.appendChild(createTripCard(trip, index));
  });

  if (!fragment.childNodes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "旅行记录正在整理中。";
    fragment.appendChild(empty);
  }

  wrapper.replaceChildren(fragment);
}

function createTripCard(trip, index) {
  const article = document.createElement("article");
  article.className = "card trip-card tilt-card";
  article.setAttribute("data-tilt", "");
  article.setAttribute("data-reveal", "");
  article.style.setProperty("--d", `${(index % 2) * 0.12}s`);

  const media = document.createElement("div");
  media.className = "card-media";

  const badge = document.createElement("span");
  badge.className = "card-index";
  badge.textContent = String(index + 1).padStart(2, "0");
  media.appendChild(badge);

  renderTripCover(
    media,
    Array.isArray(trip?.photos) ? trip.photos[0] : "",
    indexText(trip?.moodEmoji, "📷", 8),
    indexText(trip?.title, "旅行照片", 80)
  );

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h3");
  title.textContent = indexText(trip?.title, "未命名旅程", 80);

  const meta = document.createElement("div");
  meta.className = "trip-meta";
  meta.innerHTML =
    `<span>📅 ${escapeHTML(indexText(trip?.date, "待补充", 40))}</span>` +
    `<span>⏱ ${escapeHTML(indexText(trip?.duration, "待补充", 40))}</span>` +
    `<span>📍 ${escapeHTML(indexText(trip?.location, "待补充", 100))}</span>`;

  const mood = document.createElement("div");
  mood.className = "trip-mood";
  mood.textContent =
    `${indexText(trip?.moodEmoji, "🧭", 8)} ` +
    indexText(trip?.mood, "心情待补充", 100);

  const thoughts = document.createElement("p");
  thoughts.className = "trip-thoughts";
  thoughts.textContent = indexText(
    trip?.thoughts,
    "这段旅程的故事正在整理中。",
    1200
  );

  body.append(title, meta, mood, thoughts);

  const highlightList = document.createElement("ul");
  highlightList.className = "highlight-list";

  const highlights = Array.isArray(trip?.highlights) ? trip.highlights : [];
  highlights.forEach((highlight) => {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    const name = document.createElement("span");
    const note = document.createElement("span");

    dot.className = "dot";
    dot.textContent = "📍";
    dot.setAttribute("aria-hidden", "true");

    name.className = "name";
    name.textContent = indexText(highlight?.name, "旅途坐标", 80);

    note.className = "note";
    note.textContent = indexText(highlight?.note, "暂无补充说明", 180);

    item.append(dot, name, note);
    highlightList.appendChild(item);
  });

  if (highlightList.childElementCount) body.appendChild(highlightList);

  const tags = document.createElement("div");
  tags.className = "tags";

  const tagValues = Array.isArray(trip?.tags) ? trip.tags : [];
  tagValues.slice(0, 20).forEach((value) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `#${indexText(value, "旅行", 32)}`;
    tags.appendChild(tag);
  });

  if (tags.childElementCount) body.appendChild(tags);

  const link = document.createElement("a");
  link.className = "trip-link";
  link.href = "journey.html";
  link.innerHTML = `阅读旅程日志 <span class="arr" aria-hidden="true">→</span>`;
  body.appendChild(link);

  article.append(media, body);
  observeReveal(article);

  return article;
}

function renderTripCover(container, path, fallbackEmoji, title) {
  const fallback = document.createElement("span");
  fallback.className = "media-fallback";
  fallback.textContent = fallbackEmoji;
  fallback.setAttribute("aria-hidden", "true");
  container.appendChild(fallback);

  const url = safeSameOriginURL(path);
  if (!url) return;

  // 图片立即挂载进入懒加载管线，加载完成后淡入覆盖占位
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

/* ===== 照片墙 ===== */
function renderWall(trips) {
  const wall = document.querySelector("#photo-wall");
  if (!wall) return;

  const fragment = document.createDocumentFragment();
  let photoIndex = 0;

  trips.forEach((trip) => {
    const title = indexText(trip?.title, "旅行照片", 80);
    const emoji = indexText(trip?.moodEmoji, "📷", 8);

    const photos = Array.isArray(trip?.photos)
      ? trip.photos.filter((photo) => typeof photo === "string" && photo.trim())
      : [];

    if (!photos.length) {
      fragment.appendChild(photoEl("", emoji, title));
      return;
    }

    photos.forEach((photo, index) => {
      const el = photoEl(photo, emoji, `${title} · 第 ${index + 1} 张`);
      el.setAttribute("data-reveal", "zoom");
      el.style.setProperty("--d", `${Math.min(photoIndex * 0.05, 0.4)}s`);
      observeReveal(el);
      fragment.appendChild(el);
      photoIndex += 1;
    });
  });

  wall.replaceChildren(fragment);
}

/* ===== 高光时刻轮播 ===== */
function renderMoments(trips) {
  const slider = document.querySelector("#moment-slider");
  if (!slider) return;

  const moments = [];
  trips.forEach((trip) => {
    const title = indexText(trip?.title, "旅行照片", 80);
    const mood = indexText(trip?.mood, "", 100);

    (Array.isArray(trip?.photos) ? trip.photos : [])
      .filter((photo) => typeof photo === "string" && photo.trim())
      .forEach((photo, index) => {
        moments.push({
          path: photo,
          caption: `${title} · 第 ${index + 1} 张`,
          mood,
        });
      });
  });

  if (!moments.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "还没有高光照片，往 photos/ 里放几张旅途大片吧。";
    slider.replaceChildren(empty);
    return;
  }

  const track = document.createElement("div");
  track.className = "moment-track";

  moments.forEach((moment, index) => {
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
      image.alt = moment.caption;
      image.addEventListener("load", () => image.classList.add("is-loaded"), { once: true });
      image.src = url.href;
      slide.appendChild(image);
    }

    const caption = document.createElement("figcaption");
    caption.className = "moment-caption";
    caption.innerHTML =
      `<span class="moment-title">${escapeHTML(moment.caption)}</span>` +
      (moment.mood ? `<span class="moment-mood">${escapeHTML(moment.mood)}</span>` : "");
    slide.appendChild(caption);

    track.appendChild(slide);
  });

  const prevButton = document.createElement("button");
  prevButton.className = "moment-arrow prev";
  prevButton.type = "button";
  prevButton.textContent = "←";
  prevButton.setAttribute("aria-label", "上一张");

  const nextButton = document.createElement("button");
  nextButton.className = "moment-arrow next";
  nextButton.type = "button";
  nextButton.textContent = "→";
  nextButton.setAttribute("aria-label", "下一张");

  const counter = document.createElement("span");
  counter.className = "moment-counter";

  const dots = document.createElement("div");
  dots.className = "moment-dots";
  dots.setAttribute("role", "tablist");
  dots.setAttribute("aria-label", "选择照片");

  slider.append(track, prevButton, nextButton, counter, dots);

  const state = { index: 0, timer: 0 };
  const autoPlay = !REDUCED_MOTION && !window.WEBDRIVER_MODE;

  function update() {
    track.style.transform = `translateX(-${state.index * 100}%)`;
    counter.textContent = `${state.index + 1} / ${moments.length}`;

    dots.querySelectorAll("button").forEach((dot, index) => {
      const isActive = index === state.index;
      dot.classList.toggle("active", isActive);
      dot.setAttribute("aria-selected", String(isActive));
    });
  }

  function goTo(index) {
    state.index = (index + moments.length) % moments.length;
    update();
  }

  function restartAuto() {
    if (!autoPlay) return;
    window.clearInterval(state.timer);
    state.timer = window.setInterval(() => {
      if (document.hidden) return;
      goTo(state.index + 1);
    }, 5000);
  }

  prevButton.addEventListener("click", () => { goTo(state.index - 1); restartAuto(); });
  nextButton.addEventListener("click", () => { goTo(state.index + 1); restartAuto(); });

  moments.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `第 ${index + 1} 张`);
    dot.addEventListener("click", () => { goTo(index); restartAuto(); });
    dots.appendChild(dot);
  });

  slider.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { goTo(state.index - 1); restartAuto(); }
    else if (event.key === "ArrowRight") { goTo(state.index + 1); restartAuto(); }
  });

  slider.tabIndex = 0;

  // 拖拽翻页
  let dragStartX = null;
  slider.addEventListener("pointerdown", (event) => {
    dragStartX = event.clientX;
  });
  slider.addEventListener("pointerup", (event) => {
    if (dragStartX === null) return;
    const delta = event.clientX - dragStartX;
    dragStartX = null;
    if (Math.abs(delta) < 48) return;
    goTo(state.index + (delta < 0 ? 1 : -1));
    restartAuto();
  });
  slider.addEventListener("pointercancel", () => { dragStartX = null; });

  slider.addEventListener("pointerenter", () => window.clearInterval(state.timer));
  slider.addEventListener("pointerleave", restartAuto);

  // 离开视口暂停自动播放
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) restartAuto();
        else window.clearInterval(state.timer);
      },
      { threshold: 0.3 }
    ).observe(slider);
  }

  update();
  restartAuto();
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
  const trips = document.querySelector("#trips-grid");
  const wall = document.querySelector("#photo-wall");
  const slider = document.querySelector("#moment-slider");

  if (trips) trips.textContent = "旅行记录暂时无法加载。";
  if (wall) wall.textContent = "照片暂时无法加载。";
  if (slider) slider.textContent = "高光时刻暂时无法加载。";

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

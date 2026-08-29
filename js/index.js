"use strict";

// index.js — 首页：星空画布、跑马灯、旅行卡片（3D tilt）、照片墙、
// 统计数字滚动、暗色足迹地图（卡片可联动飞行定位）

document.addEventListener("DOMContentLoaded", async () => {
  createStarfield(document.querySelector("#starfield"));
  initSectionSpy(".section, .next-cta", ".anchor-nav a");

  try {
    const data = await loadJSON("data/trips.json");
    const trips = Array.isArray(data?.trips) ? data.trips : [];

    renderMap(trips);
    renderTrips(trips);
    renderWall(trips);
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

/* ===== 地图 ===== */
const tripMarkers = new Map();

function renderMap(trips) {
  const mapElement = document.querySelector("#map");
  if (!mapElement) return;

  if (typeof window.L === "undefined") {
    mapElement.textContent = "地图组件暂时无法加载，请稍后重试。";
    return;
  }

  const map = L.map(mapElement, { scrollWheelZoom: false }).setView([33, 108], 4);
  window.__tripMap = map;

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 16,
      attribution:
        "Tiles &copy; Esri — Source: Esri, HERE, Garmin, USGS, Intermap, iPC, NRCAN",
    }
  ).addTo(map);

  const bounds = [];

  trips.forEach((trip) => {
    const coordinates = getCoordinates(trip);
    if (!coordinates) return;

    const title = indexText(trip?.title, "未命名旅程", 80);
    const location = indexText(trip?.location, "地点待补充", 100);
    const date = indexText(trip?.date, "日期待补充", 40);
    const duration = indexText(trip?.duration, "时长待补充", 40);
    const moodEmoji = indexText(trip?.moodEmoji, "📍", 8);

    const icon = L.divIcon({
      html:
        `<div class="pin" aria-hidden="true">` +
        `${escapeHTML(moodEmoji)}</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    });

    const marker = L.marker(coordinates, { icon, title })
      .addTo(map)
      .bindPopup(createTripPopup(title, location, date, duration));

    if (trip?.id) tripMarkers.set(String(trip.id), marker);
    bounds.push(coordinates);

    const highlights = Array.isArray(trip?.highlights) ? trip.highlights : [];
    highlights.forEach((highlight) => {
      const point = getCoordinates(highlight);
      if (!point) return;

      L.circleMarker(point, {
        radius: 6,
        color: "#67e8f9",
        weight: 2,
        fillColor: "#0ea5b7",
        fillOpacity: 0.4,
      })
        .addTo(map)
        .bindPopup(
          createHighlightPopup(
            indexText(highlight?.name, "旅途坐标", 80),
            indexText(highlight?.note, "暂无补充说明", 180)
          )
        );

      bounds.push(point);
    });
  });

  if (bounds.length === 1) {
    map.setView(bounds[0], 9);
  } else if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [42, 42], maxZoom: 8 });
  }
}

// 卡片按钮 → 平滑滚动到地图并飞行定位
function focusTripOnMap(tripId) {
  const marker = tripMarkers.get(String(tripId));
  const map = window.__tripMap;
  const section = document.querySelector("#footprints");

  if (!marker || !map) return;

  section?.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth" });
  map.flyTo(marker.getLatLng(), 9, { duration: REDUCED_MOTION ? 0 : 1.6 });

  window.setTimeout(() => marker.openPopup(), REDUCED_MOTION ? 60 : 1650);
}

function createTripPopup(title, location, date, duration) {
  const popup = document.createElement("div");
  const heading = document.createElement("strong");
  const place = document.createElement("span");
  const meta = document.createElement("span");

  heading.textContent = title;
  place.textContent = location;
  meta.textContent = `${date} · ${duration}`;

  popup.append(heading, document.createElement("br"), place, document.createElement("br"), meta);
  return popup;
}

function createHighlightPopup(name, note) {
  const popup = document.createElement("div");
  const heading = document.createElement("strong");
  const description = document.createElement("span");

  heading.textContent = name;
  description.textContent = note;

  popup.append(heading, document.createElement("br"), description);
  return popup;
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

  if (trip?.id && tripMarkers.size) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "trip-link";
    link.innerHTML = `在地图上查看足迹 <span class="arr" aria-hidden="true">→</span>`;
    link.addEventListener("click", () => focusTripOnMap(trip.id));
    body.appendChild(link);
  }

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
  const map = document.querySelector("#map");
  const trips = document.querySelector("#trips-grid");
  const wall = document.querySelector("#photo-wall");

  if (map) map.textContent = "地图暂时无法加载，请稍后重试。";
  if (trips) trips.textContent = "旅行记录暂时无法加载。";
  if (wall) wall.textContent = "照片暂时无法加载。";

  ["#stat-trips", "#stat-photos", "#stat-cities"].forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = "--";
  });
}

/* ===== 数据校验与文本工具 ===== */
function getCoordinates(value) {
  const latitude = value?.lat;
  const longitude = value?.lng;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
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

"use strict";

// index.js — 首页旅行地图、旅行卡片、照片墙、统计与滚动 reveal

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await loadJSON("data/trips.json");
    const trips = Array.isArray(data?.trips) ? data.trips : [];

    renderMap(trips);
    renderTrips(trips);
    renderWall(trips);
    renderStats(trips);
    initScrollReveal();
  } catch {
    console.error("旅行数据加载失败。");
    showIndexError();
    initScrollReveal();
  }
});

// ===== 地图 =====

function renderMap(trips) {
  const mapElement = document.querySelector("#map");

  if (!mapElement) return;

  if (typeof window.L === "undefined") {
    mapElement.textContent = "地图组件暂时无法加载，请稍后重试。";
    return;
  }

  const map = L.map(mapElement, {
    scrollWheelZoom: false,
  }).setView([30, 105], 3);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    crossOrigin: true,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">' +
      "OpenStreetMap</a> contributors",
  }).addTo(map);

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
        `<span aria-hidden="true" style="font-size:26px">` +
        `${escapeHTML(moodEmoji)}</span>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker(coordinates, { icon })
      .addTo(map)
      .bindPopup(
        createTripPopup(title, location, date, duration)
      );

    bounds.push(coordinates);

    const highlights = Array.isArray(trip?.highlights)
      ? trip.highlights
      : [];

    highlights.forEach((highlight) => {
      const point = getCoordinates(highlight);

      if (!point) return;

      L.circleMarker(point, {
        radius: 7,
        color: "#b85432",
        weight: 2,
        fillColor: "#b85432",
        fillOpacity: 0.35,
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
    map.setView(bounds[0], 8);
  } else if (bounds.length > 1) {
    map.fitBounds(bounds, {
      padding: [30, 30],
      maxZoom: 6,
    });
  }
}

function createTripPopup(title, location, date, duration) {
  const popup = document.createElement("div");
  const heading = document.createElement("strong");
  const place = document.createElement("span");
  const meta = document.createElement("span");

  heading.textContent = title;
  place.textContent = location;
  meta.textContent = `${date} · ${duration}`;

  popup.append(
    heading,
    document.createElement("br"),
    place,
    document.createElement("br"),
    meta
  );

  return popup;
}

function createHighlightPopup(name, note) {
  const popup = document.createElement("div");
  const heading = document.createElement("strong");
  const description = document.createElement("span");

  heading.textContent = name;
  description.textContent = note;

  popup.append(
    heading,
    document.createElement("br"),
    description
  );

  return popup;
}

// ===== 旅程卡片 =====

function renderTrips(trips) {
  const wrapper = document.querySelector("#trips-grid");

  if (!wrapper) return;

  const fragment = document.createDocumentFragment();

  trips.forEach((trip) => {
    fragment.appendChild(createTripCard(trip));
  });

  if (!fragment.childNodes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "旅行记录正在整理中。";
    fragment.appendChild(empty);
  }

  wrapper.replaceChildren(fragment);
}

function createTripCard(trip) {
  const article = document.createElement("article");
  article.className = "card trip-card fade-in";

  const media = document.createElement("div");
  media.className = "card-media";

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
  meta.textContent =
    `📅 ${indexText(trip?.date, "待补充", 40)} · ` +
    `⏱ ${indexText(trip?.duration, "待补充", 40)} · ` +
    `📍 ${indexText(trip?.location, "待补充", 100)}`;

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

  const highlightList = document.createElement("ul");
  highlightList.className = "highlight-list";

  const highlights = Array.isArray(trip?.highlights)
    ? trip.highlights
    : [];

  highlights.forEach((highlight) => {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    const name = document.createElement("span");
    const note = document.createElement("span");

    dot.className = "dot";
    dot.textContent = "📍";
    dot.setAttribute("aria-hidden", "true");

    name.className = "name";
    name.textContent = indexText(
      highlight?.name,
      "旅途坐标",
      80
    );

    note.className = "note";
    note.textContent = indexText(
      highlight?.note,
      "暂无补充说明",
      180
    );

    item.append(dot, name, note);
    highlightList.appendChild(item);
  });

  const tags = document.createElement("div");
  tags.className = "tags";

  const tagValues = Array.isArray(trip?.tags)
    ? trip.tags
    : [];

  tagValues.slice(0, 20).forEach((value) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `#${indexText(value, "旅行", 32)}`;
    tags.appendChild(tag);
  });

  body.append(title, meta, mood, thoughts);

  if (highlightList.childElementCount) {
    body.appendChild(highlightList);
  }

  if (tags.childElementCount) {
    body.appendChild(tags);
  }

  article.append(media, body);

  return article;
}

function renderTripCover(container, path, fallbackEmoji, title) {
  const fallback = document.createElement("span");

  fallback.textContent = fallbackEmoji;
  fallback.setAttribute("aria-hidden", "true");
  container.replaceChildren(fallback);

  const url = safeSameOriginURL(path);

  if (!url) return;

  const image = new Image();

  image.loading = "lazy";
  image.decoding = "async";
  image.alt = `${title}封面照片`;

  image.addEventListener(
    "load",
    () => {
      container.replaceChildren(image);
    },
    { once: true }
  );

  image.addEventListener(
    "error",
    () => {
      container.replaceChildren(fallback);
    },
    { once: true }
  );

  image.src = url.href;
}

// ===== 照片墙 =====

function renderWall(trips) {
  const wall = document.querySelector("#photo-wall");

  if (!wall) return;

  const fragment = document.createDocumentFragment();

  trips.forEach((trip) => {
    const title = indexText(trip?.title, "旅行照片", 80);
    const emoji = indexText(trip?.moodEmoji, "📷", 8);

    const photos = Array.isArray(trip?.photos)
      ? trip.photos.filter(
          (photo) =>
            typeof photo === "string" && photo.trim()
        )
      : [];

    if (!photos.length) {
      fragment.appendChild(photoEl("", emoji, title));
      return;
    }

    photos.forEach((photo, index) => {
      fragment.appendChild(
        photoEl(
          photo,
          emoji,
          `${title} · 第 ${index + 1} 张`
        )
      );
    });
  });

  wall.replaceChildren(fragment);
}

// ===== 统计 =====

function renderStats(trips) {
  const tripElement = document.querySelector("#stat-trips");
  const photoElement = document.querySelector("#stat-photos");
  const cityElement = document.querySelector("#stat-cities");

  const photoCount = trips.reduce((total, trip) => {
    if (!Array.isArray(trip?.photos)) {
      return total;
    }

    return (
      total +
      trip.photos.filter(
        (photo) =>
          typeof photo === "string" && photo.trim()
      ).length
    );
  }, 0);

  const cities = new Set();

  trips.forEach((trip) => {
    const city = extractCity(trip);

    if (city) {
      cities.add(city);
    }
  });

  if (tripElement) {
    tripElement.textContent = String(trips.length);
  }

  if (photoElement) {
    photoElement.textContent = String(photoCount);
  }

  if (cityElement) {
    cityElement.textContent = String(cities.size);
  }
}

function extractCity(trip) {
  const explicitCity = indexText(trip?.city, "", 60);

  if (explicitCity) {
    return explicitCity;
  }

  const location = indexText(trip?.location, "", 120);

  if (!location) {
    return "";
  }

  const parts = location
    .replace(/[·、,/，/]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "";
  }

  const municipalities = new Set([
    "北京",
    "上海",
    "天津",
    "重庆",
  ]);

  const countries = new Set([
    "中国",
    "日本",
    "法国",
  ]);

  const countryIndex = countries.has(parts[0]) ? 1 : 0;
  const candidate = parts[countryIndex] || parts[0];

  if (municipalities.has(candidate)) {
    return candidate;
  }

  return parts[parts.length - 1] || candidate || "";
}

// ===== 滚动 reveal =====

function initScrollReveal() {
  const elements = document.querySelectorAll(
    ".card, .photo-wall .ph, .section-title, .next-cta"
  );

  if (!elements.length) {
    return;
  }

  elements.forEach((element) => {
    element.classList.add("reveal");
  });

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (
    reducedMotion ||
    !("IntersectionObserver" in window)
  ) {
    elements.forEach((element) => {
      element.classList.add("revealed");
    });

    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  elements.forEach((element) => {
    observer.observe(element);
  });
}

// ===== 错误状态 =====

function showIndexError() {
  const map = document.querySelector("#map");
  const trips = document.querySelector("#trips-grid");
  const wall = document.querySelector("#photo-wall");

  if (map) {
    map.textContent = "地图暂时无法加载，请稍后重试。";
  }

  if (trips) {
    trips.textContent = "旅行记录暂时无法加载。";
  }

  if (wall) {
    wall.textContent = "照片暂时无法加载。";
  }

  [
    "#stat-trips",
    "#stat-photos",
    "#stat-cities",
  ].forEach((selector) => {
    const element = document.querySelector(selector);

    if (element) {
      element.textContent = "--";
    }
  });
}

// ===== 数据校验与文本工具 =====

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
  if (typeof value !== "string") {
    return fallback;
  }

  const text = value.trim();

  return text ? text.slice(0, maxLength) : fallback;
}

function escapeHTML(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
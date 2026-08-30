"use strict";

// photos.js — 途中光影相册页：按旅程地区分组展示全部照片，Lightbox 翻看

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await loadJSON("data/trips.json");
    const trips = Array.isArray(data?.trips) ? data.trips : [];
    renderGroups(trips);
    renderRegionNav(trips);
  } catch (err) {
    console.error("相册数据加载失败", err);
    showDataHint();

    const wrap = document.querySelector("#photo-groups");
    if (!wrap) return;

    const message = document.createElement("p");
    message.className = "empty-state";
    message.style.marginBlock = "80px";
    message.textContent = "相册加载失败，请稍后重试。";
    message.dataset.err = String(err && err.stack || err);
    wrap.replaceChildren(message);
  }
});

function sortedTrips(trips) {
  return [...trips].sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));
}

function renderGroups(trips) {
  const wrap = document.querySelector("#photo-groups");
  if (!wrap) return;

  const fragment = document.createDocumentFragment();
  let total = 0;

  sortedTrips(trips).forEach((trip, index) => {
    const photos = (Array.isArray(trip?.photos) ? trip.photos : [])
      .filter((p) => typeof p === "string" && p.trim());
    if (!photos.length) return;

    total += photos.length;

    const section = document.createElement("section");
    section.className = "photo-group";
    section.id = `g-${indexText(trip?.id, `trip-${index}`, 60) || `trip-${index}`}`;
    section.setAttribute("data-reveal", "");

    const head = document.createElement("header");
    head.className = "photo-group-head";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = `TRIP ${String(index + 1).padStart(2, "0")}`;

    const titleRow = document.createElement("h2");
    titleRow.className = "section-title";
    titleRow.style.marginBottom = "6px";

    const titleLink = document.createElement("a");
    titleLink.href = `trip.html?id=${encodeURIComponent(indexText(trip?.id, "", 60))}`;
    titleLink.textContent = indexText(trip?.title, "未命名旅程", 80);
    titleLink.style.color = "inherit";
    titleLink.style.textDecoration = "none";
    titleRow.appendChild(titleLink);

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${photos.length} 张`;
    titleRow.appendChild(count);

    const meta = document.createElement("p");
    meta.className = "trip-meta";
    meta.innerHTML =
      `<span>📅 ${escapeHTML(indexText(trip?.date, "待补充", 40))}</span>` +
      `<span>📍 ${escapeHTML(indexText(trip?.location, "地点待补充", 100))}</span>` +
      `<span>${escapeHTML(indexText(trip?.moodEmoji, "🧭", 8))} ${escapeHTML(indexText(trip?.mood, "心情待补充", 100))}</span>`;

    head.append(eyebrow, titleRow, meta);
    section.appendChild(head);

    const wall = document.createElement("div");
    wall.className = "photo-wall";

    photos.forEach((photo, photoIndex) => {
      const el = photoEl(
        photo,
        indexText(trip?.moodEmoji, "📷", 8),
        `${indexText(trip?.title, "旅行照片", 60)} · 第 ${photoIndex + 1} 张`
      );
      el.setAttribute("data-reveal", "zoom");
      el.style.setProperty("--d", `${Math.min(photoIndex * 0.04, 0.3)}s`);
      observeReveal(el);
      wall.appendChild(el);
    });

    section.appendChild(wall);
    fragment.appendChild(section);
  });

  if (!fragment.childNodes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.style.marginBlock = "80px";
    empty.textContent = "相册还是空的，往 photos/ 里放几张旅途照片吧。";
    fragment.appendChild(empty);
  }

  wrap.replaceChildren(fragment);
  wrap.querySelectorAll("[data-reveal]").forEach((el) => observeReveal(el));
  document.title = `途中光影（${total} 张） · 旅行日记`;
}

function renderRegionNav(trips) {
  const nav = document.querySelector("#regionNav");
  if (!nav) return;

  const groups = sortedTrips(trips).filter(
    (trip) => Array.isArray(trip?.photos) && trip.photos.length
  );
  if (groups.length < 2) return;

  const fragment = document.createDocumentFragment();

  groups.forEach((trip, index) => {
    const link = document.createElement("a");
    link.href = `#g-${indexText(trip?.id, `trip-${index}`, 60) || `trip-${index}`}`;
    link.innerHTML =
      `${escapeHTML(indexText(trip?.title, "旅程", 40))} ` +
      `<span class="n">${(trip?.photos || []).length}</span>`;
    fragment.appendChild(link);
  });

  nav.replaceChildren(fragment);
  nav.hidden = false;
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

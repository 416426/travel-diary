"use strict";

// trip.js — 旅程详情子页：?id=xxx → 大图 Hero + 该旅程全部照片 + 相邻旅程导航

document.addEventListener("DOMContentLoaded", async () => {
  let trips = [];
  try {
    const data = await loadJSON("data/trips.json");
    trips = Array.isArray(data?.trips) ? data.trips : [];
  } catch (err) {
    console.error("旅程数据加载失败", err);
    return renderError("旅程数据加载失败，请稍后重试。");
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "";
  const index = trips.findIndex((t) => String(t?.id || "") === id);
  const trip = index >= 0 ? trips[index] : null;

  if (!trip) {
    renderError("没有找到这段旅程，回旅程日志看看其他故事吧。");
    return;
  }

  const sorted = sortedTrips(trips);
  const sortedIndex = sorted.findIndex((t) => String(t?.id || "") === id);
  const prev = sorted[sortedIndex - 1] || null; // 时间上更早
  const next = sorted[sortedIndex + 1] || null; // 时间上更新

  renderHero(trip);
  renderPhotos(trip);
  renderNeighbors(prev, next);

  document.title = `${indexText(trip?.title, "旅程相册", 60)} · 旅行日记`;
});

function sortedTrips(trips) {
  return [...trips].sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));
}

function renderError(message) {
  const wrap = document.querySelector("#trip-wrap");
  if (!wrap) return;

  wrap.replaceChildren();
  const box = document.createElement("div");
  box.className = "container";
  box.style.paddingBlock = "160px";
  box.style.textAlign = "center";

  const p = document.createElement("p");
  p.className = "empty-state";
  p.textContent = message;

  const link = document.createElement("p");
  link.style.marginTop = "20px";
  link.innerHTML = `<a class="button" href="journey.html">返回旅程日志</a>`;

  box.append(p, link);
  wrap.appendChild(box);
  document.title = "旅程相册 · 旅行日记";
}

/* ===== Hero：封面大图 + 信息 ===== */
function resolveBackTarget() {
  const ref = String(document.referrer || "");
  if (ref.includes("photos.html")) {
    return { href: "photos.html", label: "← 返回途中光影" };
  }
  return { href: "journey.html", label: "← 返回旅程日志" };
}

function renderHero(trip) {
  const hero = document.querySelector("#trip-hero");
  const title = document.querySelector("#trip-title");
  const chips = document.querySelector("#trip-chips");
  const brief = document.querySelector("#trip-brief");
  const eyebrow = document.querySelector("#trip-eyebrow");
  if (!hero || !title || !chips || !brief) return;

  const back = resolveBackTarget();
  const backLink = document.querySelector(".trip-hero .back-link");
  if (backLink) {
    backLink.href = back.href;
    backLink.textContent = back.label;
  }

  const cover = Array.isArray(trip?.photos) ? trip.photos[0] : "";
  const coverURL = safeSameOriginURL(String(cover || ""));
  if (coverURL) {
    const preload = new Image();
    preload.onload = () => { hero.style.backgroundImage = `url("${coverURL.href}")`; };
    preload.src = coverURL.href;
  }

  if (eyebrow) {
    eyebrow.textContent = `TRIP ALBUM · ${indexText(trip?.date, "", 40)}`;
  }

  title.textContent = indexText(trip?.title, "旅程相册", 80);

  const photoCount = (Array.isArray(trip?.photos) ? trip.photos : []).length;
  const items = [
    { icon: "📅", text: indexText(trip?.date, "日期待补充", 40) },
    { icon: "⏱", text: indexText(trip?.duration, "", 40) || "时长待补充" },
    { icon: "📍", text: indexText(trip?.location, "地点待补充", 100) },
    { icon: "📷", text: `${photoCount} 张照片` },
  ];

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "meta-chip";
    chip.innerHTML = `<i aria-hidden="true">${item.icon}</i>${escapeHTML(item.text)}`;
    fragment.appendChild(chip);
  });
  chips.replaceChildren(fragment);

  brief.textContent = indexText(trip?.thoughts, "这段旅程的故事正在整理中。", 400);
}

/* ===== 照片墙 ===== */
function renderPhotos(trip) {
  const wall = document.querySelector("#trip-photos");
  if (!wall) return;

  const photos = (Array.isArray(trip?.photos) ? trip.photos : [])
    .filter((p) => typeof p === "string" && p.trim());
  const emoji = indexText(trip?.moodEmoji, "📷", 8);
  const title = indexText(trip?.title, "旅程", 60);

  if (!photos.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "这段旅程还没有照片。";
    wall.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  photos.forEach((photo, index) => {
    const el = photoEl(photo, emoji, `${title} · 第 ${index + 1} 张`);
    el.setAttribute("data-reveal", "zoom");
    el.style.setProperty("--d", `${Math.min(index * 0.04, 0.3)}s`);
    observeReveal(el);
    fragment.appendChild(el);
  });

  wall.replaceChildren(fragment);
}

/* ===== 相邻旅程导航 ===== */
function renderNeighbors(prev, next) {
  const prevEl = document.querySelector("#trip-prev");
  const nextEl = document.querySelector("#trip-next");

  if (prevEl) {
    if (prev) {
      prevEl.href = `trip.html?id=${encodeURIComponent(String(prev?.id || ""))}`;
      prevEl.querySelector("b").textContent = indexText(prev?.title, "上一段旅程", 60);
    } else {
      prevEl.style.visibility = "hidden";
    }
  }

  if (nextEl) {
    if (next) {
      nextEl.href = `trip.html?id=${encodeURIComponent(String(next?.id || ""))}`;
      nextEl.querySelector("b").textContent = indexText(next?.title, "下一段旅程", 60);
    } else {
      nextEl.style.visibility = "hidden";
    }
  }
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

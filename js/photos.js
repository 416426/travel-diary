"use strict";

// photos.js — 途中光影相册页：按地区分组，单地区视图切换，Lightbox 翻看

let albumTrips = [];
let albumOrder = [];   // 排序后的旅程引用
let activeGroup = 0;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await loadJSON("data/trips.json");
    albumTrips = Array.isArray(data?.trips) ? data.trips : [];
    albumOrder = sortedTrips(albumTrips).filter(
      (trip) => Array.isArray(trip?.photos) && trip.photos.length
    );

    renderRegionNav();
    renderActiveGroup();
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

function groupId(trip, index) {
  return `g-${indexText(trip?.id, `trip-${index}`, 60) || `trip-${index}`}`;
}

/* ===== 地区快速跳转（单选 tab） ===== */
function renderRegionNav() {
  const nav = document.querySelector("#regionNav");
  if (!nav) return;
  if (albumOrder.length < 2) {
    nav.hidden = albumOrder.length === 0;
  }

  const fragment = document.createDocumentFragment();

  albumOrder.forEach((trip, index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.innerHTML =
      `${escapeHTML(indexText(trip?.title, "旅程", 40))} ` +
      `<span class="n">${(trip?.photos || []).length}</span>`;
    chip.addEventListener("click", () => setActiveGroup(index));
    fragment.appendChild(chip);
  });

  nav.replaceChildren(fragment);
  nav.hidden = false;
}

/* ===== 渲染当前地区的分组 ===== */
function renderActiveGroup() {
  const wrap = document.querySelector("#photo-groups");
  const nav = document.querySelector("#regionNav");
  if (!wrap) return;

  const trip = albumOrder[activeGroup];
  if (!trip) return;

  if (nav) {
    nav.querySelectorAll(".chip").forEach((chip, index) => {
      chip.classList.toggle("active", index === activeGroup);
      chip.setAttribute("aria-pressed", String(index === activeGroup));
    });
  }

  const photos = (trip?.photos || []).filter((p) => typeof p === "string" && p.trim());
  const section = document.createElement("section");
  section.className = "photo-group";

  const head = document.createElement("header");
  head.className = "photo-group-head";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `TRIP ${String(activeGroup + 1).padStart(2, "0")} / ${String(albumOrder.length).padStart(2, "0")}`;

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

  const pager = document.createElement("nav");
  pager.className = "album-pager";

  const prevBtn = document.createElement("button");
  prevBtn.className = "chip";
  prevBtn.type = "button";
  prevBtn.innerHTML = activeGroup > 0
    ? `← ${escapeHTML(indexText(albumOrder[activeGroup - 1]?.title, "上一地区", 40))}`
    : "已是最新一组";
  prevBtn.disabled = activeGroup === 0;
  prevBtn.addEventListener("click", () => setActiveGroup(activeGroup - 1));

  const nextBtn = document.createElement("button");
  nextBtn.className = "chip";
  nextBtn.type = "button";
  nextBtn.innerHTML = activeGroup < albumOrder.length - 1
    ? `${escapeHTML(indexText(albumOrder[activeGroup + 1]?.title, "下一地区", 40))} →`
    : "已是最后一组";
  nextBtn.disabled = activeGroup === albumOrder.length - 1;
  nextBtn.addEventListener("click", () => setActiveGroup(activeGroup + 1));

  pager.append(prevBtn, nextBtn);
  section.appendChild(pager);

  wrap.replaceChildren(section);
  wrap.querySelectorAll("[data-reveal]").forEach((el) => observeReveal(el));
  document.title = `途中光影 · ${indexText(trip?.title, "旅行照片", 40)}（${photos.length} 张）`;
}

function setActiveGroup(index) {
  activeGroup = Math.max(0, Math.min(index, albumOrder.length - 1));
  renderActiveGroup();
  window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? "auto" : "smooth" });
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

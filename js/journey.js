"use strict";

// journey.js — 旅程日志页：统计概览、旅程时间线、目的地心愿清单

document.addEventListener("DOMContentLoaded", async () => {
  // 数据返回前先铺骨架屏
  showSkeleton(document.querySelector("#stats-grid"), 5);
  showSkeleton(document.querySelector("#page-timeline"), 4);
  showSkeleton(document.querySelector("#wish-grid"), 6);

  try {
    const [tripsData, wishData] = await Promise.all([
      loadJSON("data/trips.json"),
      loadJSON("data/wishlist.json"),
    ]);

    const trips = Array.isArray(tripsData?.trips) ? tripsData.trips : [];
    const wishes = Array.isArray(wishData?.wishlist) ? wishData.wishlist : [];

    renderStats(trips, wishes);
    renderTimeline(trips);
    renderYearHeat(trips);
    renderWishlist(wishes);
  } catch (err) {
    console.error("旅程日志数据加载失败", err);
    showDataHint();

    // 错误时撤下骨架，避免微光占位永久残留
    ["#stats-grid", "#page-timeline", "#wish-grid"].forEach((selector) => {
      clearSkeleton(document.querySelector(selector));
    });

    const wrap = document.querySelector("#journey-wrap");
    if (!wrap) return;

    const message = document.createElement("p");
    message.className = "empty-state";
    message.style.marginBlock = "80px";
    message.textContent = "旅程日志加载失败，请稍后重试。";
    wrap.appendChild(message);
  }
});

/* ===== 统计概览 ===== */
function renderStats(trips, wishes) {
  const grid = document.querySelector("#stats-grid");
  if (!grid) return;

  clearSkeleton(grid);

  const photoCount = trips.reduce(
    (total, trip) =>
      total +
      (Array.isArray(trip?.photos)
        ? trip.photos.filter((p) => typeof p === "string" && p.trim()).length
        : 0),
    0
  );

  const cities = new Set();
  trips.forEach((trip) => {
    const city = extractCity(trip);
    if (city) cities.add(city);
  });

  const highlightCount = trips.reduce(
    (total, trip) => total + (Array.isArray(trip?.highlights) ? trip.highlights.length : 0),
    0
  );

  const plannedWishes = wishes.filter((w) => w?.status === "planned").length;

  const items = [
    { icon: "🧭", label: "累计旅程", value: trips.length },
    { icon: "📷", label: "快门次数", value: photoCount },
    { icon: "🏙️", label: "足迹城市", value: cities.size },
    { icon: "📍", label: "精确坐标", value: highlightCount },
    { icon: "🗓️", label: "已排期行程", value: plannedWishes },
  ];

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "stat-card beam";
    card.setAttribute("data-reveal", "zoom");
    card.style.setProperty("--d", `${index * 0.08}s`);

    const icon = document.createElement("span");
    icon.className = "stat-icon";
    icon.textContent = item.icon;
    icon.setAttribute("aria-hidden", "true");

    const value = document.createElement("b");
    value.setAttribute("data-count", String(item.value));
    value.textContent = "0";

    const label = document.createElement("small");
    label.textContent = item.label;

    card.append(icon, value, label);
    fragment.appendChild(card);
  });

  grid.replaceChildren(fragment);
  grid.querySelectorAll("[data-count]").forEach((el) => observeReveal(el));
  grid.querySelectorAll("[data-reveal]").forEach((el) => observeReveal(el));
  grid
    .querySelectorAll("[data-count]")
    .forEach((el) => animateCount(el, Number(el.dataset.count) || 0));
}

/* ===== 旅程时间线 ===== */
function renderTimeline(trips) {
  const wrap = document.querySelector("#page-timeline");
  if (!wrap) return;

  clearSkeleton(wrap);

  if (!trips.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "时间线还是空的，去编辑 data/trips.json 添加第一段旅程吧。";
    wrap.replaceChildren(empty);
    return;
  }

  const sorted = [...trips].sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));
  const fragment = document.createDocumentFragment();
  let lastYear = null;
  let index = 0;

  sorted.forEach((trip) => {
    const dateText = indexText(trip?.date, "", 40);
    const year = /^\d{4}/.test(dateText) ? dateText.slice(0, 4) : "日期待补充";

    if (year !== lastYear) {
      lastYear = year;
      const yearBadge = document.createElement("div");
      yearBadge.className = "tl-year";
      yearBadge.setAttribute("data-reveal", "");
      yearBadge.innerHTML = `<span>${escapeHTML(year)}</span>`;
      fragment.appendChild(yearBadge);
      index = 0;
    }

    fragment.appendChild(createTimelineEntry(trip, index));
    index += 1;
  });

  wrap.replaceChildren(fragment);
  wrap.querySelectorAll("[data-reveal]").forEach((el) => observeReveal(el));
  setupTimelineProgress();
}

/* ===== 时间线进度光点：随面板滚动沿中轴线下滑 ===== */
function setupTimelineProgress() {
  const panel = document.querySelector("#tl-panel");
  const dot = document.querySelector("#tlProgressDot");
  if (!panel || !dot) return;

  const wrap = panel.parentElement;
  const update = () => {
    const max = panel.scrollHeight - panel.clientHeight;
    const progress = max > 0 ? panel.scrollTop / max : 0;
    const travel = panel.clientHeight - 26;
    dot.style.top = `${10 + progress * travel}px`;
  };

  panel.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
}

function createTimelineEntry(trip, index) {
  let titleLink = null;
  const entry = document.createElement("article");
  entry.className = `tl-entry ${index % 2 === 0 ? "left" : "right"}`;
  entry.setAttribute("data-reveal", index % 2 === 0 ? "left" : "right");
  entry.style.setProperty("--d", "0.05s");

  const card = document.createElement("div");
  card.className = "card tl-card";

  const media = document.createElement("div");
  media.className = "card-media tl-media";

  const cover = document.createElement("span");
  cover.className = "media-fallback";
  cover.textContent = indexText(trip?.moodEmoji, "🧭", 8);
  cover.setAttribute("aria-hidden", "true");
  media.appendChild(cover);

  const coverPath =
    Array.isArray(trip?.photos) && typeof trip.photos[0] === "string"
      ? trip.photos[0]
      : "";

  const coverURL = safeSameOriginURL(coverPath);
  if (coverURL) {
    const image = new Image();
    image.loading = "lazy";
    image.decoding = "async";
    image.alt = `${indexText(trip?.title, "旅程", 80)}封面`;
    image.addEventListener(
      "load",
      () => {
        image.classList.add("is-loaded");
        cover.remove();
      },
      { once: true }
    );
    image.addEventListener("error", () => image.remove(), { once: true });
    image.src = coverURL.href;
    media.appendChild(image);
  }

  const dateBadge = document.createElement("span");
  dateBadge.className = "card-index";
  dateBadge.textContent =
    indexText(trip?.date, "日期待补充", 40) || "日期待补充";
  media.appendChild(dateBadge);

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h3");
  titleLink = document.createElement("a");
  titleLink.href = `trip.html?id=${encodeURIComponent(indexText(trip?.id, "", 60))}`;
  titleLink.textContent = indexText(trip?.title, "未命名旅程", 80);
  titleLink.style.color = "inherit";
  titleLink.style.textDecoration = "none";
  title.appendChild(titleLink);

  const meta = document.createElement("div");
  meta.className = "trip-meta";
  meta.innerHTML =
    `<span>📍 ${escapeHTML(indexText(trip?.location, "地点待补充", 100))}</span>` +
    (indexText(trip?.duration, "", 40)
      ? `<span>⏱ ${escapeHTML(indexText(trip?.duration, "", 40))}</span>`
      : "");

  body.append(title, meta);

  const photoCount = Array.isArray(trip?.photos)
    ? trip.photos.filter((p) => typeof p === "string" && p.trim()).length
    : 0;

  const tripId = encodeURIComponent(indexText(trip?.id, "", 60));
  const link = document.createElement("a");
  link.className = "trip-link";
  link.href = `trip.html?id=${tripId}`;
  link.innerHTML =
    `查看该旅程全部照片（${photoCount} 张） <span class="arr" aria-hidden="true">→</span>`;

  body.appendChild(link);

  // 整卡可点击进入详情
  card.style.cursor = "pointer";
  card.addEventListener("click", () => {
    window.location.href = `trip.html?id=${tripId}`;
  });

  card.append(media, body);
  entry.appendChild(card);

  const dot = document.createElement("span");
  dot.className = "tl-dot";
  dot.setAttribute("aria-hidden", "true");
  entry.appendChild(dot);

  return entry;
}

/* ===== 心愿清单 ===== */
function renderWishlist(wishes) {
  const grid = document.querySelector("#wish-grid");
  if (!grid) return;

  clearSkeleton(grid);

  const sorted = [...wishes].sort((a, b) => {
    const rank = (w) => (w?.status === "planned" ? 0 : 1);
    return rank(a) - rank(b);
  });

  const fragment = document.createDocumentFragment();

  sorted.forEach((wish, index) => {
    const planned = wish?.status === "planned";

    const card = document.createElement("article");
    card.className = "card wish-card" + (planned ? " is-planned" : "");
    card.setAttribute("data-reveal", "zoom");
    card.style.setProperty("--d", `${Math.min(index * 0.06, 0.3)}s`);

    const top = document.createElement("div");
    top.className = "wish-top";

    const emoji = document.createElement("span");
    emoji.className = "wish-emoji";
    emoji.textContent = String(wish?.emoji || "🌍");
    emoji.setAttribute("aria-hidden", "true");

    const status = document.createElement("span");
    status.className = "wish-status";
    status.textContent = planned ? "🗓️ 计划中" : "💭 梦想清单";

    top.append(emoji, status);

    const name = document.createElement("h3");
    name.textContent = indexText(wish?.name, "未命名目的地", 60);

    const region = document.createElement("p");
    region.className = "wish-region";
    region.textContent = indexText(wish?.region, "地区待补充", 80);

    const note = document.createElement("p");
    note.className = "wish-note";
    note.textContent = indexText(wish?.note, "", 200);

    const tagBox = document.createElement("div");
    tagBox.className = "tags";
    (Array.isArray(wish?.tags) ? wish.tags : []).forEach((value) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = String(value);
      tagBox.appendChild(tag);
    });

    card.append(top, name, region);
    if (note.textContent) card.appendChild(note);
    if (tagBox.childElementCount) card.appendChild(tagBox);

    fragment.appendChild(card);
  });

  if (!fragment.childNodes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "心愿清单还是空的，去 data/wishlist.json 写下第一个目的地吧。";
    fragment.appendChild(empty);
  }

  grid.replaceChildren(fragment);
  grid.querySelectorAll("[data-reveal]").forEach((el) => observeReveal(el));

  updateWishProgress(wishes);
}

function updateWishProgress(wishes) {
  const bar = document.querySelector("#wishProgressBar");
  const text = document.querySelector("#wishProgressText");
  const progress = document.querySelector(".wish-progress");
  if (!bar || !text || !progress) return;

  const total = wishes.length;
  const unlocked = wishes.filter((w) => w?.status === "planned").length;
  const percent = total ? Math.round((unlocked / total) * 100) : 0;

  progress.setAttribute("aria-valuenow", String(percent));
  bar.style.width = percent + "%";
  text.textContent = unlocked + " / " + total + " 已解锁";
}

/* ===== 年度旅行节奏（月度热力条） ===== */
function renderYearHeat(trips) {
  const wrap = document.querySelector("#year-heat");
  if (!wrap) return;

  const months = [
    ["1月"], ["2月"], ["3月"], ["4月"], ["5月"], ["6月"],
    ["7月"], ["8月"], ["9月"], ["10月"], ["11月"], ["12月"],
  ];
  const perMonth = months.map(([label]) => ({ label, photos: 0, trips: [] }));

  trips.forEach((trip) => {
    const month = Number(String(trip?.date || "").slice(5, 7));
    if (!month || month < 1 || month > 12) return;
    const count = (Array.isArray(trip?.photos) ? trip.photos : []).length;
    perMonth[month - 1].photos += count;
    const title = indexText(trip?.title, "", 60);
    if (title) perMonth[month - 1].trips.push(title);
  });

  const max = Math.max(1, ...perMonth.map((m) => m.photos));
  const fragment = document.createDocumentFragment();

  perMonth.forEach((m) => {
    const cell = document.createElement("div");
    cell.className = "heat-cell";
    cell.style.setProperty("--h", `${Math.round((m.photos / max) * 100)}%`);

    const bar = document.createElement("i");
    bar.style.setProperty("--h", "0%");

    const tip = document.createElement("span");
    tip.className = "heat-tip";
    tip.textContent = m.photos
      ? `${m.label} · ${m.photos} 张${m.trips.length ? "（" + m.trips[0] + "）" : ""}`
      : `${m.label} · 无记录`;
    bar.appendChild(tip);

    const label = document.createElement("small");
    label.textContent = m.label;

    cell.append(bar, label);
    fragment.appendChild(cell);
  });

  wrap.replaceChildren(fragment);
  observeReveal(wrap);

  if (REDUCED_MOTION || window.WEBDRIVER_MODE) {
    wrap.querySelectorAll(".heat-cell").forEach((cell) => {
      const bar = cell.querySelector("i");
      bar.style.setProperty("--h", cell.style.getPropertyValue("--h"));
    });
    return;
  }
  // 入场后让热力条生长到目标高度
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      wrap.querySelectorAll(".heat-cell").forEach((cell) => {
        const bar = cell.querySelector("i");
        bar.style.setProperty("--h", cell.style.getPropertyValue("--h"));
      });
    }, 120);
  });
}

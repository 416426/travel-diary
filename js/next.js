"use strict";

// next.js — 下一次旅行页：翻牌倒计时、行前指南（天气/穿搭/装备）、
// 行程节奏时间轴、可勾选出发清单（localStorage 持久化）、此行亮点

let tripData = null;

const CHECKLIST_STORAGE_KEY = "td-checklist-v1";
const CHECKLIST_ESSENTIALS = [
  "身份证件 / 钱包",
  "充电宝与线材",
  "常用药品包",
  "湿巾与垃圾袋（无痕露营）",
];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { nextTrip } = await loadJSON("data/profile.json");

    if (!nextTrip || typeof nextTrip !== "object") {
      throw new Error("Invalid next-trip data");
    }

    tripData = nextTrip;
    renderHero(nextTrip);
    renderWeather(nextTrip.weather);
    renderPacking(nextTrip.packing);
    renderRoute(nextTrip.route);
    renderPlan(nextTrip);
    renderChecklist(nextTrip);
    startCountdown(nextTrip.date);
  } catch {
    console.error("下一次旅行数据加载失败");
    showDataHint();

    const wrap = document.querySelector("#next-wrap");
    if (!wrap) return;

    const message = document.createElement("p");
    message.className = "empty-state";
    message.style.marginBlock = "80px";
    message.textContent = "加载失败，请稍后重试。";
    wrap.replaceChildren(message);
  }
});

/* ===== Hero：标题（无 emoji）+ 信息胶囊 ===== */
function renderHero(t) {
  const dest = document.querySelector("#next-dest");
  if (dest) dest.textContent = String(t.destination || "目的地待确认");

  const chips = document.querySelector("#next-chips");
  if (!chips) return;

  const statusLabel = t.status === "planning" ? "计划筹备中" : "筹备中";
  const items = [
    { icon: "📅", text: `${t.date || "日期待确认"}` },
    { icon: "⏱", text: `${t.duration || "时长待确认"}` },
    { icon: "🚩", text: statusLabel },
  ];

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "meta-chip";
    chip.innerHTML =
      `<i aria-hidden="true">${item.icon}</i>${escapeHTML(item.text)}`;
    fragment.appendChild(chip);
  });

  chips.replaceChildren(fragment);
}

/* ===== 天气 ===== */
function renderWeather(weather) {
  if (!weather || typeof weather !== "object") return;

  const setText = (selector, value, fallback = "暂无参考") => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value || fallback;
  };

  setText("#weather-day", weather.day);
  setText("#weather-night", weather.night);
  setText("#weather-rain", weather.rain);
  setText("#weather-wind", weather.wind);
  setText("#weather-summary", weather.summary);
  setText("#weather-source", `📊 ${weather.source || "来源待补充"}`);
  setText("#weather-note", `⚠️ ${weather.note || "历史气候参考，非实时预报"}`);
}

/* ===== 穿衣与装备 ===== */
function renderPacking(packing) {
  if (!packing || typeof packing !== "object") return;

  const setText = (selector, value, fallback = "待确认") => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value || fallback;
  };

  setText("#packing-morning", packing.morning);
  setText("#packing-day", packing.day);
  setText("#packing-night", packing.night);
  setText("#packing-summary", packing.summary);
  setText("#packing-note", `⚠️ ${packing.note || "出发前请查看实时天气"}`);

  const tags = document.querySelector("#packing-gear");
  if (tags) {
    const fragment = document.createDocumentFragment();

    (Array.isArray(packing.gear) ? packing.gear : []).forEach((gear) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = String(gear);
      fragment.appendChild(tag);
    });

    tags.replaceChildren(fragment);
  }
}

/* ===== 行程节奏（时间轴，无地图） ===== */
function renderRoute(route) {
  if (!route || typeof route !== "object") return;

  const stamp = document.querySelector("#route-stamp");
  if (stamp) {
    stamp.textContent = `${tripData?.date || ""} · ${tripData?.duration || ""} · ${tripData?.destination || ""}`;
  }

  const timeline = document.querySelector("#route-list");
  if (timeline) {
    const fragment = document.createDocumentFragment();
    const stops = Array.isArray(route.stops) ? route.stops : [];

    stops.forEach((stop, index) => {
      const item = document.createElement("div");
      const name = document.createElement("b");
      const coordinates = document.createElement("small");

      item.className = "tl-item";
      name.textContent = `${stop.name || "未命名地点"}`;
      coordinates.textContent =
        `${index + 1}/${stops.length} · 坐标 ${stop.lat ?? "--"}, ${stop.lng ?? "--"}`;

      item.append(name, coordinates);
      fragment.appendChild(item);
    });

    timeline.replaceChildren(fragment);
  }

  const note = document.querySelector("#route-note");
  if (note) {
    note.textContent = `⚠️ ${route.note || "建议路线，非实时导航"}`;
  }
}

/* ===== 此行亮点 ===== */
function renderPlan(t) {
  const plan = document.querySelector("#next-plan");
  if (plan) plan.textContent = t.plan || "暂无参考";

  const pills = document.querySelector("#next-highlights");
  if (!pills) return;

  const fragment = document.createDocumentFragment();

  (Array.isArray(t.highlights) ? t.highlights : []).forEach((highlight) => {
    const pill = document.createElement("span");
    pill.textContent = String(highlight);
    fragment.appendChild(pill);
  });

  pills.replaceChildren(fragment);
}

/* ===== 出发清单（localStorage 持久化） ===== */
function checklistItems(packing) {
  const gear = Array.isArray(packing?.gear) ? packing.gear.map(String) : [];
  return [...CHECKLIST_ESSENTIALS, ...gear].map((text, index) => ({
    id: `item-${index}-${text}`,
    text,
  }));
}

function loadChecklistState() {
  try {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveChecklistState(state) {
  try {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 隐私模式下静默失败，不影响浏览 */
  }
}

function renderChecklist(trip) {
  const list = document.querySelector("#checklist-list");
  if (!list) return;

  const items = checklistItems(trip.packing);
  const state = loadChecklistState();

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "check-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `ck-${simpleHash(item.id)}`;
    checkbox.checked = Boolean(state[item.id]);
    checkbox.setAttribute("aria-label", item.text);

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = item.text;

    li.append(checkbox, label);
    fragment.appendChild(li);

    checkbox.addEventListener("change", () => {
      const latest = loadChecklistState();
      if (checkbox.checked) latest[item.id] = true;
      else delete latest[item.id];
      saveChecklistState(latest);
      li.classList.toggle("done", checkbox.checked);
      updateChecklistProgress(items, loadChecklistState());
    });

    if (checkbox.checked) li.classList.add("done");
  });

  list.replaceChildren(fragment);

  const reset = document.querySelector("#checklist-reset");
  if (reset) {
    reset.addEventListener("click", () => {
      saveChecklistState({});
      list.querySelectorAll("input[type='checkbox']").forEach((box) => {
        box.checked = false;
        box.closest(".check-item")?.classList.remove("done");
      });
      updateChecklistProgress(items, {});
    });
  }

  const note = document.querySelector("#checklist-note");
  if (note) {
    note.textContent = "进度只保存在这台设备的浏览器里。";
  }

  updateChecklistProgress(items, loadChecklistState());
}

function updateChecklistProgress(items, state) {
  const bar = document.querySelector("#checklistBar");
  const text = document.querySelector("#checklistText");
  const progress = document.querySelector(".checklist-progress");
  if (!bar || !text) return;

  const total = items.length;
  const done = items.filter((item) => state[item.id]).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  if (progress) progress.setAttribute("aria-valuenow", String(percent));
  bar.style.width = `${percent}%`;
  text.textContent = `已备 ${done} / ${total}`;
}

function simpleHash(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/* ===== 翻牌倒计时 ===== */
function startCountdown(dateString) {
  const target = new Date(dateString).getTime();
  const days = document.querySelector("#cd-days");
  const hours = document.querySelector("#cd-hours");
  const minutes = document.querySelector("#cd-min");
  const seconds = document.querySelector("#cd-sec");

  if (!Number.isFinite(target) || !days || !hours || !minutes || !seconds) {
    return;
  }

  let timerId = 0;

  function setNum(element, value) {
    const text = String(value).padStart(2, "0");
    if (element.textContent === text) return;

    element.textContent = text;
    element.classList.remove("tick");
    void element.offsetWidth; // 重触发动画
    element.classList.add("tick");
  }

  function tick() {
    const difference = target - Date.now();

    if (difference <= 0) {
      setNum(days, 0);
      setNum(hours, 0);
      setNum(minutes, 0);
      setNum(seconds, 0);

      if (timerId) window.clearInterval(timerId);

      const countdown = document.querySelector(".countdown");
      if (countdown && !document.querySelector(".countdown-done")) {
        const message = document.createElement("p");
        message.className = "countdown-done";
        message.textContent = "🎉 旅行已开始或已出发！";
        countdown.insertAdjacentElement("afterend", message);
      }
      return;
    }

    setNum(days, Math.floor(difference / 86400000));
    setNum(hours, Math.floor((difference % 86400000) / 3600000));
    setNum(minutes, Math.floor((difference % 3600000) / 60000));
    setNum(seconds, Math.floor((difference % 60000) / 1000));
  }

  tick();
  timerId = window.setInterval(tick, 1000);
}

function escapeHTML(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

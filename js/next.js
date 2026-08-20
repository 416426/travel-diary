// next.js — 下一次旅行预告 + Tab 推荐卡（天气/路线/穿衣）
let routeData = null;
let tripData = null;
let routeMapInit = false;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { nextTrip } = await loadJSON("data/profile.json");

    if (!nextTrip || typeof nextTrip !== "object") {
      throw new Error("Invalid next-trip data");
    }

    tripData = nextTrip;
    renderNext(nextTrip);
    startCountdown(nextTrip.date);
    renderWeather(nextTrip.weather);
    renderRoute(nextTrip.route);
    renderPacking(nextTrip.packing);
    initTabs();
  } catch {
    console.error("下一次旅行数据加载失败");

    const wrap = document.querySelector("#next-wrap");
    if (!wrap) return;

    const message = document.createElement("p");
    message.textContent = "加载失败，请稍后重试。";
    message.style.cssText = "padding:40px;text-align:center";
    wrap.replaceChildren(message);
  }
});

function renderNext(t) {
  const title = document.querySelector("#next-title");
  const date = document.querySelector("#next-date");
  const plan = document.querySelector("#next-plan");
  const pills = document.querySelector("#next-highlights");

  if (title) title.textContent = `🌍 ${t.destination || "目的地待确认"}`;
  if (date) date.textContent = `${t.date || "日期待确认"} · ${t.duration || "时长待确认"}`;
  if (plan) plan.textContent = t.plan || "暂无参考";

  if (pills) {
    const fragment = document.createDocumentFragment();

    (Array.isArray(t.highlights) ? t.highlights : []).forEach((highlight) => {
      const pill = document.createElement("span");
      pill.textContent = String(highlight);
      fragment.appendChild(pill);
    });

    pills.replaceChildren(fragment);
  }
}

// ☀️ 天气预览
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

// 🧭 行程路线（时间轴 + 延迟地图）
function renderRoute(route) {
  if (!route || typeof route !== "object") return;

  routeData = route;

  const timeline = document.querySelector("#route-list");
  if (timeline) {
    const fragment = document.createDocumentFragment();
    const stops = Array.isArray(route.stops) ? route.stops : [];

    stops.forEach((stop) => {
      const item = document.createElement("div");
      const name = document.createElement("b");
      const coordinates = document.createElement("small");

      item.className = "tl-item";
      name.textContent = stop.name || "未命名地点";
      coordinates.textContent = `${stop.lat ?? "--"}, ${stop.lng ?? "--"}`;

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

function ensureRouteMap() {
  if (routeMapInit || !routeData) return;

  const element = document.querySelector("#route-map");
  if (!element || typeof L === "undefined") return;

  const stops = (Array.isArray(routeData.stops) ? routeData.stops : [])
    .filter((stop) => Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng)))
    .map((stop) => ({
      ...stop,
      lat: Number(stop.lat),
      lng: Number(stop.lng),
    }));

  const fallbackCenter = {
    lat: Number(tripData?.lat),
    lng: Number(tripData?.lng),
  };

  const center = stops.length
    ? stops[Math.floor(stops.length / 2)]
    : fallbackCenter;

  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
    element.textContent = "🗺️ 暂无有效路线坐标。";
    return;
  }

  try {
    routeMapInit = true;

    const map = L.map(element, {
      scrollWheelZoom: false,
    }).setView([center.lat, center.lng], 9);

    window._routeMap = map;

    const tiles = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(map);

    tiles.on("tileerror", () => {
      map.remove();
      window._routeMap = null;
      element.textContent = "🗺️ 地图加载失败，请参考右侧文字路线与坐标。";
    });

    const points = stops.map((stop) => [stop.lat, stop.lng]);

    if (points.length > 1) {
      L.polyline(points, {
        color: "#c96f4a",
        weight: 4,
        opacity: 0.85,
      }).addTo(map);
    }

    points.forEach((point, index) => {
      const popup = document.createElement("b");
      popup.textContent = stops[index].name || "未命名地点";

      L.circleMarker(point, {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: "#2e5d6e",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup(popup);
    });

    if (points.length) {
      map.fitBounds(L.latLngBounds(points).pad(0.4));
    }
  } catch {
    routeMapInit = false;
    console.error("路线地图初始化失败");
    element.textContent = "🗺️ 地图加载失败，请参考右侧文字路线与坐标。";
  }
}

// 🧥 穿衣指南
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
  setText(
    "#packing-note",
    `⚠️ ${packing.note || "出发前请查看实时天气"}`,
  );

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

// ===== Tab 切换（JS 驱动指示器 + 面板动画）=====
function initTabs() {
  const tabList = document.querySelector(".tab-nav");
  const buttons = Array.from(document.querySelectorAll(".tab-btn"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));
  const indicator = document.querySelector(".tab-indicator");

  if (!tabList || !buttons.length || !indicator) return;

  function syncTabState(activeButton) {
    const activePanelId = activeButton.dataset.panel;

    buttons.forEach((button) => {
      const isActive = button === activeButton;

      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.id === activePanelId;

      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });

    if (activePanelId === "panel-route") {
      ensureRouteMap();

      window.setTimeout(() => {
        window._routeMap?.invalidateSize();
      }, 120);
    }
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      syncTabState(button);

      indicator.style.left = button.offsetLeft + "px";
      indicator.style.width = button.offsetWidth + "px";
    });

    button.addEventListener("keydown", (event) => {
      let targetIndex = index;

      if (event.key === "ArrowRight") {
        targetIndex = (index + 1) % buttons.length;
      } else if (event.key === "ArrowLeft") {
        targetIndex = (index - 1 + buttons.length) % buttons.length;
      } else if (event.key === "Home") {
        targetIndex = 0;
      } else if (event.key === "End") {
        targetIndex = buttons.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      buttons[targetIndex].focus();
      buttons[targetIndex].click();
    });
  });

  const initialButton =
    buttons.find((button) => button.classList.contains("active")) ||
    buttons[0];

  syncTabState(initialButton);
  indicator.style.left = initialButton.offsetLeft + "px";
  indicator.style.width = initialButton.offsetWidth + "px";

  let resizeFrame = 0;

  window.addEventListener(
    "resize",
    () => {
      window.cancelAnimationFrame(resizeFrame);

      resizeFrame = window.requestAnimationFrame(() => {
        const activeButton =
          buttons.find((button) => button.classList.contains("active")) ||
          buttons[0];

        indicator.style.left = activeButton.offsetLeft + "px";
        indicator.style.width = activeButton.offsetWidth + "px";
      });
    },
    { passive: true },
  );

  document.fonts?.ready.then(() => {
    const activeButton =
      buttons.find((button) => button.classList.contains("active")) ||
      buttons[0];

    indicator.style.left = activeButton.offsetLeft + "px";
    indicator.style.width = activeButton.offsetWidth + "px";
  });
}

// 倒计时
function startCountdown(dateString) {
  const target = new Date(dateString).getTime();
  const days = document.querySelector("#cd-days");
  const hours = document.querySelector("#cd-hours");
  const minutes = document.querySelector("#cd-min");
  const seconds = document.querySelector("#cd-sec");

  if (
    !Number.isFinite(target) ||
    !days ||
    !hours ||
    !minutes ||
    !seconds
  ) {
    return;
  }

  let timerId = 0;

  function tick() {
    const difference = target - Date.now();

    if (difference <= 0) {
      days.textContent = "0";
      hours.textContent = "0";
      minutes.textContent = "0";
      seconds.textContent = "0";

      if (timerId) window.clearInterval(timerId);

      const countdown = document.querySelector(".countdown");
      if (countdown && !document.querySelector(".countdown-finished")) {
        const message = document.createElement("p");
        message.className = "countdown-finished";
        message.textContent = "🎉 旅行已开始或已出发！";
        message.style.cssText = "text-align:center;margin-top:14px";
        countdown.insertAdjacentElement("afterend", message);
      }

      return;
    }

    days.textContent = String(
      Math.floor(difference / 86400000),
    ).padStart(2, "0");

    hours.textContent = String(
      Math.floor((difference % 86400000) / 3600000),
    ).padStart(2, "0");

    minutes.textContent = String(
      Math.floor((difference % 3600000) / 60000),
    ).padStart(2, "0");

    seconds.textContent = String(
      Math.floor((difference % 60000) / 1000),
    ).padStart(2, "0");
  }

  tick();
  timerId = window.setInterval(tick, 1000);
}
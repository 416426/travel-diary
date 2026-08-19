// next.js — 下一次旅行预告 + Tab 推荐卡（天气/路线/穿衣）
let routeData = null, tripData = null, routeMapInit = false;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { nextTrip } = await loadJSON("data/profile.json");
    tripData = nextTrip;
    renderNext(nextTrip);
    startCountdown(nextTrip.date);
    renderWeather(nextTrip.weather);
    renderRoute(nextTrip.route);   // 只渲染时间轴，地图等 Tab 显示时初始化
    renderPacking(nextTrip.packing);
    initTabs();
  } catch (err) {
    console.error(err);
    document.querySelector("#next-wrap").innerHTML = `<p style="padding:40px;text-align:center">加载失败：${err.message}</p>`;
  }
});

function renderNext(t) {
  document.querySelector("#next-title").textContent = "🌍 " + t.destination;
  document.querySelector("#next-date").textContent = `${t.date} · ${t.duration}`;
  document.querySelector("#next-plan").textContent = t.plan || "暂无参考";
  const pills = document.querySelector("#next-highlights");
  pills.innerHTML = (t.highlights || []).map((h) => `<span>${h}</span>`).join("");
}

// ☀️ 天气预览
function renderWeather(w) {
  if (!w) return;
  const set = (id, v) => { const el = document.querySelector(id); if (el) el.textContent = v || "暂无参考"; };
  set("#weather-day", w.day);
  set("#weather-night", w.night);
  set("#weather-rain", w.rain);
  set("#weather-wind", w.wind);
  set("#weather-summary", w.summary);
  set("#weather-source", "📊 " + (w.source || "来源待补充"));
  set("#weather-note", "⚠️ " + (w.note || "历史气候参考，非实时预报"));
}

// 🧭 行程路线（时间轴 + 延迟地图）
function renderRoute(r) {
  if (!r) return;
  routeData = r;
  const tl = document.querySelector("#route-list");
  tl.innerHTML = (r.stops || []).map((s) =>
    `<div class="tl-item"><b>${s.name}</b><small>${s.lat}, ${s.lng}</small></div>`
  ).join("");
  document.querySelector("#route-note").textContent = "⚠️ " + (r.note || "建议路线，非实时导航");
}

function ensureRouteMap() {
  if (routeMapInit || !routeData) return;
  routeMapInit = true;
  const el = document.querySelector("#route-map");
  if (!el || typeof L === "undefined") return;
  try {
    const stops = routeData.stops || [];
    const center = stops.length ? stops[Math.floor(stops.length / 2)] : tripData;
    const map = L.map(el, { scrollWheelZoom: false }).setView([center.lat, center.lng], 9);
    window._routeMap = map;
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    tiles.on("tileerror", () => { el.innerHTML = `<p style="padding:24px;text-align:center;color:#6b655c">🗺️ 地图加载失败，请参考右侧文字路线与坐标。</p>`; });
    const pts = stops.map((s) => [s.lat, s.lng]);
    L.polyline(pts, { color: "#c96f4a", weight: 4, opacity: 0.85 }).addTo(map);
    pts.forEach((p, i) => {
      L.circleMarker(p, { radius: 7, color: "#fff", weight: 2, fillColor: "#2e5d6e", fillOpacity: 1 })
        .addTo(map).bindPopup(`<b>${stops[i].name}</b>`);
    });
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.4));
  } catch (err) { console.error(err); }
}

// 🧥 穿衣指南
function renderPacking(p) {
  if (!p) return;
  const set = (id, v) => { const el = document.querySelector(id); if (el) el.textContent = v || "待确认"; };
  set("#packing-morning", p.morning);
  set("#packing-day", p.day);
  set("#packing-night", p.night);
  const tags = document.querySelector("#packing-gear");
  tags.innerHTML = (p.gear || []).map((g) => `<span class="tag">${g}</span>`).join("");
  set("#packing-summary", p.summary);
  set("#packing-note", "⚠️ " + (p.note || "出发前请查看实时天气"));
}

// ===== Tab 切换（滑动指示器 + 面板动画）=====
function initTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  const indicator = document.querySelector(".tab-indicator");
  if (!btns.length || !indicator) return;

  function moveIndicator(btn) {
    indicator.style.left = btn.offsetLeft + "px";
    indicator.style.width = btn.offsetWidth + "px";
  }

  function showPanel(id) {
    panels.forEach((p) => p.classList.toggle("active", p.id === id));
    if (id === "panel-route") {
      ensureRouteMap();
      setTimeout(() => { if (window._routeMap) window._routeMap.invalidateSize(); }, 120);
    }
  }

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      showPanel(btn.dataset.panel);
      moveIndicator(btn);
    });
  });

  moveIndicator(document.querySelector(".tab-btn.active"));
  window.addEventListener("resize", () => {
    const active = document.querySelector(".tab-btn.active");
    if (active) moveIndicator(active);
  });
}

// 倒计时
function startCountdown(dateStr) {
  const target = new Date(dateStr).getTime();
  const elDays = document.querySelector("#cd-days");
  const elH = document.querySelector("#cd-hours");
  const elM = document.querySelector("#cd-min");
  const elS = document.querySelector("#cd-sec");

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      elDays.textContent = "0"; elH.textContent = "0"; elM.textContent = "0"; elS.textContent = "0";
      document.querySelector(".countdown").insertAdjacentHTML("afterend", `<p style="text-align:center;margin-top:14px">🎉 旅行已开始或已出发！</p>`);
      return;
    }
    elDays.textContent = String(Math.floor(diff / 86400000)).padStart(2, "0");
    elH.textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0");
    elM.textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
    elS.textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  }
  tick();
  setInterval(tick, 1000);
}

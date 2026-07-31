// index.js — 首页：旅行地图 + 旅行卡片 + 照片墙
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { trips } = await loadJSON("data/trips.json");
    renderMap(trips);
    renderTrips(trips);
    renderWall(trips);
  } catch (err) {
    console.error(err);
    document.querySelector("#map").innerHTML = `<p style="padding:40px;text-align:center">地图加载失败：${err.message}</p>`;
  }
});

function renderMap(trips) {
  const map = L.map("map").setView([30, 105], 3);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const bounds = [];
  trips.forEach((trip) => {
    // 主位置标记
    const icon = L.divIcon({
      html: `<div style="font-size:26px">${trip.moodEmoji}</div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker([trip.lat, trip.lng], { icon })
      .addTo(map)
      .bindPopup(
        `<b>${trip.title}</b><br>${trip.location}<br>${trip.date} · ${trip.duration}`
      );
    bounds.push([trip.lat, trip.lng]);

    // 高亮点位（精确位置）
    (trip.highlights || []).forEach((h) => {
      L.circleMarker([h.lat, h.lng], {
        radius: 7,
        color: "#c96f4a",
        weight: 2,
        fillColor: "#c96f4a",
        fillOpacity: 0.35,
      })
        .addTo(map)
        .bindPopup(`<b>${h.name}</b><br>${h.note}`);
      bounds.push([h.lat, h.lng]);
    });
  });

  if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
}

function renderTrips(trips) {
  const wrap = document.querySelector("#trips-grid");
  wrap.innerHTML = trips
    .map(
      (t) => `
      <article class="card trip-card fade-in">
        <div class="card-media">
          ${photoTag(t.photos?.[0], t.moodEmoji)}
        </div>
        <div class="card-body">
          <h3>${t.title}</h3>
          <div class="trip-meta">📅 ${t.date} · ⏱ ${t.duration} · 📍 ${t.location}</div>
          <div class="trip-mood">${t.moodEmoji} ${t.mood}</div>
          <p class="trip-thoughts">${t.thoughts}</p>
          <ul class="highlight-list">
            ${(t.highlights || [])
              .map((h) => `<li><span class="dot">📍</span><span class="name">${h.name}</span><span class="note">${h.note}</span></li>`)
              .join("")}
          </ul>
          <div class="tags">${(t.tags || []).map((tag) => `<span class="tag">#${tag}</span>`).join("")}</div>
        </div>
      </article>`
    )
    .join("");
}

function photoTag(path, fallbackEmoji) {
  return `<img src="${path}" alt="" onerror="this.outerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;font-size:56px\\'>${fallbackEmoji}</div>'">`;
}

function renderWall(trips) {
  const wall = document.querySelector("#photo-wall");
  const frag = document.createDocumentFragment();
  trips.forEach((trip) => {
    const photos = trip.photos || [];
    if (photos.length === 0) {
      frag.appendChild(photoEl("", trip.moodEmoji, trip.title));
      return;
    }
    photos.forEach((p, i) => {
      frag.appendChild(photoEl(p, trip.moodEmoji, `${trip.title} #${i + 1}`));
    });
  });
  wall.appendChild(frag);
}

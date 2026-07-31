// next.js — 下一次旅行预告 + 倒计时
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { nextTrip } = await loadJSON("data/profile.json");
    renderNext(nextTrip);
    startCountdown(nextTrip.date);
    renderMap(nextTrip);
  } catch (err) {
    console.error(err);
    document.querySelector("#next-wrap").innerHTML = `<p style="padding:40px;text-align:center">加载失败：${err.message}</p>`;
  }
});

function renderNext(t) {
  document.querySelector("#next-title").textContent = t.destination;
  document.querySelector("#next-date").textContent = `${t.date} · ${t.duration}`;
  document.querySelector("#next-plan").textContent = t.plan;

  const pills = document.querySelector("#next-highlights");
  pills.innerHTML = t.highlights.map((h) => `<span>${h}</span>`).join("");
}

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

function renderMap(t) {
  const map = L.map("next-map").setView([t.lat, t.lng], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const icon = L.divIcon({
    html: `<div style="font-size:30px">🌍</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
  L.marker([t.lat, t.lng], { icon })
    .addTo(map)
    .bindPopup(`<b>${t.destination}</b><br>${t.date} · ${t.duration}`)
    .openPopup();
}

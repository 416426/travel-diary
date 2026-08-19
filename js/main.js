// main.js — 全局共享逻辑：导航高亮、Lightbox 图片查看
document.addEventListener("DOMContentLoaded", () => {
  // 导航高亮
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });
});

// ===== Lightbox =====
function openLightbox(src, caption) {
  let lb = document.querySelector(".lightbox");
  if (!lb) {
    lb = document.createElement("div");
    lb.className = "lightbox";
    document.body.appendChild(lb);
  }
  lb.innerHTML = `<img src="${src}" alt="${caption || ""}"><div class="lb-caption">${caption || ""}</div>`;
  lb.classList.add("show");
}

function closeLightbox() {
  document.querySelectorAll(".lightbox").forEach((lb) => lb.classList.remove("show"));
}

document.addEventListener("click", (e) => {
  if (e.target.classList && e.target.classList.contains("lightbox")) closeLightbox();
  const ph = e.target.closest(".ph");
  if (ph) {
    const img = ph.querySelector("img");
    openLightbox(img ? img.src : ph.dataset.src, ph.dataset.caption);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

// ===== 工具 =====
async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`加载失败: ${url}`);
  return res.json();
}

// 图片存在性检测：不存在则回退为 emoji 占位
function photoEl(path, emoji, caption) {
  const ph = document.createElement("div");
  ph.className = "ph";
  ph.dataset.caption = caption || "";
  const img = new Image();
  img.onload = () => {
    ph.innerHTML = "";
    ph.appendChild(img);
  };
  img.onerror = () => {
    ph.textContent = emoji;
    ph.dataset.src = "";
  };
  img.src = path;
  return ph;
}

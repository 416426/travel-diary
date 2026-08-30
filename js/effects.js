"use strict";

// effects.js — 全站交互动效：预加载 / 自定义光标 / 滚动进度 / 回到顶部 /
// reveal 入场 / 3D tilt / 数字滚动 / 光泽跟随 / 星空画布

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
// 自动化环境（无头截图等）下确定性渲染：入场元素直接可见、计数直接到位
const WEBDRIVER = Boolean(navigator.webdriver);
window.WEBDRIVER_MODE = WEBDRIVER;

document.addEventListener("DOMContentLoaded", () => {
  initPreloader();
  initReveal();
  initScrollProgress();
  initBackToTop();
  initTiltCards();
  initCountUp();
});

/* ===== 预加载 ===== */
function initPreloader() {
  const preloader = document.querySelector("#preloader");
  const finish = () => {
    document.body.classList.add("loaded");
    document.body.classList.remove("loading");

    if (!preloader) return;
    preloader.classList.add("done");
    window.setTimeout(() => preloader.remove(), 700);
  };

  if (REDUCED_MOTION) {
    finish();
    return;
  }

  document.body.classList.add("loading");
  window.addEventListener("load", () => window.setTimeout(finish, 350), { once: true });
  window.setTimeout(finish, 2200); // 兜底：资源过慢也要放行
}

/* ===== 滚动入场 reveal ===== */
let revealObserver = null;

function initReveal() {
  const targets = document.querySelectorAll("[data-reveal]");

  if (REDUCED_MOTION || WEBDRIVER || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in"));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        revealObserver?.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  targets.forEach((el) => revealObserver.observe(el));
}

// 供异步渲染的内容注册入场动画（index/notes 等页面脚本调用）
function observeReveal(el) {
  if (!(el instanceof Element)) return;
  if (!revealObserver || REDUCED_MOTION || WEBDRIVER) {
    el.classList.add("in");
    return;
  }
  revealObserver.observe(el);
}

window.observeReveal = observeReveal;

/* ===== 顶部滚动进度条 ===== */
function initScrollProgress() {
  const bar = document.querySelector("#scrollProgressBar");
  if (!bar) return;

  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = `scaleX(${progress})`;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      window.requestAnimationFrame(update);
      ticking = true;
    },
    { passive: true }
  );
  update();
}

/* ===== 回到顶部（带进度环） ===== */
function initBackToTop() {
  const button = document.querySelector("#toTop");
  if (!button) return;

  const ring = button.querySelector(".ring-fg");
  const RING_LENGTH = 138;

  let ticking = false;
  const update = () => {
    button.classList.toggle("show", window.scrollY > 640);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    if (ring) ring.style.strokeDashoffset = String(RING_LENGTH * (1 - progress));
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      window.requestAnimationFrame(update);
      ticking = true;
    },
    { passive: true }
  );

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? "auto" : "smooth" });
  });

  update();
}

/* ===== 3D tilt 卡片 + 光泽跟随 ===== */
function initTiltCards() {
  if (!FINE_POINTER || REDUCED_MOTION) return;

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    const maxTilt = 7;

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
      card.style.transform =
        `perspective(900px) rotateX(${(0.5 - py) * maxTilt}deg) ` +
        `rotateY(${(px - 0.5) * maxTilt}deg) translateY(-6px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

/* ===== 数字滚动（data-count） ===== */
function initCountUp() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;

  const animate = (el) => {
    const target = Number(el.dataset.count) || 0;
    const duration = 1300;

    if (REDUCED_MOTION) {
      el.textContent = String(target);
      return;
    }

    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  };

  if (!("IntersectionObserver" in window) || REDUCED_MOTION) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* ===== 星空画布（首页 Hero） ===== */
function createStarfield(canvas) {
  if (!canvas || canvas.dataset.bound) return;
  canvas.dataset.bound = "true";

  const ctx = canvas.getContext("2d");
  if (!ctx || REDUCED_MOTION) {
    if (canvas.parentElement) canvas.remove();
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let meteors = [];
  let running = true;
  const mouse = { x: 0.5, y: 0.5 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(230, Math.round((width * height) / 5200));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.3,
      depth: Math.random() * 0.9 + 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.018 + 0.004,
      hue: Math.random() > 0.82 ? "rgba(129,140,248," : "rgba(226,236,255,",
    }));
  }

  function spawnMeteor() {
    if (document.hidden || !running) return;
    meteors.push({
      x: Math.random() * width * 0.8 + width * 0.1,
      y: Math.random() * height * 0.3,
      vx: -(Math.random() * 4 + 5),
      vy: Math.random() * 2.4 + 2.2,
      life: 1,
    });
    window.setTimeout(spawnMeteor, Math.random() * 5200 + 2600);
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    const ox = (mouse.x - 0.5) * 18;
    const oy = (mouse.y - 0.5) * 12;

    for (const star of stars) {
      star.phase += star.speed;
      const alpha = 0.35 + Math.abs(Math.sin(star.phase)) * 0.6;
      const parallax = star.depth;
      ctx.beginPath();
      ctx.arc(
        star.x + ox * parallax,
        star.y + oy * parallax,
        star.r,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `${star.hue}${alpha * (0.4 + parallax * 0.6)})`;
      ctx.fill();
    }

    meteors = meteors.filter((m) => m.life > 0);
    for (const m of meteors) {
      m.x += m.vx;
      m.y += m.vy;
      m.life -= 0.016;
      const gradient = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 12, m.y - m.vy * 12);
      gradient.addColorStop(0, `rgba(190,230,255,${0.85 * m.life})`);
      gradient.addColorStop(1, "rgba(190,230,255,0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 12, m.y - m.vy * 12);
      ctx.stroke();
    }

    window.requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener(
    "pointermove",
    (event) => {
      mouse.x = event.clientX / window.innerWidth;
      mouse.y = event.clientY / window.innerHeight;
    },
    { passive: true }
  );

  // 离开视口即暂停，省电
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        const shouldRun = entries[0]?.isIntersecting ?? true;
        if (shouldRun && !running) {
          running = true;
          frame();
        } else if (!shouldRun) {
          running = false;
        }
      },
      { threshold: 0.02 }
    ).observe(canvas);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      frame();
    }
  });

  resize();
  frame();
  window.setTimeout(spawnMeteor, 1800);
}


/* ===== 横向跑马灯自动滚动（悬停暂停，可手动拖拽） ===== */
// 内容需复制两份实现无缝循环；方向 dir=1 向左，-1 向右
function setupAutoMarquee(el, options = {}) {
  if (!el) return () => {};
  const speed = options.speed ?? 0.55;          // px / 16.7ms
  const dir = options.direction ?? 1;
  let paused = options.paused ?? false;
  let running = true;
  let last = performance.now();

  el.addEventListener("pointerenter", () => { paused = true; });
  el.addEventListener("pointerleave", () => { paused = options.paused ?? false; });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        running = entries[0]?.isIntersecting ?? true;
        last = performance.now();
      },
      { threshold: 0.05 }
    ).observe(el);
  }

  function frame(now) {
    const dt = Math.min(now - last, 64);
    last = now;
    if (running && !paused && !document.hidden && !REDUCED_MOTION) {
      el.scrollLeft += dir * speed * (dt / 16.7);
      const half = el.scrollWidth / 2;
      if (half > 10) {
        if (el.scrollLeft >= half) el.scrollLeft -= half;
        else if (el.scrollLeft <= 0) el.scrollLeft += half;
      }
    }
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
}

/* ===== 拖拽横向滚动（鼠标按住左右拖） ===== */
function enableDragScroll(el) {
  if (!el) return;
  let down = false;
  let startX = 0;
  let startLeft = 0;
  let moved = false;

  el.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") return; // 触屏走原生滚动
    down = true;
    moved = false;
    startX = event.clientX;
    startLeft = el.scrollLeft;
  });
  el.addEventListener("pointermove", (event) => {
    if (!down) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    if (moved) el.scrollLeft = startLeft - dx;
  });
  const end = () => { down = false; };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  // 拖拽后拦截误触点击（避免拖完直接跳转）
  el.addEventListener(
    "click",
    (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        moved = false;
      }
    },
    true
  );
}
"use strict";

// effects.js — 全站交互动效：预加载 / 滚动进度 / 回到顶部 / reveal 入场 /
// 数字滚动 / 逐字标题 / 追光 / 磁吸 / 极光视差 / 星空画布 / 涟漪 / 光标跟随

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
  initCountUp();
  initTextGenerate();
  initSpotlight();
  initMagnetic();
  initAurora();
  initSparkles();
  initRipple();
  initCursorGlow();
  initHeroParallax();
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


/* ===== 缩略图路径（小展示位用缩略图，省带宽防黑块） ===== */
function thumbPath(path) {
  if (typeof path !== "string" || !path.includes("photos/")) return path;
  return path.replace("photos/", "photos/thumbs/");
}



/* ===== JS 瀑布流分列（替代 CSS 多列，规避列断点渲染黑块） ===== */
function masonryColumnCount(width) {
  return width >= 1024 ? 3 : width >= 640 ? 2 : 1;
}

// wall: 容器；nodes: 依次排列的条目元素。返回清理函数。
function makeMasonry(wall, nodes) {
  if (!wall || !nodes) return () => {};
  let count = 0;
  let resizeTimer = 0;

  function layout() {
    const n = masonryColumnCount(wall.clientWidth || innerWidth);
    if (n === count) return;
    count = n;

    wall.replaceChildren();
    const cols = [];
    for (let i = 0; i < n; i += 1) {
      const col = document.createElement("div");
      col.className = "masonry-col";
      wall.appendChild(col);
      cols.push(col);
    }
    nodes.forEach((node, i) => {
      cols[i % n].appendChild(node);
    });
  }

  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layout, 160);
  };
  window.addEventListener("resize", onResize, { passive: true });
  layout();

  return () => {
    window.removeEventListener("resize", onResize);
    window.clearTimeout(resizeTimer);
  };
}

/* ===== 横向跑马灯自动滚动（悬停暂停，可手动拖拽） ===== */
// 内容需复制两份实现无缝循环；方向 dir=1 向左，-1 向右
function setupAutoMarquee(el, options = {}) {
  if (!el) return () => {};
  const speed = options.speed ?? 0.55;          // px / 16.7ms
  const dir = options.direction ?? 1;
  let paused = options.paused ?? false;
  let offscreen = false;
  let last = performance.now();

  // 把现有子元素包进内层轨道，改用 transform 合成器动画（零重绘）
  const track = document.createElement("div");
  track.className = "marquee-track";
  track.setAttribute("aria-hidden", "false");
  while (el.firstChild) track.appendChild(el.firstChild);
  el.appendChild(track);
  el.classList.add("marquee-ready");

  let x = dir < 0 ? -track.scrollWidth / 2 : 0; // 反向行从中点起步
  const half = () => track.scrollWidth / 2;

  el.addEventListener("pointerenter", () => { paused = true; });
  el.addEventListener("pointerleave", () => { paused = false; });

  // 离屏省电：视口外 600px 之外暂停（接近即恢复）
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        offscreen = !(entries[0]?.isIntersecting ?? true);
      },
      { rootMargin: "600px" }
    ).observe(el);
  }

  function frame(now) {
    const dt = Math.min(now - last, 64);
    last = now;
    if (!paused && !offscreen && !document.hidden && !REDUCED_MOTION) {
      x -= dir * speed * (dt / 16.7);
      const h = half();
      if (h > 10) {
        if (x <= -h) x += h;
        else if (x >= 0 && dir < 0) x -= h;
        else if (x > 0 && dir > 0) x -= h;
      }
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    }
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // 拖拽：直接改 x 偏移
  let down = false;
  let startX = 0;
  let startXPos = 0;
  let moved = false;

  el.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") return;
    down = true;
    moved = false;
    startX = event.clientX;
    startXPos = x;
  });
  el.addEventListener("pointermove", (event) => {
    if (!down) return;
    const dx = event.clientX - startX;
    // 超过阈值才捕获指针：普通点击不被重定向到行容器，磁贴可正常跳转
    if (!moved && Math.abs(dx) > 4) {
      moved = true;
      el.setPointerCapture?.(event.pointerId);
    }
    if (moved) {
      x = startXPos + dx;
      const h = half();
      if (h > 10) {
        while (x <= -h) x += h;
        while (x > 0) x -= h;
      }
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    }
  });
  const end = () => { down = false; };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  // 拖拽后拦截误触点击
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
/* ===== 21ST 风格特效层 ===== */

/* 逐字文字生成（纯文本标题自动拆字，blur→清晰 错峰入场） */
function initTextGenerate() {
  if (REDUCED_MOTION || window.WEBDRIVER_MODE || !("IntersectionObserver" in window)) return;

  document.querySelectorAll(".section-title, .page-hero h1").forEach((el) => {
    if (el.dataset.splitDone || el.children.length) return; // 含嵌套结构的标题不拆
    el.dataset.splitDone = "1";
    el.classList.add("split-words");
    el.setAttribute("aria-label", el.textContent.trim());

    const chars = [...el.textContent];
    el.textContent = "";
    chars.forEach((ch, i) => {
      if (ch === " ") {
        el.appendChild(document.createTextNode("\u00A0"));
        return;
      }
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = ch;
      s.style.setProperty("--wd", `${Math.min(i * 0.05, 0.9)}s`);
      el.appendChild(s);
    });

    observeReveal(el);
  });
}

/* 鼠标追光（所有卡片类容器，动态渲染内容自动覆盖） */
function initSpotlight() {
  if (!FINE_POINTER || REDUCED_MOTION || window.WEBDRIVER_MODE) return;

  const SPOT_SELECTOR =
    ".card, .album-tile, .rail-card, .stat-card, .note-card, .guide-card, .wish-card";

  document.addEventListener(
    "pointerover",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest(SPOT_SELECTOR) : null;
      if (!target) return;
      target.setAttribute("data-spot", "");
      if (!target.querySelector(".spot-layer")) {
        const layer = document.createElement("span");
        layer.className = "spot-layer";
        layer.setAttribute("aria-hidden", "true");
        target.appendChild(layer);
      }
    },
    { passive: true }
  );

  document.addEventListener(
    "pointermove",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-spot]") : null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      target.style.setProperty("--my", `${event.clientY - rect.top}px`);
    },
    { passive: true }
  );
}

/* 磁吸按钮（光标靠近时轻微吸附） */
// 元素列表只在初始化与异步渲染后各收集一次，避免 pointermove 高频查询 DOM
function initMagnetic() {
  if (!FINE_POINTER || REDUCED_MOTION || window.WEBDRIVER_MODE) return;

  const selector = ".hero-actions .button, .next-cta .button, .contact-links a";
  let magneticEls = [];
  const collect = () => { magneticEls = Array.from(document.querySelectorAll(selector)); };
  collect();
  window.__collectMagnetic = collect; // 异步渲染后可手动触发重收集

  document.addEventListener(
    "pointermove",
    (event) => {
      magneticEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;
        const dist = Math.hypot(dx, dy);
        const range = Math.max(rect.width, 110) + 40;
        if (dist < range) {
          const pull = (1 - dist / range) * 9;
          el.style.transform = `translate(${(dx / dist) * pull}px, ${(dy / dist) * pull}px)`;
        } else if (el.style.transform) {
          el.style.transform = "";
        }
      });
    },
    { passive: true }
  );
}

/* 极光视差背景（随滚动缓慢流动融合） */
function initAurora() {
  if (REDUCED_MOTION || window.WEBDRIVER_MODE) return;

  const b1 = document.createElement("div");
  const b2 = document.createElement("div");
  b1.className = "bgblob b1";
  b2.className = "bgblob b2";
  b1.setAttribute("aria-hidden", "true");
  b2.setAttribute("aria-hidden", "true");
  document.body.prepend(b2, b1);

  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    b1.style.transform = `translate3d(0, ${y * 0.08}px, 0)`;
    b2.style.transform = `translate3d(0, ${y * -0.05}px, 0)`;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true }
  );
  update();
}


/* ===== 星尘闪烁（时光气泡场） ===== */
function initSparkles() {
  const field = document.querySelector("#bubble-field") || document.querySelector(".page-hero");
  if (!field || REDUCED_MOTION) return;
  field.style.position = field.style.position || "";
  if (getComputedStyle(field).position === "static") field.style.position = "relative";

  for (let i = 0; i < 16; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${(Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 100 * 1}%`;
    spark.style.top = `${(Math.sin(i * 78.233) * 12543.123 % 1 + 1) % 100 * 1}%`;
    spark.style.setProperty("--sd", `${(2 + (i % 5) * 0.7).toFixed(1)}s`);
    spark.style.setProperty("--sdelay", `${(i % 6) * 0.45}s`);
    field.appendChild(spark);
  }
}

/* ===== 点击涟漪反馈 =====
   事件委托：点击按钮类元素时在指针位置生成一圈扩散涟漪。
   目标元素需要有 overflow:hidden 裁剪（.button 已自带，其余见 CSS）。 */
function initRipple() {
  if (REDUCED_MOTION || WEBDRIVER) return;

  const HOST_SELECTOR =
    ".button, .chip, .mode-toggle button, .nav-links a, .to-top, .lb-btn, .month-pill";

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const host = event.target.closest(HOST_SELECTOR);
      if (!host) return;

      // 涟漪依赖 overflow 裁剪；溢出可见的容器跳过，防止涟漪扩散出边界
      const hostStyle = getComputedStyle(host);
      if (hostStyle.overflow === "visible") return;

      const rect = host.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;

      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.setAttribute("aria-hidden", "true");
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = event.clientX - rect.left - size / 2 + "px";
      ripple.style.top = event.clientY - rect.top - size / 2 + "px";

      host.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    },
    { passive: true }
  );
}

/* ===== 简约鼠标跟随光晕 =====
   一枚柔和光斑以 lerp 缓动跟随指针（每帧向目标位置靠近 18%），
   仅桌面精确指针启用；纯装饰，pointer-events:none 不阻挡任何交互。 */
function initCursorGlow() {
  if (!FINE_POINTER || REDUCED_MOTION || WEBDRIVER) return;

  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 3;
  let x = targetX;
  let y = targetY;
  let rafId = 0;

  const frame = () => {
    x += (targetX - x) * 0.18;
    y += (targetY - y) * 0.18;
    glow.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    rafId = window.requestAnimationFrame(frame);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      const firstShow = !glow.classList.contains("on");
      targetX = event.clientX;
      targetY = event.clientY;
      if (firstShow) {
        glow.classList.add("on");
        x = targetX; // 首次出现直接到位，避免从原点飘移
        y = targetY;
      }
      if (!rafId) rafId = window.requestAnimationFrame(frame);
    },
    { passive: true }
  );
}

/* ===== Hero 视差 =====
   首页 hero 内容随滚动轻微上移并淡出，制造层次纵深；
   只写 transform/opacity（合成器属性），不触发布局重排。 */
function initHeroParallax() {
  const heroContent = document.querySelector(".hero .hero-content");
  if (!heroContent || REDUCED_MOTION || WEBDRIVER) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    if (y > window.innerHeight) return; // 滚出首屏后不再计算
    heroContent.style.transform = "translate3d(0," + (y * 0.16).toFixed(1) + "px,0)";
    heroContent.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.85)));
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();
}
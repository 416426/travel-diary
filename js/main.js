"use strict";

// main.js — 全局导航、移动菜单、Lightbox（前后翻页 + 键盘导航）与公共工具

let lastLightboxTrigger = null;
let previousBodyOverflow = "";
let lightboxItems = [];
let lightboxIndex = -1;

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initLightbox();
});

/* ===== 导航 ===== */
function initNavigation() {
  const header = document.querySelector("#siteHeader");
  const toggle = document.querySelector("#navToggle");
  const navLinks = document.querySelector("#navLinks");

  const currentPage =
    window.location.pathname.split("/").filter(Boolean).pop() || "index.html";

  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    let linkPage = "";
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      linkPage = url.pathname.split("/").filter(Boolean).pop() || "index.html";
    } catch {
      return;
    }

    const isCurrent = linkPage === currentPage;
    link.classList.toggle("active", isCurrent);
    if (isCurrent) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  function setMenuOpen(open, returnFocus = false) {
    if (!toggle || !navLinks) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
    navLinks.classList.toggle("open", open);
    document.body.classList.toggle("nav-open", open);
    if (returnFocus) toggle.focus();
  }

  if (toggle && navLinks) {
    setMenuOpen(false);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      setMenuOpen(!expanded);
    });

    navLinks.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) {
        setMenuOpen(false);
      }
    });

    document.addEventListener("click", (event) => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (
        isOpen &&
        event.target instanceof Node &&
        !toggle.contains(event.target) &&
        !navLinks.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (event.key === "Escape" && isOpen) setMenuOpen(false, true);
    });
  }

  if (header) {
    let ticking = false;
    if (!document.querySelector(".hero")) header.classList.add("scrolled");

    const updateHeader = () => {
      header.classList.toggle("scrolled", window.scrollY > 16);
      ticking = false;
    };

    updateHeader();
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      },
      { passive: true }
    );
  }
}

/* ===== 首页锚点 scroll-spy ===== */
function initSectionSpy(sectionSelector, navSelector) {
  const sections = document.querySelectorAll(sectionSelector);
  const links = document.querySelectorAll(navSelector);
  if (!sections.length || !links.length || !("IntersectionObserver" in window)) return;

  const linkMap = new Map();
  links.forEach((link) => {
    const hash = link.getAttribute("href");
    if (hash && hash.startsWith("#")) linkMap.set(hash.slice(1), link);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.remove("active"));
        const link = linkMap.get(entry.target.id);
        if (link) link.classList.add("active");
      });
    },
    { rootMargin: "-42% 0px -52% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

/* ===== Lightbox（带前后翻页） ===== */
function initLightbox() {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const photo = event.target.closest(".ph");
    if (!photo || !photo.hasAttribute("role")) return;

    collectGalleryItems();

    const image = photo.querySelector("img");
    const source = image?.currentSrc || image?.src || photo.dataset.src || "";
    if (!source) return;

    lastLightboxTrigger = photo;
    lightboxIndex = lightboxItems.indexOf(photo);
    openLightbox(source, photo.dataset.caption || image?.alt || "");
  });

  document.addEventListener("keydown", (event) => {
    const lightbox = document.querySelector(".lightbox");

    if (lightbox && lightbox.classList.contains("show")) {
      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowRight") {
        stepLightbox(1);
      } else if (event.key === "ArrowLeft") {
        stepLightbox(-1);
      }
      return;
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target instanceof Element
    ) {
      const photo = event.target.closest(".ph[role='button']");
      if (!photo) return;

      event.preventDefault();
      const image = photo.querySelector("img");
      const source = image?.currentSrc || image?.src || photo.dataset.src || "";
      if (!source) return;

      collectGalleryItems();
      lastLightboxTrigger = photo;
      lightboxIndex = lightboxItems.indexOf(photo);
      openLightbox(source, photo.dataset.caption || image?.alt || "");
    }
  });
}

function collectGalleryItems() {
  lightboxItems = Array.from(
    document.querySelectorAll(".ph[data-src], .ph img")
  )
    .map((el) => (el.matches(".ph") ? el : el.closest(".ph")))
    .filter((el, index, list) => el && list.indexOf(el) === index);
}

function createLightbox() {
  const lightbox = document.createElement("div");

  lightbox.className = "lightbox";
  lightbox.hidden = true;
  lightbox.tabIndex = -1;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "照片预览");

  const image = document.createElement("img");
  image.className = "lb-image";
  image.alt = "";

  const figure = document.createElement("div");
  figure.className = "lb-figure";
  figure.appendChild(image);

  const caption = document.createElement("div");
  caption.className = "lb-caption";
  const count = document.createElement("span");
  count.className = "lb-count";
  const label = document.createElement("span");
  label.className = "lb-label";
  caption.append(count, label);

  const prevButton = document.createElement("button");
  prevButton.className = "lb-btn lb-prev";
  prevButton.type = "button";
  prevButton.textContent = "←";
  prevButton.setAttribute("aria-label", "上一张");

  const nextButton = document.createElement("button");
  nextButton.className = "lb-btn lb-next";
  nextButton.type = "button";
  nextButton.textContent = "→";
  nextButton.setAttribute("aria-label", "下一张");

  const closeButton = document.createElement("button");
  closeButton.className = "lb-btn lb-close";
  closeButton.type = "button";
  closeButton.textContent = "✕";
  closeButton.setAttribute("aria-label", "关闭照片预览");

  closeButton.addEventListener("click", closeLightbox);
  prevButton.addEventListener("click", () => stepLightbox(-1));
  nextButton.addEventListener("click", () => stepLightbox(1));

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox || event.target === figure) {
      closeLightbox();
    }
  });

  lightbox.append(figure, caption, prevButton, nextButton, closeButton);
  document.body.appendChild(lightbox);

  return lightbox;
}

function openLightbox(src, caption = "") {
  const safeURL = safeSameOriginURL(src);
  if (!safeURL) return;

  const lightbox = document.querySelector(".lightbox") || createLightbox();
  const image = lightbox.querySelector(".lb-image");
  const captionElement = lightbox.querySelector(".lb-caption");

  if (!(image instanceof HTMLImageElement) || !captionElement) return;

  image.src = safeURL.href;
  image.alt = normalizeText(caption, "旅行照片", 160);

  const safeCaption = normalizeText(caption, "", 160);
  const label = captionElement.querySelector(".lb-label");
  const count = captionElement.querySelector(".lb-count");

  if (label) label.textContent = safeCaption;
  if (count) {
    count.textContent =
      lightboxItems.length > 1
        ? `${lightboxIndex + 1} / ${lightboxItems.length}`
        : "";
  }

  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.body.classList.add("modal-open");

  lightbox.hidden = false;
  lightbox.classList.add("show");
  lightbox.focus();
}

function stepLightbox(direction) {
  if (!lightboxItems.length) return;

  lightboxIndex = (lightboxIndex + direction + lightboxItems.length) % lightboxItems.length;
  const photo = lightboxItems[lightboxIndex];
  if (!photo) return;

  const image = photo.querySelector("img");
  const source = image?.currentSrc || image?.src || photo.dataset.src || "";
  if (!source) return;

  const safeURL = safeSameOriginURL(source);
  const lightbox = document.querySelector(".lightbox");
  if (!safeURL || !lightbox) return;

  const lbImage = lightbox.querySelector(".lb-image");
  const captionElement = lightbox.querySelector(".lb-caption");

  if (lbImage instanceof HTMLImageElement) {
    lbImage.src = safeURL.href;
    lbImage.alt = normalizeText(photo.dataset.caption || image?.alt || "", "旅行照片", 160);
  }

  const safeCaption = normalizeText(photo.dataset.caption || "", "", 160);
  const label = captionElement?.querySelector(".lb-label");
  const count = captionElement?.querySelector(".lb-count");

  if (label) label.textContent = safeCaption;
  if (count) count.textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
}

function closeLightbox() {
  const lightbox = document.querySelector(".lightbox");
  if (!lightbox || !lightbox.classList.contains("show")) return;

  lightbox.classList.remove("show");
  lightbox.hidden = true;
  document.body.style.overflow = previousBodyOverflow;
  document.body.classList.remove("modal-open");

  if (lastLightboxTrigger instanceof HTMLElement) {
    lastLightboxTrigger.focus();
  }
}

/* ===== 公共工具 ===== */
async function loadJSON(path) {
  const url = safeSameOriginURL(path);
  if (!url) throw new Error("DATA_LOAD_FAILED");

  // 数据文件总是拉最新：加时间戳参数穿透浏览器缓存，
  // 避免更新 trips/notes 后页面仍显示旧数据
  const bustURL = `${url.href}${url.search ? "&" : "?"}_=${Date.now()}`;

  const response = await fetch(bustURL, {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error("DATA_LOAD_FAILED");

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("json")) throw new Error("INVALID_DATA_FORMAT");

  return response.json();
}

function safeSameOriginURL(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) {
    return null;
  }

  try {
    const url = new URL(value, window.location.href);

    const localHTTP =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

    const safeProtocol = url.protocol === "https:" || url.protocol === "file:" || localHTTP;

    if (!safeProtocol || url.origin !== window.location.origin) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function normalizeText(value, fallback = "", maxLength = 240) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function photoEl(path, emoji, caption, thumbPath) {
  const photo = document.createElement("div");
  const safeCaption = normalizeText(caption, "旅行照片", 160);

  photo.className = "ph";
  photo.dataset.caption = safeCaption;

  const fallback = document.createElement("span");
  fallback.className = "ph-fallback";
  fallback.textContent = normalizeText(emoji, "📷", 8);
  photo.appendChild(fallback);

  const url = safeSameOriginURL(path);

  if (!url) return photo;

  // 图片立即挂载（懒加载管线依赖文档结构），加载完成后淡入替换占位
  const displayURL = safeSameOriginURL(String(thumbPath || "")) || url;
  photo.dataset.src = url.href; // 灯箱始终看原图

  photo.setAttribute("role", "button");
  photo.setAttribute("tabindex", "0");
  photo.setAttribute("aria-label", `查看大图：${safeCaption}`);

  const image = new Image();
  image.loading = "lazy";
  image.decoding = "async";
  image.alt = safeCaption;

  image.addEventListener(
    "load",
    () => {
      image.classList.add("is-loaded");
      fallback.remove();
    },
    { once: true }
  );

  image.addEventListener(
    "error",
    () => {
      image.remove();
      photo.removeAttribute("role");
      photo.removeAttribute("tabindex");
      photo.removeAttribute("aria-label");
      delete photo.dataset.src;
    },
    { once: true }
  );

  image.src = displayURL.href;
  photo.appendChild(image);

  return photo;
}

function showDataHint() {
  if (window.location.protocol !== "file:") return null;

  const hint = document.createElement("div");
  hint.className = "proto-hint";
  hint.setAttribute("role", "alert");
  hint.innerHTML =
    "检测到直接打开文件，数据接口需要本地服务器支持。<br />" +
    "在项目目录运行 <code>python3 -m http.server 8080</code> 后访问 " +
    "<code>http://localhost:8080</code>";
  document.body.appendChild(hint);
  return hint;
}

"use strict";

// main.js — 全局导航、移动菜单、Lightbox 与公共工具

let lastLightboxTrigger = null;
let previousBodyOverflow = "";

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initLightbox();
});

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

      linkPage =
        url.pathname.split("/").filter(Boolean).pop() || "index.html";
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
    toggle.setAttribute(
      "aria-label",
      open ? "关闭导航菜单" : "打开导航菜单"
    );

    navLinks.classList.toggle("open", open);

    if (returnFocus) {
      toggle.focus();
    }
  }

  if (toggle && navLinks) {
    setMenuOpen(false);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      setMenuOpen(!expanded);
    });

    navLinks.addEventListener("click", (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("a")
      ) {
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

      if (event.key === "Escape" && isOpen) {
        setMenuOpen(false, true);
      }
    });
  }

  if (header) {
    let ticking = false;

    // 无全屏 .hero 的页面（next/notes/about）顶部即浅色，初始进入深色毛玻璃态
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

// ===== Lightbox =====

function initLightbox() {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const photo = event.target.closest(".ph");
    if (!photo) return;

    const image = photo.querySelector("img");
    const source =
      image?.currentSrc ||
      image?.src ||
      photo.dataset.src ||
      "";

    if (!source) return;

    lastLightboxTrigger = photo;
    openLightbox(
      source,
      photo.dataset.caption || image?.alt || ""
    );
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
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
      const source =
        image?.currentSrc ||
        image?.src ||
        photo.dataset.src ||
        "";

      if (!source) return;

      lastLightboxTrigger = photo;
      openLightbox(
        source,
        photo.dataset.caption || image?.alt || ""
      );
    }
  });
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

  const caption = document.createElement("div");
  caption.className = "lb-caption";

  const closeButton = document.createElement("button");
  closeButton.className = "lb-close";
  closeButton.type = "button";
  closeButton.textContent = "关闭";
  closeButton.setAttribute("aria-label", "关闭照片预览");
  closeButton.style.cssText =
    "position:absolute;top:18px;right:18px;z-index:2;" +
    "padding:8px 14px;border:1px solid rgba(255,255,255,.7);" +
    "border-radius:999px;background:rgba(0,0,0,.55);" +
    "color:#fff;cursor:pointer;";

  closeButton.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  lightbox.append(image, caption, closeButton);
  document.body.appendChild(lightbox);

  return lightbox;
}

function openLightbox(src, caption = "") {
  const safeURL = safeSameOriginURL(src);
  if (!safeURL) return;

  const lightbox =
    document.querySelector(".lightbox") || createLightbox();

  const image = lightbox.querySelector(".lb-image");
  const captionElement = lightbox.querySelector(".lb-caption");
  const closeButton = lightbox.querySelector(".lb-close");

  if (!(image instanceof HTMLImageElement) || !captionElement) {
    return;
  }

  const safeCaption = normalizeText(caption, "旅行照片", 160);

  image.src = safeURL.href;
  image.alt = safeCaption;
  captionElement.textContent = normalizeText(caption, "", 160);

  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  lightbox.hidden = false;
  lightbox.classList.add("show");

  if (closeButton instanceof HTMLElement) {
    closeButton.focus();
  }
}

function closeLightbox() {
  const lightbox = document.querySelector(".lightbox");

  if (!lightbox || !lightbox.classList.contains("show")) {
    return;
  }

  lightbox.classList.remove("show");
  lightbox.hidden = true;
  document.body.style.overflow = previousBodyOverflow;

  if (lastLightboxTrigger instanceof HTMLElement) {
    lastLightboxTrigger.focus();
  }
}

// ===== 公共工具 =====

async function loadJSON(path) {
  const url = safeSameOriginURL(path);

  if (!url) {
    throw new Error("DATA_LOAD_FAILED");
  }

  const response = await fetch(url.href, {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("DATA_LOAD_FAILED");
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("json")) {
    throw new Error("INVALID_DATA_FORMAT");
  }

  return response.json();
}

function safeSameOriginURL(value) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 2048
  ) {
    return null;
  }

  try {
    const url = new URL(value, window.location.href);

    const localHTTP =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

    const safeProtocol =
      url.protocol === "https:" ||
      url.protocol === "file:" ||
      localHTTP;

    if (!safeProtocol || url.origin !== window.location.origin) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function normalizeText(value, fallback = "", maxLength = 240) {
  if (typeof value !== "string") {
    return fallback;
  }

  const text = value.trim();

  return text ? text.slice(0, maxLength) : fallback;
}

function photoEl(path, emoji, caption) {
  const photo = document.createElement("div");
  const safeCaption = normalizeText(caption, "旅行照片", 160);

  photo.className = "ph";
  photo.dataset.caption = safeCaption;
  photo.textContent = normalizeText(emoji, "📷", 8);
  photo.setAttribute("aria-busy", "true");

  const url = safeSameOriginURL(path);

  if (!url) {
    photo.removeAttribute("aria-busy");
    return photo;
  }

  const image = new Image();

  image.loading = "lazy";
  image.decoding = "async";
  image.alt = safeCaption;

  image.addEventListener(
    "load",
    () => {
      photo.replaceChildren(image);
      photo.dataset.src = url.href;
      photo.setAttribute("role", "button");
      photo.setAttribute("tabindex", "0");
      photo.setAttribute("aria-label", `查看大图：${safeCaption}`);
      photo.removeAttribute("aria-busy");
    },
    { once: true }
  );

  image.addEventListener(
    "error",
    () => {
      photo.textContent = normalizeText(emoji, "📷", 8);
      photo.removeAttribute("role");
      photo.removeAttribute("tabindex");
      photo.removeAttribute("aria-label");
      photo.removeAttribute("aria-busy");
      delete photo.dataset.src;
    },
    { once: true }
  );

  image.src = url.href;

  return photo;
}
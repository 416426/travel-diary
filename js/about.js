"use strict";

// about.js — 自我介绍：安全 DOM 渲染 + 头像渐变环 + 磁性标签

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { profile } = await loadJSON("data/profile.json");
    renderAbout(profile);
  } catch (err) {
    console.error(err);
    showDataHint();

    const wrap = document.querySelector("#about-wrap");
    if (!wrap) return;

    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = "档案加载失败，请稍后重试。";
    wrap.replaceChildren(message);
  }
});

function renderAbout(p) {
  const data = p && typeof p === "object" ? p : {};

  if (data.name) {
    document.title = `${data.name} · 旅行日记`;

    const name = document.querySelector("#about-name");
    if (name) name.textContent = data.name;
  }

  const tagline = document.querySelector("#about-tagline");
  if (tagline) tagline.textContent = String(data.tagline || "");

  const bio = document.querySelector("#about-bio");
  if (bio) bio.textContent = String(data.bio || "");

  renderAvatar(data.avatar, data.name);
  renderHobbies(data.hobbies || []);
  renderContact(data.contact || {});
}

function renderAvatar(avatarPath, name) {
  const box = document.querySelector("#avatar-box");
  if (!box) return;

  const fallback = document.createElement("span");
  fallback.textContent = String(name || "旅行者").slice(0, 6);
  box.replaceChildren(fallback);

  const url = safeSameOriginURL(String(avatarPath || ""));
  if (!url) return;

  const image = new Image();
  image.alt = "旅行者头像";
  image.loading = "lazy";
  image.decoding = "async";

  image.addEventListener("load", () => box.replaceChildren(image), { once: true });
  image.addEventListener("error", () => box.replaceChildren(fallback), { once: true });
  image.src = url.href;
}

function renderHobbies(hobbies) {
  const list = document.querySelector("#about-hobbies");
  if (!list) return;

  const fragment = document.createDocumentFragment();

  hobbies.forEach((hobby) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = String(hobby);
    fragment.appendChild(tag);
  });

  list.replaceChildren(fragment);
}

function renderContact(contact) {
  const email = document.querySelector("#about-contact");
  if (email) email.textContent = String(contact.email || "");

  const github = document.querySelector("#about-github");
  if (!github) return;

  const link = String(contact.github || "");
  if (link.startsWith("https://") || link.startsWith("http://")) {
    github.href = link;
  } else {
    github.style.display = "none";
  }
}

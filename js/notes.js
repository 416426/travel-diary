"use strict";

// notes.js — 旅行笔记 + 学习笔记：分类筛选、实时搜索、安全 DOM 渲染

const noteState = { travel: [], study: [] };
const noteFilters = { travel: "全部", study: "全部" };
const noteKeyword = { travel: "", study: "" };

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { travelNotes, studyNotes } = await loadJSON("data/notes.json");

    noteState.travel = Array.isArray(travelNotes) ? travelNotes : [];
    noteState.study = Array.isArray(studyNotes) ? studyNotes : [];

    buildFilterBar("travel");
    buildFilterBar("study");
    renderNotes("travel");
    renderNotes("study");
  } catch (err) {
    console.error(err);
    showDataHint();

    const wrap = document.querySelector("#notes-wrap");
    if (!wrap) return;

    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = "笔记加载失败，请稍后重试。";
    wrap.appendChild(message);
  }
});

/* ===== 筛选栏（分类 chips + 搜索框） ===== */
function buildFilterBar(kind) {
  const grid = document.querySelector(kind === "travel" ? "#travel-notes" : "#study-notes");
  if (!grid) return;

  const section = grid.closest(".section");
  const head = section?.querySelector(".section-head");
  if (!head) return;

  const bar = document.createElement("div");
  bar.className = "filter-bar";

  const categories = [
    "全部",
    ...new Set(noteState[kind].map((note) => String(note?.category || "未分类"))),
  ];

  categories.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (category === "全部" ? " active" : "");
    chip.textContent = category;
    chip.setAttribute("aria-pressed", String(category === "全部"));

    chip.addEventListener("click", () => {
      noteFilters[kind] = category;
      bar.querySelectorAll(".chip").forEach((el) => {
        const isActive = el === chip;
        el.classList.toggle("active", isActive);
        el.setAttribute("aria-pressed", String(isActive));
      });
      renderNotes(kind);
    });

    bar.appendChild(chip);
  });

  const search = document.createElement("label");
  search.className = "search-box";

  const icon = document.createElement("span");
  icon.className = "icon";
  icon.textContent = "🔍";
  icon.setAttribute("aria-hidden", "true");

  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "搜索标题 / 标签 / 正文…";
  input.setAttribute("aria-label", kind === "travel" ? "搜索旅行笔记" : "搜索学习笔记");

  input.addEventListener("input", () => {
    noteKeyword[kind] = input.value.trim().toLowerCase();
    renderNotes(kind);
  });

  search.append(icon, input);
  bar.appendChild(search);

  head.insertAdjacentElement("afterend", bar);
}

/* ===== 渲染 ===== */
function renderNotes(kind) {
  const wrap = document.querySelector(kind === "travel" ? "#travel-notes" : "#study-notes");
  if (!wrap) return;

  const category = noteFilters[kind];
  const keyword = noteKeyword[kind];

  const notes = noteState[kind].filter((note) => {
    const matchCategory = category === "全部" || String(note?.category || "未分类") === category;
    if (!matchCategory) return false;

    if (!keyword) return true;

    const haystack = [
      String(note?.title || ""),
      String(note?.category || ""),
      String(note?.content || ""),
      ...(Array.isArray(note?.tags) ? note.tags.map(String) : []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });

  const fragment = document.createDocumentFragment();

  notes.forEach((note, index) => {
    const card = document.createElement("article");
    card.className = "card note-card";
    card.setAttribute("data-reveal", "");
    card.style.setProperty("--d", `${Math.min(index * 0.07, 0.35)}s`);

    const body = document.createElement("div");
    body.className = "card-body";

    const head = document.createElement("div");
    head.className = "note-head";

    const cat = document.createElement("span");
    cat.className = "note-cat";
    cat.textContent = String(note?.category || "未分类");

    const date = document.createElement("span");
    date.className = "note-date";
    date.textContent = String(note?.date || "");

    head.append(cat, date);

    const title = document.createElement("h3");
    title.textContent = String(note?.title || "无标题");

    const content = document.createElement("p");
    content.className = "note-content";
    content.textContent = String(note?.content || "");

    body.append(head, title, content);

    const tags = Array.isArray(note?.tags) ? note.tags : [];
    if (tags.length) {
      const tagBox = document.createElement("div");
      tagBox.className = "tags";
      tags.forEach((value) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = `#${String(value)}`;
        tagBox.appendChild(tag);
      });
      body.appendChild(tagBox);
    }

    card.appendChild(body);
    fragment.appendChild(card);
  });

  if (!fragment.childNodes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有符合条件的笔记，换个关键词试试。";
    fragment.appendChild(empty);
  }

  wrap.replaceChildren(fragment);
  wrap.querySelectorAll("[data-reveal]").forEach((el) => observeReveal(el));
}

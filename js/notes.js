// notes.js — 旅行笔记 + 学习笔记
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { travelNotes, studyNotes } = await loadJSON("data/notes.json");
    renderNotes(travelNotes, "#travel-notes");
    renderNotes(studyNotes, "#study-notes");
  } catch (err) {
    console.error(err);
    document.querySelector("#notes-wrap").innerHTML = `<p style="padding:40px;text-align:center">加载失败：${err.message}</p>`;
  }
});

function renderNotes(notes, selector) {
  const wrap = document.querySelector(selector);
  wrap.innerHTML = notes
    .map(
      (n) => `
      <article class="card note-card fade-in">
        <div class="card-body">
          <h3>${n.title}</h3>
          <div class="note-date">📅 ${n.date} · ${n.category}</div>
          <div class="note-content">${escapeHtml(n.content)}</div>
          <div class="tags" style="margin-top:12px">${(n.tags || []).map((t) => `<span class="tag">#${t}</span>`).join("")}</div>
        </div>
      </article>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

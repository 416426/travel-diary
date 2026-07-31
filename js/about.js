// about.js — 自我介绍
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { profile } = await loadJSON("data/profile.json");
    renderAbout(profile);
  } catch (err) {
    console.error(err);
    document.querySelector("#about-wrap").innerHTML = `<p style="padding:40px;text-align:center">加载失败：${err.message}</p>`;
  }
});

function renderAbout(p) {
  document.title = `${p.name} · 旅行日记`;

  const avatar = document.querySelector("#avatar-box");
  const img = new Image();
  img.onload = () => (avatar.innerHTML = "", avatar.appendChild(img));
  img.onerror = () => (avatar.textContent = "🧑‍✈️");
  img.src = p.avatar;

  document.querySelector("#about-name").textContent = p.name;
  document.querySelector("#about-tagline").textContent = p.tagline;
  document.querySelector("#about-bio").textContent = p.bio;

  document.querySelector("#about-hobbies").innerHTML = (p.hobbies || [])
    .map((h) => `<span class="tag">${h}</span>`)
    .join("");

  document.querySelector("#about-contact").textContent = p.contact?.email || "";
  const gh = document.querySelector("#about-github");
  if (p.contact?.github) {
    gh.href = p.contact.github;
    gh.textContent = "GitHub";
  } else {
    gh.style.display = "none";
  }
}

// upload.js — 照片导入：压缩到限制标准 + 读取 GPS + 打包下载 + JSON 模板
const LIMITS = {
  maxBytes: 1 * 1024 * 1024, // 单张 ≤ 1MB
  maxEdge: 2048,             // 最长边 ≤ 2048px
  initQuality: 0.85,         // 初始 JPEG 质量
  minQuality: 0.5,           // 最低质量（低于此改缩尺寸）
};

const state = { items: [] }; // { name, thumb, origSize, finalBlob, finalSize, gps, warn }

document.addEventListener("DOMContentLoaded", () => {
  const zone = document.querySelector("#drop-zone");
  const input = document.querySelector("#file-input");

  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag");
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener("change", () => { handleFiles(input.files); input.value = ""; });

  document.querySelector("#btn-zip").addEventListener("click", downloadAll);
  document.querySelector("#btn-json").addEventListener("click", genJSON);
  document.querySelector("#btn-clear").addEventListener("click", () => {
    state.items = [];
    document.querySelector("#result-list").innerHTML = "";
    document.querySelector("#actions").style.display = "none";
    document.querySelector("#json-box").style.display = "none";
  });
});

async function handleFiles(files) {
  for (const f of files) await processFile(f);
  document.querySelector("#actions").style.display = "flex";
}

async function processFile(file) {
  const isHEIC = /\.heic$/i.test(file.name) || file.type === "image/heic";
  const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name);

  if (!isImage) { alert(`跳过非图片文件：${file.name}`); return; }
  if (isHEIC) {
    alert(`⚠️ ${file.name} 是 HEIC 格式，浏览器无法解码。\n请在手机「设置→照片」中改为「兼容性最好」或先用转换工具转成 JPG 再导入。`);
    return;
  }

  const item = {
    name: file.name.replace(/\.[^.]+$/, ".jpg"),
    origSize: file.size,
    gps: null,
    warn: null,
  };

  // 读取 EXIF GPS（失败不阻塞）
  try {
    const exif = await exifr.parse(file, ["latitude", "longitude"]);
    if (exif && exif.latitude != null && exif.longitude != null) {
      item.gps = { lat: +exif.latitude.toFixed(6), lng: +exif.longitude.toFixed(6) };
    }
  } catch (_) { /* 无 EXIF 或解析失败 */ }

  // 解码 + 压缩
  try {
    const img = await loadImage(file);
    const { blob, size } = await compressImage(img, file.type);
    item.finalBlob = blob;
    item.finalSize = size;
    item.thumb = URL.createObjectURL(blob);
    item.dim = `${img.width}→${blob.width || img.width}`;
    if (size > LIMITS.maxBytes) item.warn = `已尽力压缩仍 ${(size / 1048576).toFixed(2)}MB`;
    else if (item.origSize > LIMITS.maxBytes) item.warn = null; // 压缩成功，无需警告
  } catch (e) {
    item.warn = `压缩失败：${e.message}`;
    item.finalSize = file.size;
  }

  state.items.push(item);
  renderItem(item);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("无法解码图片"));
    img.src = url;
  });
}

async function compressImage(img, mime) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  let quality = LIMITS.initQuality;

  // 等比缩放到长边 ≤ maxEdge
  const scale = Math.min(1, LIMITS.maxEdge / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);

  let blob = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));

    if (blob.size <= LIMITS.maxBytes) break;

    // 超限降级策略：先降质量，质量低于下限后缩尺寸
    if (quality > LIMITS.minQuality) {
      quality = Math.max(LIMITS.minQuality, quality - 0.12);
    } else {
      const s = Math.max(0.5, Math.min(w, h) / Math.max(w, h));
      const shrink = 0.75;
      w = Math.round(w * shrink);
      h = Math.round(h * shrink);
      quality = LIMITS.initQuality;
    }
  }
  blob.width = w; // 附带尺寸信息
  return { blob, size: blob.size };
}

function renderItem(item) {
  const list = document.querySelector("#result-list");
  const ok = item.finalSize <= LIMITS.maxBytes;
  const row = document.createElement("div");
  row.className = "photo-item";
  row.innerHTML = `
    <img class="thumb" src="${item.thumb || ""}" alt="" />
    <div>
      <div class="pi-name">${escapeHtml(item.name)}</div>
      <div class="pi-meta">原图 ${fmt(item.origSize)} → 压缩后 <b>${fmt(item.finalSize)}</b></div>
      ${item.gps ? `<div class="pi-gps">📍 ${item.gps.lat}, ${item.gps.lng}</div>` : '<div class="pi-gps">📍 无 GPS 信息（可手动补坐标）</div>'}
      ${item.warn ? `<div class="pi-warn">⚠️ ${escapeHtml(item.warn)}</div>` : ""}
    </div>
    <div class="pi-size ${ok ? "ok" : "warn"}">${ok ? "✅ 达标" : "❌ 超限"}</div>
  `;
  list.appendChild(row);
}

function fmt(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(2)}MB` : `${(bytes / 1024).toFixed(0)}KB`;
}

async function downloadAll() {
  const zip = new JSZip();
  state.items.forEach((it) => zip.file(it.name, it.finalBlob));
  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `travel-diary-photos-${Date.now()}.zip`);
}

function genJSON() {
  const firstGps = state.items.find((i) => i.gps)?.gps;
  const template = {
    id: "new-trip",
    title: "（请填写旅行标题）",
    date: "YYYY-MM-DD",
    duration: "（天数或日期段）",
    location: "（地点，如：中国 XX）",
    lat: firstGps?.lat ?? 0,
    lng: firstGps?.lng ?? 0,
    photos: state.items.map((i) => `photos/${i.name}`),
    mood: "（心情，如：🌊 平静与辽阔）",
    moodEmoji: "🌊",
    thoughts: "（想法，随意写几句）",
    tags: ["（标签1）", "（标签2）"],
    highlights: state.items.filter((i) => i.gps).map((i) => ({
      name: `（拍摄点）${i.name}`,
      lat: i.gps.lat,
      lng: i.gps.lng,
      note: "来自照片 EXIF 坐标",
    })),
  };
  const text = JSON.stringify(template, null, 2);
  const box = document.querySelector("#json-box");
  box.textContent = text;
  box.style.display = "block";
  // 自动复制到剪贴板
  navigator.clipboard?.writeText(text).catch(() => {});
  box.scrollIntoView({ behavior: "smooth" });
}

function triggerDownload(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

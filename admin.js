const STORAGE_KEY = "alex-portfolio-content-v2";
let state = loadState();

const heroKicker = document.querySelector("#hero-kicker");
const heroTitle = document.querySelector("#hero-title");
const heroDescription = document.querySelector("#hero-description");
const heroPhotos = document.querySelector("#hero-photos");
const aboutTitle = document.querySelector("#about-title");
const aboutDescription = document.querySelector("#about-description");
const projectsEditor = document.querySelector("#projects-editor");
const photosEditor = document.querySelector("#photos-editor");
const linksEditor = document.querySelector("#links-editor");
const importJson = document.querySelector("#import-json");
const toast = document.querySelector("#toast");

renderForm();

document.querySelector("#save-button").addEventListener("click", () => {
  collectForm();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showToast("已保存。回到首页刷新即可预览。");
});

document.querySelector("#export-button").addEventListener("click", () => {
  collectForm();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "portfolio-content.json";
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#export-js-button").addEventListener("click", () => {
  collectForm();
  const fileText = `window.PORTFOLIO_CONTENT = ${JSON.stringify(state, null, 2)};\n`;
  const blob = new Blob([fileText], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "content.js";
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#reset-button").addEventListener("click", () => {
  state = structuredClone(window.PORTFOLIO_CONTENT);
  localStorage.removeItem(STORAGE_KEY);
  renderForm();
  showToast("已恢复默认内容。");
});

document.querySelector("#import-button").addEventListener("click", () => {
  try {
    state = mergeContent(window.PORTFOLIO_CONTENT, JSON.parse(importJson.value));
    renderForm();
    showToast("已导入，记得点击保存预览。");
  } catch {
    showToast("JSON 格式有问题。");
  }
});

document.querySelectorAll("[data-add]").forEach((button) => {
  button.addEventListener("click", () => {
    collectForm();
    const type = button.dataset.add;
    if (type === "project") {
      state.projects.push({ meta: "Type / Year", title: "New Project", description: "", href: "#" });
    }
    if (type === "photo") {
      state.photos.push({ src: "assets/photos/example.jpg", title: "New Photo", alt: "", layout: "" });
    }
    if (type === "link") {
      state.links.push({ label: "New Link", href: "#" });
    }
    renderForm();
  });
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? mergeContent(window.PORTFOLIO_CONTENT, saved) : structuredClone(window.PORTFOLIO_CONTENT);
  } catch {
    return structuredClone(window.PORTFOLIO_CONTENT);
  }
}

function renderForm() {
  heroKicker.value = state.hero.kicker;
  heroTitle.value = state.hero.title;
  heroDescription.value = state.hero.description;
  heroPhotos.value = state.heroPhotos.map((photo) => `${photo.src} | ${photo.alt || ""}`).join("\n");
  aboutTitle.value = state.about.title;
  aboutDescription.value = state.about.description;
  renderProjects();
  renderPhotos();
  renderLinks();
}

function renderProjects() {
  projectsEditor.innerHTML = state.projects
    .map(
      (project, index) => `
        <div class="editor-item" data-project="${index}">
          <div class="editor-item-header">
            <span>Project ${index + 1}</span>
            <button type="button" data-remove-project="${index}">删除</button>
          </div>
          <div class="field-grid">
            <label>标题<input data-field="title" value="${escapeAttribute(project.title)}" /></label>
            <label>标签<input data-field="meta" value="${escapeAttribute(project.meta)}" /></label>
          </div>
          <label>链接<input data-field="href" value="${escapeAttribute(project.href)}" /></label>
          <label>描述<textarea data-field="description" rows="3">${escapeHtml(project.description)}</textarea></label>
        </div>
      `,
    )
    .join("");
  bindRemoveButtons();
}

function renderPhotos() {
  photosEditor.innerHTML = state.photos
    .map(
      (photo, index) => `
        <div class="editor-item" data-photo="${index}">
          <div class="editor-item-header">
            <span>Photo ${index + 1}</span>
            <button type="button" data-remove-photo="${index}">删除</button>
          </div>
          <div class="field-grid">
            <label>标题<input data-field="title" value="${escapeAttribute(photo.title)}" /></label>
            <label>Layout<input data-field="layout" value="${escapeAttribute(photo.layout || "")}" /></label>
          </div>
          <label>图片路径或 URL<input data-field="src" value="${escapeAttribute(photo.src)}" /></label>
          <label>图片描述<input data-field="alt" value="${escapeAttribute(photo.alt || "")}" /></label>
        </div>
      `,
    )
    .join("");
  bindRemoveButtons();
}

function renderLinks() {
  linksEditor.innerHTML = state.links
    .map(
      (link, index) => `
        <div class="editor-item" data-link="${index}">
          <div class="editor-item-header">
            <span>Link ${index + 1}</span>
            <button type="button" data-remove-link="${index}">删除</button>
          </div>
          <div class="field-grid">
            <label>名称<input data-field="label" value="${escapeAttribute(link.label)}" /></label>
            <label>链接<input data-field="href" value="${escapeAttribute(link.href)}" /></label>
          </div>
        </div>
      `,
    )
    .join("");
  bindRemoveButtons();
}

function collectForm() {
  state.hero.kicker = heroKicker.value;
  state.hero.title = heroTitle.value;
  state.hero.description = heroDescription.value;
  state.heroPhotos = heroPhotos.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [src, alt = ""] = line.split("|").map((part) => part.trim());
      return { src, alt };
    });
  state.about.title = aboutTitle.value;
  state.about.description = aboutDescription.value;

  state.projects = [...projectsEditor.querySelectorAll("[data-project]")].map((item) =>
    collectItem(item),
  );
  state.photos = [...photosEditor.querySelectorAll("[data-photo]")].map((item) =>
    collectItem(item),
  );
  state.links = [...linksEditor.querySelectorAll("[data-link]")].map((item) => collectItem(item));
}

function collectItem(item) {
  const data = {};
  item.querySelectorAll("[data-field]").forEach((field) => {
    data[field.dataset.field] = field.value;
  });
  return data;
}

function bindRemoveButtons() {
  document.querySelectorAll("[data-remove-project]").forEach((button) => {
    button.addEventListener("click", () => {
      collectForm();
      state.projects.splice(Number(button.dataset.removeProject), 1);
      renderForm();
    });
  });
  document.querySelectorAll("[data-remove-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      collectForm();
      state.photos.splice(Number(button.dataset.removePhoto), 1);
      renderForm();
    });
  });
  document.querySelectorAll("[data-remove-link]").forEach((button) => {
    button.addEventListener("click", () => {
      collectForm();
      state.links.splice(Number(button.dataset.removeLink), 1);
      renderForm();
    });
  });
}

function mergeContent(base, saved) {
  return {
    ...base,
    ...saved,
    hero: { ...base.hero, ...saved.hero },
    photoBreak: { ...base.photoBreak, ...saved.photoBreak },
    about: { ...base.about, ...saved.about },
    heroPhotos: saved.heroPhotos?.length ? saved.heroPhotos : base.heroPhotos,
    workPanels: saved.workPanels?.length ? saved.workPanels : base.workPanels,
    projects: saved.projects?.length ? saved.projects : base.projects,
    photos: saved.photos?.length ? saved.photos : base.photos,
    links: saved.links?.length ? saved.links : base.links,
  };
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

const STORAGE_KEY = "alex-portfolio-content-v1";
const pageContent = loadPageContent();
const pageType = document.body.dataset.page;

renderPage();

function loadPageContent() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? mergeContent(window.PORTFOLIO_CONTENT, saved) : window.PORTFOLIO_CONTENT;
  } catch {
    return window.PORTFOLIO_CONTENT;
  }
}

function renderPage() {
  if (pageType === "work") {
    renderWorkPage();
  }
  if (pageType === "projects") {
    renderProjectsPage();
  }
  if (pageType === "photography") {
    renderPhotographyPage();
  }
  if (pageType === "contact") {
    renderContactPage();
  }
}

function renderWorkPage() {
  document.querySelector(".page-grid").innerHTML = pageContent.workPanels
    .map((panel) => {
      const image = panel.image
        ? `<img src="${escapeAttribute(panel.image)}" alt="${escapeAttribute(panel.alt || panel.title)}" />`
        : "";
      return `
        <a class="page-card ${panel.image ? "image-panel" : ""}" href="${escapeAttribute(panel.href || "#")}">
          ${image}
          <span>${escapeHtml(panel.number || "")}</span>
          <h2>${escapeHtml(panel.title || "")}</h2>
          <p>${escapeHtml(panel.description || "")}</p>
        </a>
      `;
    })
    .join("");
}

function renderProjectsPage() {
  document.querySelector(".page-list").innerHTML = pageContent.projects
    .map((project, index) => {
      const number = String(index + 1).padStart(2, "0");
      return `
        <article class="page-row">
          <span>${number}</span>
          <div>
            <p>${escapeHtml(project.meta || "")}</p>
            <h2>${escapeHtml(project.title || "")}</h2>
          </div>
          <p>${escapeHtml(project.description || "")}</p>
          <a href="${escapeAttribute(project.href || "#")}">View</a>
        </article>
      `;
    })
    .join("");
}

function renderPhotographyPage() {
  const gallery = document.querySelector(".gallery");
  gallery.innerHTML = pageContent.photos
    .map((photo) => {
      const layout = photo.layout ? ` ${photo.layout}` : "";
      return `
        <button class="photo-card${layout}" type="button" data-full="${escapeAttribute(photo.src)}" data-title="${escapeAttribute(photo.title || "")}">
          <img src="${escapeAttribute(photo.src)}" alt="${escapeAttribute(photo.alt || photo.title || "")}" />
          <span>${escapeHtml(photo.title || "")}</span>
        </button>
      `;
    })
    .join("");

  bindLightbox();
}

function renderContactPage() {
  const about = pageContent.about;
  document.querySelector(".page-about h2").textContent = about.title;
  document.querySelector(".page-about p").textContent = about.description;
  document.querySelector(".contact-links").innerHTML = pageContent.links
    .map((link) => `<a href="${escapeAttribute(link.href || "#")}">${escapeHtml(link.label || "Link")}</a>`)
    .join("");
}

function bindLightbox() {
  const lightbox = document.querySelector(".lightbox");
  const lightboxImage = lightbox.querySelector("img");
  const lightboxCaption = lightbox.querySelector("figcaption");
  const closeButton = document.querySelector(".lightbox-close");

  document.querySelector(".gallery").addEventListener("click", (event) => {
    const card = event.target.closest(".photo-card");
    if (!card) {
      return;
    }

    const image = card.querySelector("img");
    lightboxImage.src = card.dataset.full;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = card.dataset.title;
    lightbox.hidden = false;
  });

  closeButton.addEventListener("click", () => {
    lightbox.hidden = true;
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      lightbox.hidden = true;
    }
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

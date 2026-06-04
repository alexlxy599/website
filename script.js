const STORAGE_KEY = "alex-portfolio-content-v1";
const defaultContent = window.PORTFOLIO_CONTENT;
const content = loadContent();

const lightbox = document.querySelector(".lightbox");
const lightboxImage = lightbox.querySelector("img");
const lightboxCaption = lightbox.querySelector("figcaption");
const closeButton = document.querySelector(".lightbox-close");
const cameraHero = document.querySelector(".camera-hero");
const viewfinderImage = document.querySelector(".viewfinder-image");
const binaryLayer = document.querySelector(".binary-layer");
const shutterTransition = document.querySelector(".shutter-transition");
let focusTimer;
let heroPhotoIndex = 0;
let heroRotationTimer;

const sampler = document.createElement("canvas");
const samplerContext = sampler.getContext("2d", { willReadFrequently: true });

applyContent(content);
bindLightbox();
bindCameraHero();

if (viewfinderImage) {
  viewfinderImage.addEventListener("load", () => {
    viewfinderImage.classList.remove("is-changing");
    drawBinaryLayer();
  });
  window.addEventListener("resize", drawBinaryLayer);
  startHeroPhotoRotation(content.heroPhotos);
  drawBinaryLayer();
}

function loadContent() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? mergeContent(defaultContent, saved) : defaultContent;
  } catch {
    return defaultContent;
  }
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

function applyContent(siteContent) {
  document.querySelector(".hero-title .kicker").textContent = siteContent.hero.kicker;
  document.querySelector(".hero-title h1").textContent = siteContent.hero.title;
  document.querySelector(".hero-title p:not(.kicker)").textContent =
    siteContent.hero.description;

  renderWorkPanels(siteContent.workPanels);
  renderProjects(siteContent.projects);
  renderPhotoBreak(siteContent.photoBreak);
  renderPhotos(siteContent.photos);
  renderAbout(siteContent.about, siteContent.links);
}

function renderWorkPanels(workPanels) {
  const grid = document.querySelector(".work-grid");
  grid.innerHTML = workPanels
    .map((panel) => {
      const image = panel.image
        ? `<img src="${escapeAttribute(panel.image)}" alt="${escapeAttribute(panel.alt || panel.title)}" />`
        : "";
      const imageClass = panel.image ? " image-panel" : "";

      return `
        <a class="work-panel${imageClass}" href="${escapeAttribute(panel.href || "#work")}">
          ${image}
          <span>${escapeHtml(panel.number || "")}</span>
          <h3>${escapeHtml(panel.title || "")}</h3>
          <p>${escapeHtml(panel.description || "")}</p>
        </a>
      `;
    })
    .join("");
}

function renderProjects(projects) {
  const list = document.querySelector(".project-list");
  list.innerHTML = projects
    .map((project, index) => {
      const number = String(index + 1).padStart(2, "0");
      return `
        <article class="project-row">
          <div class="project-index">${number}</div>
          <div>
            <p class="project-meta">${escapeHtml(project.meta || "")}</p>
            <h3>${escapeHtml(project.title || "")}</h3>
          </div>
          <p>${escapeHtml(project.description || "")}</p>
          <a href="${escapeAttribute(project.href || "#")}" aria-label="查看 ${escapeAttribute(project.title || "项目")}">View</a>
        </article>
      `;
    })
    .join("");
}

function renderPhotoBreak(photoBreak) {
  const image = document.querySelector(".photo-break img");
  const text = document.querySelector(".photo-break p");
  image.src = photoBreak.src;
  image.alt = photoBreak.alt || "";
  text.textContent = photoBreak.text || "";
}

function renderPhotos(photos) {
  const gallery = document.querySelector(".gallery");
  gallery.innerHTML = photos
    .map((photo) => {
      const layout = photo.layout ? ` ${photo.layout}` : "";
      return `
        <button
          class="photo-card${layout}"
          type="button"
          data-full="${escapeAttribute(photo.src)}"
          data-title="${escapeAttribute(photo.title || "")}"
        >
          <img src="${escapeAttribute(photo.src)}" alt="${escapeAttribute(photo.alt || photo.title || "")}" />
          <span>${escapeHtml(photo.title || "")}</span>
        </button>
      `;
    })
    .join("");
}

function renderAbout(about, links) {
  const section = document.querySelector(".about-contact");
  section.querySelector(".kicker").textContent = about.kicker || "About";
  section.querySelector("h2").textContent = about.title || "";
  section.querySelector("p:not(.kicker)").textContent = about.description || "";
  section.querySelector(".contact-links").innerHTML = links
    .map(
      (link) =>
        `<a href="${escapeAttribute(link.href || "#")}">${escapeHtml(link.label || "Link")}</a>`,
    )
    .join("");
}

function bindLightbox() {
  document.querySelector(".gallery").addEventListener("click", (event) => {
    const card = event.target.closest(".photo-card");
    if (!card) {
      return;
    }

    const image = card.querySelector("img");
    const title = card.dataset.title;
    lightboxImage.src = card.dataset.full;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = title;
    lightbox.hidden = false;
  });

  closeButton.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImage.src = "";
  lightboxImage.alt = "";
}

function bindCameraHero() {
  if (!cameraHero) {
    return;
  }

  cameraHero.addEventListener("pointermove", (event) => {
    const rect = cameraHero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    cameraHero.style.setProperty("--focus-x", `${x.toFixed(2)}%`);
    cameraHero.style.setProperty("--focus-y", `${y.toFixed(2)}%`);
    cameraHero.classList.remove("is-focused");
    window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => {
      cameraHero.classList.add("is-focused");
    }, 180);
  });

  cameraHero.addEventListener("pointerleave", () => {
    cameraHero.style.setProperty("--focus-x", "50%");
    cameraHero.style.setProperty("--focus-y", "47%");
    cameraHero.classList.remove("is-focused");
  });

  cameraHero.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    const destination = link?.getAttribute("href") || "work.html";

    event.preventDefault();
    fireShutter(destination);
  });
}

function fireShutter(destination) {
  if (!shutterTransition) {
    window.location.href = destination;
    return;
  }

  shutterTransition.classList.remove("is-firing");
  void shutterTransition.offsetWidth;
  shutterTransition.classList.add("is-firing");

  window.setTimeout(() => {
    if (destination.startsWith("#")) {
      document.querySelector(destination)?.scrollIntoView({ behavior: "auto" });
      history.replaceState(null, "", destination);
      return;
    }

    window.location.href = destination;
  }, 180);

  window.setTimeout(() => {
    shutterTransition.classList.remove("is-firing");
  }, 680);
}

function drawBinaryLayer() {
  if (
    !viewfinderImage ||
    !binaryLayer ||
    !viewfinderImage.complete ||
    !viewfinderImage.naturalWidth
  ) {
    return;
  }

  const heroRect = cameraHero.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(heroRect.width * dpr));
  const height = Math.max(1, Math.round(heroRect.height * dpr));

  if (binaryLayer.width !== width || binaryLayer.height !== height) {
    binaryLayer.width = width;
    binaryLayer.height = height;
  }

  const context = binaryLayer.getContext("2d");
  context.clearRect(0, 0, width, height);

  const naturalWidth = viewfinderImage.naturalWidth;
  const naturalHeight = viewfinderImage.naturalHeight;
  const scale = Math.max(heroRect.width / naturalWidth, heroRect.height / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const imageOffsetX = (heroRect.width - renderedWidth) / 2;
  const imageOffsetY = (heroRect.height - renderedHeight) / 2;

  const sampleColumns = Math.max(70, Math.floor(heroRect.width / 12));
  const sampleRows = Math.max(42, Math.floor(heroRect.height / 16));
  sampler.width = sampleColumns;
  sampler.height = sampleRows;

  samplerContext.clearRect(0, 0, sampleColumns, sampleRows);
  samplerContext.drawImage(
    viewfinderImage,
    0,
    0,
    naturalWidth,
    naturalHeight,
    (imageOffsetX / heroRect.width) * sampleColumns,
    (imageOffsetY / heroRect.height) * sampleRows,
    (renderedWidth / heroRect.width) * sampleColumns,
    (renderedHeight / heroRect.height) * sampleRows,
  );

  let pixels;
  try {
    pixels = samplerContext.getImageData(0, 0, sampleColumns, sampleRows).data;
  } catch {
    drawFallbackBinary(context, width, height, sampleColumns, sampleRows);
    return;
  }

  context.fillStyle = "rgba(4, 12, 8, 0.78)";
  context.fillRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${Math.max(8, Math.floor((height / sampleRows) * 0.84))}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

  const cellWidth = width / sampleColumns;
  const cellHeight = height / sampleRows;

  for (let row = 0; row < sampleRows; row += 1) {
    for (let column = 0; column < sampleColumns; column += 1) {
      const index = (row * sampleColumns + column) * 4;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      const bit = luminance > 118 ? "1" : "0";
      const alpha = 0.24 + (luminance / 255) * 0.72;

      context.fillStyle = `rgba(184, 255, 202, ${alpha.toFixed(3)})`;
      context.fillText(bit, column * cellWidth + cellWidth / 2, row * cellHeight + cellHeight / 2);
    }
  }
}

function drawFallbackBinary(context, width, height, columns, rows) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(4, 12, 8, 0.76)";
  context.fillRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${Math.max(9, Math.floor((height / rows) * 0.9))}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const offset = 37;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const wave = Math.sin((column + offset) * 0.34) + Math.cos((row - offset) * 0.42);
      const bit = wave > 0 ? "1" : "0";
      const centerX = column / columns - 0.5;
      const centerY = row / rows - 0.5;
      const distance = Math.sqrt(centerX * centerX + centerY * centerY);
      const alpha = Math.max(0.28, 0.98 - distance * 1.6);

      context.fillStyle = `rgba(186, 255, 199, ${alpha.toFixed(3)})`;
      context.fillText(bit, column * cellWidth + cellWidth / 2, row * cellHeight + cellHeight / 2);
    }
  }
}

function startHeroPhotoRotation(heroPhotos) {
  if (!viewfinderImage || !heroPhotos?.length) {
    return;
  }

  window.clearInterval(heroRotationTimer);

  heroPhotos.forEach((photo) => {
    const image = new Image();
    image.src = photo.src;
  });

  const firstPhoto = heroPhotos[0];
  viewfinderImage.src = firstPhoto.src;
  viewfinderImage.alt = firstPhoto.alt;

  if (heroPhotos.length < 2) {
    return;
  }

  heroRotationTimer = window.setInterval(() => {
    heroPhotoIndex = (heroPhotoIndex + 1) % heroPhotos.length;
    const nextPhoto = heroPhotos[heroPhotoIndex];

    viewfinderImage.classList.add("is-changing");

    window.setTimeout(() => {
      viewfinderImage.src = nextPhoto.src;
      viewfinderImage.alt = nextPhoto.alt;
    }, 260);
  }, 5200);
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

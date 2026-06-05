const STORAGE_KEY = "alex-portfolio-content-v2";
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
  renderPhotoMap(pageContent.photos);
  gallery.innerHTML = pageContent.photos
    .map((photo, index) => {
      const layout = photo.layout ? ` ${photo.layout}` : "";
      const label = photo.location || "";
      const location = label ? `<span class="photo-location">${escapeHtml(label)}</span>` : "";
      const locationClass = label ? " has-location" : "";
      const flowClass = getPhotoFlowClass(index);
      return `
        <button class="photo-card photo-flow-item ${flowClass}${layout}${locationClass}" type="button" data-location="${escapeAttribute(normalizeCity(label))}" data-full="${escapeAttribute(photo.src)}" data-title="${escapeAttribute(label)}">
          <img src="${escapeAttribute(photo.src)}" alt="${escapeAttribute(photo.alt || photo.title || "")}" />
          ${location}
        </button>
      `;
    })
    .join("");

  bindLightbox();
}

function renderPhotoMap(photos) {
  const canvas = document.querySelector("#photo-map-canvas");
  const list = document.querySelector("#photo-map-list");
  if (!canvas || !list) {
    return;
  }

  const cities = getPhotoCities(photos);
  canvas.innerHTML = `
    <svg class="watercolor-map" viewBox="0 0 1000 520" role="img" aria-label="Watercolor world map">
      <defs>
        <filter id="paper-blur">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="8" />
          <feDisplacementMap in="SourceGraphic" scale="7" />
        </filter>
      </defs>
      <path class="map-wash wash-a" d="M80 130C130 80 240 82 315 115C395 150 410 105 500 118C610 135 680 82 770 112C858 142 915 180 940 245C972 330 908 395 812 388C705 380 650 430 530 402C420 376 330 425 214 390C106 357 35 272 80 130Z" />
      <path class="map-land americas" d="M188 105C144 126 120 178 132 235C143 282 182 306 203 344C224 382 205 423 238 454C269 485 319 461 322 418C325 379 292 354 306 314C320 274 358 267 356 224C354 178 318 145 282 117C248 91 221 90 188 105Z" />
      <path class="map-land north" d="M135 83C194 48 284 58 334 95C300 118 246 116 205 126C165 136 126 138 92 116C100 101 113 91 135 83Z" />
      <path class="map-land europe" d="M485 135C530 104 602 118 635 151C608 178 565 175 526 169C494 164 472 158 485 135Z" />
      <path class="map-land africa" d="M535 190C584 180 635 213 648 274C660 330 632 404 579 417C535 429 497 384 503 329C510 278 488 219 535 190Z" />
      <path class="map-land asia" d="M640 132C704 92 808 112 875 169C932 217 927 292 864 313C803 334 756 292 703 304C655 315 610 286 626 238C640 198 604 157 640 132Z" />
      <path class="map-land australia" d="M778 374C821 348 883 359 902 402C877 432 820 436 780 415C755 402 753 388 778 374Z" />
      <path class="map-route" d="M180 230C310 168 488 146 642 180C754 205 828 260 878 374" />
      <path class="map-route faint" d="M282 410C390 318 500 255 620 188C695 146 772 132 862 170" />
    </svg>
    ${cities
      .map((city) => {
        const point = getCityPoint(city.name);
        if (!point) {
          return "";
        }
        return `<button class="map-pin" type="button" style="--pin-x:${point.x}%; --pin-y:${point.y}%;" data-city="${escapeAttribute(city.key)}" aria-label="${escapeAttribute(city.name)}"><span>${escapeHtml(String(city.count))}</span></button>`;
      })
      .join("")}
  `;

  list.innerHTML = cities.length
    ? `
      <button class="map-city is-active" type="button" data-city="">All</button>
      ${cities
        .map(
          (city) =>
            `<button class="map-city" type="button" data-city="${escapeAttribute(city.key)}">${escapeHtml(city.name)} <span>${city.count}</span></button>`,
        )
        .join("")}
    `
    : "";

  bindPhotoMapFilters();
}

function getPhotoCities(photos) {
  const cityMap = new Map();
  photos.forEach((photo) => {
    const name = (photo.location || "").trim();
    if (!name) {
      return;
    }
    const key = normalizeCity(name);
    const existing = cityMap.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    cityMap.set(key, { key, name, count: 1 });
  });
  return [...cityMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function bindPhotoMapFilters() {
  document.querySelectorAll("[data-city]").forEach((button) => {
    button.addEventListener("click", () => {
      const city = button.dataset.city || "";
      document.querySelectorAll("[data-city]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.city === city);
      });
      document.querySelectorAll(".photo-flow-item").forEach((card) => {
        const show = !city || card.dataset.location === city;
        card.hidden = !show;
      });
    });
  });
}

function normalizeCity(city) {
  return city.trim().toLowerCase();
}

function getCityPoint(city) {
  const cityPoints = {
    banff: { lat: 51.18, lng: -115.57 },
    beijing: { lat: 39.9, lng: 116.41 },
    cambridge: { lat: 52.21, lng: 0.12 },
    edinburgh: { lat: 55.95, lng: -3.19 },
    hongkong: { lat: 22.32, lng: 114.17 },
    "hong kong": { lat: 22.32, lng: 114.17 },
    kyoto: { lat: 35.01, lng: 135.77 },
    london: { lat: 51.51, lng: -0.13 },
    montreal: { lat: 45.5, lng: -73.57 },
    newyork: { lat: 40.71, lng: -74.01 },
    "new york": { lat: 40.71, lng: -74.01 },
    osaka: { lat: 34.69, lng: 135.5 },
    paris: { lat: 48.86, lng: 2.35 },
    sanfrancisco: { lat: 37.77, lng: -122.42 },
    "san francisco": { lat: 37.77, lng: -122.42 },
    seattle: { lat: 47.61, lng: -122.33 },
    shanghai: { lat: 31.23, lng: 121.47 },
    tokyo: { lat: 35.68, lng: 139.65 },
    vancouver: { lat: 49.28, lng: -123.12 },
    whistler: { lat: 50.12, lng: -122.96 },
  };
  const point = cityPoints[normalizeCity(city).replace(/[^a-z\s]/g, "").replace(/\s+/g, " ")] || cityPoints[normalizeCity(city).replace(/[^a-z]/g, "")];
  if (!point) {
    return null;
  }
  return {
    x: (((point.lng + 180) / 360) * 100).toFixed(2),
    y: (((90 - point.lat) / 180) * 100).toFixed(2),
  };
}

function getPhotoFlowClass(index) {
  const pattern = ["feature", "left", "right", "center", "small-left", "wide", "small-right"];
  return pattern[index % pattern.length];
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

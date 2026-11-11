const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;

const state = {
  items: [],
  index: 0
};

const $ = (id) => document.getElementById(id);
const gallery = $("gallery");
const error = $("error");
const lightbox = $("lightbox");
const lightboxImage = $("lightbox-image");

function repoInfo() {
  const parts = location.pathname.split("/").filter(Boolean);

  if (location.hostname.endsWith(".github.io")) {
    const owner = location.hostname.split(".")[0];
    const repo = parts[0] || `${owner}.github.io`;
    return { owner, repo };
  }

  return {
    owner: "YOUR_GITHUB_USERNAME",
    repo: "YOUR_REPOSITORY"
  };
}

async function loadRepository() {
  const { owner, repo } = repoInfo();

  if (owner === "YOUR_GITHUB_USERNAME") {
    throw new Error("не удалось определить GitHub-репозиторий. откройте сайт через GitHub Pages или укажите owner/repo в script.js.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`,
    { headers: { Accept: "application/vnd.github+json" } }
  );

  if (!response.ok) {
    throw new Error(`GitHub API вернул HTTP ${response.status}.`);
  }

  const data = await response.json();

  const pagesPrefix = location.pathname.endsWith("/")
    ? location.pathname
    : location.pathname.slice(0, location.pathname.lastIndexOf("/") + 1);

  state.items = (data.tree || [])
    .filter(item => item.type === "blob" && IMAGE_EXTENSIONS.test(item.path))
    .map(item => ({
      url: pagesPrefix + item.path.split("/").map(encodeURIComponent).join("/")
    }))
    .sort((a, b) => a.url.localeCompare(b.url, undefined, { numeric: true, sensitivity: "base" }));

  render();
}

function render() {
  gallery.innerHTML = state.items.map((item, index) => `
    <img class="thumb" src="${item.url}" alt="" loading="lazy" decoding="async" data-index="${index}">
  `).join("");

  gallery.querySelectorAll(".thumb").forEach(img => {
    img.addEventListener("click", () => openLightbox(Number(img.dataset.index)));
  });
}

function openLightbox(index) {
  state.index = index;
  const item = state.items[state.index];
  if (!item) return;

  lightboxImage.src = item.url;
  lightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  document.body.style.overflow = "";
}

function move(delta) {
  if (!state.items.length) return;
  state.index = (state.index + delta + state.items.length) % state.items.length;
  openLightbox(state.index);
}

$("close").addEventListener("click", closeLightbox);
$("prev").addEventListener("click", () => move(-1));
$("next").addEventListener("click", () => move(1));

lightbox.addEventListener("click", e => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", e => {
  if (lightbox.classList.contains("hidden")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") move(-1);
  if (e.key === "ArrowRight") move(1);
});

loadRepository().catch(err => {
  console.error(err);
  error.textContent = err.message;
  error.classList.remove("hidden");
});

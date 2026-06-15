const FRAME_COUNT = 76;
const canvas = document.querySelector("#eye-sequence");
const ctx = canvas?.getContext("2d", { alpha: false });
const hero = document.querySelector(".hero-scroll");
const video = document.querySelector(".hero-video");
const copy = document.querySelector(".hero-copy");
const cue = document.querySelector(".scroll-cue");
const blackout = document.querySelector(".iris-blackout");
const counter = document.querySelector("#progress");
const frames = Array(FRAME_COUNT);

let currentFrame = -1;
let desiredFrame = 0;
let rafPending = false;

const src = (index) => `public/frames/eye-${String(index + 1).padStart(3, "0")}.webp`;

function loadFrame(index) {
  if (frames[index]) return;
  const image = new Image();
  image.decoding = "async";
  image.src = src(index);
  image.onload = () => {
    frames[index] = image;
    if (index === desiredFrame) render(index);
  };
}

function sizeCanvas() {
  if (!canvas) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  render(Math.max(currentFrame, 0));
}

function render(index) {
  if (!canvas || !ctx) return;

  let image = frames[index];
  if (!image) {
    let closestIndex = -1;
    let minDiff = Infinity;
    for (let i = 0; i < FRAME_COUNT; i++) {
      if (!frames[i]) continue;
      const diff = Math.abs(i - index);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    if (closestIndex === -1) return;
    image = frames[closestIndex];
  }

  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  currentFrame = index;
}

function updateHero() {
  rafPending = false;
  if (!hero) return;

  const rect = hero.getBoundingClientRect();
  const distance = hero.offsetHeight - innerHeight;
  const progress = Math.min(1, Math.max(0, -rect.top / distance));
  const sequenceProgress = Math.min(1, Math.max(0, (progress - 0.08) / 0.82));
  desiredFrame = Math.round(sequenceProgress * (FRAME_COUNT - 1));

  const canvasOpacity = sequenceProgress > 0 ? Math.min(1, sequenceProgress * 8) : 0;
  if (canvas) canvas.style.opacity = canvasOpacity;
  if (video) video.style.opacity = Math.max(0, 1 - canvasOpacity);

  const copyOpacity = Math.max(0, 1 - progress * 5);
  if (copy) {
    copy.style.opacity = copyOpacity;
    copy.style.transform = `translateY(calc(-42% - ${progress * 60}px))`;
  }
  if (cue) cue.style.opacity = Math.max(0, 1 - progress * 2.5);
  if (blackout) blackout.style.opacity = Math.max(0, (progress - 0.91) / 0.09);
  if (counter) counter.textContent = String(Math.round(sequenceProgress * 100)).padStart(2, "0");
  document.documentElement.style.setProperty("--progress", `${sequenceProgress * 100}%`);

  loadFrame(desiredFrame);
  for (let i = 1; i <= 5; i++) {
    loadFrame(Math.min(FRAME_COUNT - 1, desiredFrame + i));
    loadFrame(Math.max(0, desiredFrame - i));
  }
  render(desiredFrame);
}

function requestHeroUpdate() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(updateHero);
}

function scrollToHash(hash, behavior = "smooth") {
  if (!hash || hash === "#") return;
  const target = document.querySelector(hash);
  if (!target) return;
  target.scrollIntoView({ behavior, block: "start" });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const hash = link.getAttribute("href");
  if (!document.querySelector(hash)) return;

  event.preventDefault();
  history.pushState(null, "", hash);
  scrollToHash(hash);
});

window.addEventListener("popstate", () => scrollToHash(location.hash));

const spiritNames = {
  kitsune: "Кицунэ. Ты выживаешь благодаря уму и всегда находишь скрытую дверь.",
  oni: "Они. Твоя сила просыпается, когда другим становится страшно.",
  yurei: "Юрэй. Ты слышишь то, что мир предпочёл забыть."
};

document.querySelector(".answers")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-spirit]");
  if (!button) return;

  document.querySelectorAll("[data-spirit]").forEach((item) => item.classList.remove("is-selected"));
  button.classList.add("is-selected");
  document.querySelector("#oracle-result").textContent = spiritNames[button.getAttribute("data-spirit")];
});

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion) {
  document.documentElement.classList.add("motion-ready");

  const revealElements = document.querySelectorAll([
    ".section-title",
    ".manga-page"
  ].join(","));

  revealElements.forEach((element, index) => {
    element.classList.add("reveal");
    element.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  revealElements.forEach((element) => revealObserver.observe(element));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const activeLink = document.querySelector(`.nav-main a[href="#${entry.target.id}"]`);
      document.querySelectorAll(".nav-main a").forEach((link) => link.classList.remove("is-active"));
      activeLink?.classList.add("is-active");
    });
  }, { threshold: 0.2 });

  document.querySelectorAll(".manga-section").forEach((section) => sectionObserver.observe(section));
}

loadFrame(0);
for (let i = 1; i < 8; i++) loadFrame(i);

window.addEventListener("resize", sizeCanvas);
window.addEventListener("scroll", requestHeroUpdate, { passive: true });

video?.play().catch(() => {});
sizeCanvas();
updateHero();

if (location.hash) {
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToHash(location.hash, "auto")));
}

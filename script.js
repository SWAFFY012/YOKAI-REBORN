const FRAME_COUNT = 151;
const FRAME_START = 40;
const FRAME_END = FRAME_COUNT - 1;
const SEQUENCE_SCROLL_END = 0.68;
const canvas = document.querySelector("#eye-sequence");
const ctx = canvas?.getContext("2d", { alpha: false });
const hero = document.querySelector(".hero-scroll");
const video = document.querySelector(".hero-video");
const copy = document.querySelector(".hero-copy");
const cue = document.querySelector(".scroll-cue");
const blackout = document.querySelector(".iris-blackout");
const counter = document.querySelector("#progress");
const aboutSection = document.querySelector("#about");
const frames = Array(FRAME_COUNT);
const loadingFrames = new Set();

let currentFrame = -1;
let desiredFrame = 0;
let rafPending = false;
let heroPassThroughLocked = false;
let lastHeroScrollY = window.scrollY;

const src = (index) => `public/frames/eye-${String(index + 1).padStart(3, "0")}.webp`;

function loadFrame(index) {
  if (index < 0 || index >= FRAME_COUNT || frames[index] || loadingFrames.has(index)) return;
  loadingFrames.add(index);
  const image = new Image();
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = "high";
  image.src = src(index);
  image.onload = () => {
    loadingFrames.delete(index);
    frames[index] = image;
    const isNeededFrame = desiredFrame >= currentFrame
      ? index <= desiredFrame && index >= currentFrame
      : index >= desiredFrame && index <= currentFrame;
    if (isNeededFrame) render(index);
  };
  image.onerror = () => loadingFrames.delete(index);
}

function preloadRange(start, end) {
  const from = Math.max(0, start);
  const to = Math.min(FRAME_COUNT - 1, end);
  for (let i = from; i <= to; i++) loadFrame(i);
}

function preloadHeroSequence() {
  preloadRange(0, FRAME_COUNT - 1);
}

function passThroughHero(sequenceProgress, isScrollingDown) {
  if (!aboutSection || heroPassThroughLocked || !isScrollingDown || sequenceProgress < 0.9) return;

  heroPassThroughLocked = true;
  desiredFrame = FRAME_COUNT - 1;
  loadFrame(desiredFrame);
  render(desiredFrame);

  requestAnimationFrame(() => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    aboutSection.scrollIntoView({ behavior, block: "start" });
  });

  window.setTimeout(() => {
    heroPassThroughLocked = false;
  }, 1400);
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

  let renderIndex = index;
  let image = frames[renderIndex];
  if (!image) {
    const isMovingForward = index >= currentFrame;
    if (isMovingForward) {
      for (let i = index; i >= Math.max(currentFrame, 0); i--) {
        if (!frames[i]) continue;
        renderIndex = i;
        image = frames[i];
        break;
      }
    } else {
      for (let i = index; i <= currentFrame; i++) {
        if (!frames[i]) continue;
        renderIndex = i;
        image = frames[i];
        break;
      }
    }

    if (!image) return;
  }

  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  currentFrame = renderIndex;
}

function updateHero() {
  rafPending = false;
  if (!hero) return;

  const rect = hero.getBoundingClientRect();
  const distance = hero.offsetHeight - innerHeight;
  const scrollY = window.scrollY;
  const isScrollingDown = scrollY > lastHeroScrollY;
  const progress = Math.min(1, Math.max(0, -rect.top / distance));
  const sequenceProgress = Math.min(1, Math.max(0, progress / SEQUENCE_SCROLL_END));
  desiredFrame = FRAME_START + Math.round(sequenceProgress * (FRAME_END - FRAME_START));
  const diveProgress = Math.min(1, Math.max(0, (sequenceProgress - 0.78) / 0.22));

  const canvasOpacity = sequenceProgress > 0 ? Math.min(1, sequenceProgress * 8) : 0;
  if (canvas) canvas.style.opacity = canvasOpacity;
  if (video) video.style.opacity = Math.max(0, 1 - canvasOpacity);

  const copyOpacity = Math.max(0, 1 - progress * 5);
  if (copy) {
    copy.style.opacity = copyOpacity;
    copy.style.transform = `translateY(calc(-42% - ${progress * 60}px))`;
  }
  if (cue) cue.style.opacity = Math.max(0, 1 - progress * 2.5);
  if (blackout) blackout.style.opacity = diveProgress;
  if (counter) counter.textContent = String(Math.round(sequenceProgress * 100)).padStart(2, "0");
  document.documentElement.style.setProperty("--progress", `${sequenceProgress * 100}%`);

  loadFrame(desiredFrame);
  for (let i = 1; i <= 18; i++) {
    loadFrame(Math.min(FRAME_COUNT - 1, desiredFrame + i));
    loadFrame(Math.max(0, desiredFrame - i));
  }
  render(desiredFrame);
  passThroughHero(sequenceProgress, isScrollingDown);
  lastHeroScrollY = scrollY;
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

const quizAnswers = ["blood", "mask", "memory", "ghost", "remember"];
let quizStep = 0;
let quizLocked = false;
let replaySectionAnimations = () => {};

function restoreQuizButton(button) {
  if (!button) return;
  if (button.dataset.originalText) button.textContent = button.dataset.originalText;
  button.classList.remove("is-selected", "is-correct", "is-wrong", "is-vaporizing", "is-vaporized");
  button.disabled = false;
}

function clearQuizStepEffects(stepElement) {
  stepElement?.querySelectorAll("[data-choice]").forEach(restoreQuizButton);
}

function updateQuizNav() {
  const prev = document.querySelector("#prev-question");
  const next = document.querySelector("#next-question");
  if (prev) prev.disabled = quizStep <= 0;
  if (next) next.disabled = quizStep >= quizAnswers.length - 1;
}

function setQuizStep(step) {
  quizStep = Math.max(0, Math.min(quizAnswers.length - 1, step));
  document.querySelectorAll(".quiz-step").forEach((element, index) => {
    const isActive = index === quizStep;
    element.classList.toggle("is-active", isActive);
    if (isActive) clearQuizStepEffects(element);
  });
  updateQuizNav();
}

function vaporizeWrongAnswers(stepElement, correctButton) {
  const wrongButtons = Array.from(stepElement.querySelectorAll("[data-choice]"))
    .filter((item) => item !== correctButton);

  wrongButtons.forEach((button) => {
    const text = button.dataset.originalText || button.textContent.trim();
    button.dataset.originalText = text;
    button.textContent = "";

    Array.from(text).forEach((char, index) => {
      const letter = document.createElement("span");
      letter.className = "vapor-letter";
      letter.textContent = char === " " ? "\u00a0" : char;
      letter.style.setProperty("--burst-x", `${Math.round((Math.random() - 0.5) * 260)}px`);
      letter.style.setProperty("--burst-y", `${Math.round(-70 - Math.random() * 160)}px`);
      letter.style.setProperty("--burst-r", `${Math.round((Math.random() - 0.5) * 260)}deg`);
      letter.style.setProperty("--burst-delay", `${index * 13 + Math.random() * 90}ms`);
      button.appendChild(letter);
    });

    button.classList.add("is-wrong", "is-vaporizing");
    window.setTimeout(() => {
      button.classList.add("is-vaporized");
    }, 860);
  });
}

function resetQuiz() {
  quizStep = 0;
  quizLocked = false;

  const quiz = document.querySelector("#lore-quiz");
  const result = document.querySelector("#quiz-result");
  const finaleCard = document.querySelector(".finale-card");
  if (quiz) quiz.hidden = false;
  if (result) result.textContent = "";
  finaleCard?.classList.remove("is-complete");

  document.querySelectorAll("#lore-quiz [data-choice]").forEach((item) => {
    restoreQuizButton(item);
  });

  setQuizStep(0);
}

document.querySelector("#lore-quiz")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice]");
  if (!button || quizLocked) return;

  const currentStep = button.closest(".quiz-step");
  const stepIndex = Number(currentStep?.dataset.step || 0);
  const isCorrect = button.dataset.choice === quizAnswers[stepIndex];
  const result = document.querySelector("#quiz-result");
  const finaleCard = document.querySelector(".finale-card");
  quizLocked = true;

  currentStep.querySelectorAll("[data-choice]").forEach((item) => {
    restoreQuizButton(item);
    item.disabled = isCorrect;
  });
  button.classList.add("is-selected", isCorrect ? "is-correct" : "is-wrong");

  if (!isCorrect) {
    if (result) result.textContent = "Подумай ещё";
    quizLocked = false;
    return;
  }

  if (result) result.textContent = "";
  vaporizeWrongAnswers(currentStep, button);

  window.setTimeout(() => {
    const nextStep = quizStep + 1;

    if (nextStep < quizAnswers.length) {
      if (result) result.textContent = "";
      setQuizStep(nextStep);
      quizLocked = false;
      return;
    }

    const quiz = document.querySelector("#lore-quiz");
    if (quiz) quiz.hidden = true;
    if (result) {
      result.textContent = "Глаз дрогнул. Рэн вспомнила достаточно, чтобы закрыть врата до рассвета.";
    }
    finaleCard?.classList.add("is-complete");
    quizLocked = false;
  }, 1150);
});

document.querySelector("#prev-question")?.addEventListener("click", () => {
  if (quizLocked || quizStep <= 0) return;
  const result = document.querySelector("#quiz-result");
  if (result) result.textContent = "";
  setQuizStep(quizStep - 1);
});

document.querySelector("#next-question")?.addEventListener("click", () => {
  if (quizLocked || quizStep >= quizAnswers.length - 1) return;
  const result = document.querySelector("#quiz-result");
  if (result) result.textContent = "";
  setQuizStep(quizStep + 1);
});

updateQuizNav();

document.querySelector("#restart-story")?.addEventListener("click", () => {
  resetQuiz();
  history.pushState(null, "", "#hero");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelector("#retake-quiz")?.addEventListener("click", () => {
  resetQuiz();
  document.querySelector("#lore-quiz")?.scrollIntoView({ behavior: "smooth", block: "center" });
});

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// TextEffect-style per-char reveal for comic text blocks.
function splitFadeText(element) {
  if (!element || prefersReducedMotion) return null;
  const text = element.textContent.trim();
  element.setAttribute("aria-label", text);
  element.classList.add("text-effect-fade");

  let charIndex = 0;
  const words = text.split(/(\s+)/);
  const html = words.map((word) => {
    if (/^\s+$/.test(word)) return " ";
    const chars = Array.from(word).map((char) => {
      const span = `<span class="char" aria-hidden="true" style="--char-index:${charIndex}">${char}</span>`;
      charIndex += 1;
      return span;
    });
    return `<span class="word">${chars.join("")}</span>`;
  }).join("");

  element.innerHTML = html;
  return { element, length: charIndex };
}

// Targets are ordered by how the reader scans each section.
const textRevealConfigs = [
  {
    section: "#about",
    selectors: [
      ".about-copy .bubble p",
      ".about-copy .caption-strip",
      ".about-relic .bubble",
      ".about-note h3",
      ".about-note p"
    ]
  },
  {
    section: "#story",
    selectors: [
      ".story-top-a .panel-tag",
      ".story-top-a .bubble",
      ".story-top-b .panel-tag",
      ".story-top-b .bubble",
      ".story-top-c .panel-tag",
      ".story-top-c .bubble",
      ".story-copy .caption-strip",
      ".story-copy p"
    ]
  },
  {
    section: "#battle",
    selectors: [
      ".battle-cut .bubble",
      ".battle-text h3",
      ".battle-text p"
    ]
  },
  {
    section: "#fall",
    selectors: [
      ".fall-main .bubble",
      ".fall-text h3",
      ".fall-text p"
    ]
  },
  {
    section: "#covenant",
    selectors: [
      ".covenant-main .bubble",
      ".covenant-text p"
    ]
  },
  {
    section: "#artifacts",
    selectors: [
      ".relic-panel:nth-child(1) .bubble",
      ".relic-panel:nth-child(2) .bubble",
      ".relic-panel:nth-child(3) .bubble",
      ".artifacts-note p"
    ]
  }
];

const textRevealTimings = { charStagger: 0.016 };

function setupTextRevealGroup(config) {
  const section = document.querySelector(config.section);
  if (!section || prefersReducedMotion) return null;

  const seen = new Set();
  const blocks = [];
  config.selectors.forEach((selector) => {
    section.querySelectorAll(selector).forEach((element) => {
      if (seen.has(element)) return;
      seen.add(element);
      const block = splitFadeText(element);
      if (block) blocks.push(block);
    });
  });

  if (blocks.length === 0) return null;
  return { section, trigger: blocks[0].element, blocks, played: false, pending: false, timers: [] };
}

const textRevealGroups = textRevealConfigs
  .map(setupTextRevealGroup)
  .filter(Boolean);

function clearTextRevealTimers(group) {
  group.timers.forEach((timer) => clearTimeout(timer));
  group.timers = [];
}

function playTextRevealGroup(group) {
  if (prefersReducedMotion || !group || group.blocks.length === 0) return;
  clearTextRevealTimers(group);
  const { charStagger } = textRevealTimings;

  group.blocks.forEach((block) => block.element.classList.remove("is-visible"));

  let delay = 0;
  group.blocks.forEach((block) => {
    const revealAt = Math.round(delay * 1000);
    group.timers.push(setTimeout(() => {
      block.element.classList.add("is-visible");
    }, revealAt));
    delay += block.length * charStagger;
  });
}

function isTextRevealTriggerReady(group) {
  if (!group?.trigger) return false;
  const rect = group.trigger.getBoundingClientRect();
  return rect.top < innerHeight * 0.9 && rect.bottom > innerHeight * 0.05;
}

function queueTextRevealGroup(group) {
  if (prefersReducedMotion || !group || group.played || group.pending) return;
  group.pending = true;

  const runWhenLayoutSettled = (delay = 120) => window.setTimeout(() => {
    requestAnimationFrame(() => {
      group.pending = false;
      if (group.played || !isTextRevealTriggerReady(group)) return;
      group.played = true;
      playTextRevealGroup(group);
    });
  }, delay);

  if (document.readyState === "complete") {
    runWhenLayoutSettled();
  } else {
    window.addEventListener("load", () => runWhenLayoutSettled(900), { once: true });
  }
}

function resetTextRevealVisuals() {
  textRevealGroups.forEach((group) => {
    clearTextRevealTimers(group);
    group.played = false;
    group.pending = false;
    group.blocks.forEach((block) => block.element.classList.remove("is-visible"));
  });
}

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

  const heroSection = document.querySelector("#hero");

  // Play once per section; reset only after the reader returns to the hero.
  const textRevealByTrigger = new Map(
    textRevealGroups.map((group) => [group.trigger, group])
  );

  const textRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const group = textRevealByTrigger.get(entry.target);
      queueTextRevealGroup(group);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -10% 0px" });

  const heroResetObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      replaySectionAnimations();
    });
  }, { threshold: 0.15 });

  textRevealGroups.forEach((group) => textRevealObserver.observe(group.trigger));
  if (heroSection) heroResetObserver.observe(heroSection);

  requestAnimationFrame(() => {
    textRevealGroups.forEach((group) => {
      const rect = group.trigger.getBoundingClientRect();
      if (rect.top >= innerHeight || rect.bottom <= 0 || group.played) return;
      queueTextRevealGroup(group);
    });
  });

  replaySectionAnimations = () => {
    revealElements.forEach((element) => {
      element.classList.remove("is-visible");
      revealObserver.observe(element);
    });
    resetTextRevealVisuals();
  };

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
preloadHeroSequence();

window.addEventListener("resize", sizeCanvas);
window.addEventListener("scroll", requestHeroUpdate, { passive: true });

video?.play().catch(() => {});
sizeCanvas();
updateHero();

if (location.hash) {
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToHash(location.hash, "auto")));
}

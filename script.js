const eyeSequence = document.querySelector("#eye-sequence");
const hero = document.querySelector(".hero-scroll");
const video = document.querySelector(".hero-video");
const copy = document.querySelector(".hero-copy");
const cue = document.querySelector(".scroll-cue");
const blackout = document.querySelector(".iris-blackout");
const counter = document.querySelector("#progress");
const aboutSection = document.querySelector("#about");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const HERO_DIVE_WHEEL_DISTANCE = 900;

let heroDiveStarted = false;
let heroDiveCompleted = false;
let heroDiveRaf = 0;
let heroDiveProgress = 0;
let heroDiveTarget = 0;
let touchLastY = 0;

function setHeroDiveProgress(progress) {
  const clamped = Math.min(1, Math.max(0, progress));
  const blackoutProgress = Math.min(1, Math.max(0, (clamped - 0.78) / 0.22));

  if (blackout) blackout.style.opacity = blackoutProgress;
  if (counter) counter.textContent = String(Math.round(clamped * 100)).padStart(2, "0");
  document.documentElement.style.setProperty("--progress", `${clamped * 100}%`);
}

function resetHeroDive() {
  cancelAnimationFrame(heroDiveRaf);
  heroDiveRaf = 0;
  heroDiveStarted = false;
  heroDiveCompleted = false;
  heroDiveProgress = 0;
  heroDiveTarget = 0;

  if (eyeSequence) {
    eyeSequence.pause();
    eyeSequence.currentTime = 0;
    eyeSequence.style.opacity = 0;
  }
  if (video) video.style.opacity = 1;
  if (copy) {
    copy.style.opacity = "";
    copy.style.transform = "";
  }
  if (cue) cue.style.opacity = "";
  if (blackout) blackout.style.opacity = 0;
  setHeroDiveProgress(0);
}

function finishHeroDive() {
  if (heroDiveCompleted) return;
  heroDiveCompleted = true;
  cancelAnimationFrame(heroDiveRaf);
  heroDiveRaf = 0;
  heroDiveProgress = 1;
  heroDiveTarget = 1;
  setHeroDiveProgress(1);

  if (!aboutSection) return;
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, aboutSection.offsetTop);
  requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
  });
}

function renderHeroDive() {
  heroDiveRaf = 0;
  if (!eyeSequence || heroDiveCompleted) return;
  heroDiveProgress = heroDiveTarget;

  const duration = Number.isFinite(eyeSequence.duration) ? eyeSequence.duration : 0;
  if (duration) {
    const lastFrameTime = Math.max(0, duration - 1 / 48);
    eyeSequence.currentTime = heroDiveProgress * lastFrameTime;
  }
  setHeroDiveProgress(heroDiveProgress);

  if (heroDiveProgress >= 1) {
    finishHeroDive();
  }
}

function startHeroDive() {
  if (!eyeSequence || heroDiveStarted || heroDiveCompleted) return;
  heroDiveStarted = true;

  if (copy) {
    copy.style.opacity = 0;
    copy.style.transform = "translateY(calc(-45% - 60px))";
  }
  if (cue) cue.style.opacity = 0;

  if (reducedMotionQuery.matches) {
    finishHeroDive();
    return;
  }

  eyeSequence.pause();
  eyeSequence.style.opacity = 1;
  if (video) video.style.opacity = 0;
}

function requestHeroDiveRender() {
  if (heroDiveRaf) return;
  heroDiveRaf = requestAnimationFrame(renderHeroDive);
}

function moveHeroDive(deltaPixels) {
  startHeroDive();
  if (!heroDiveStarted || heroDiveCompleted) return;
  heroDiveTarget = Math.min(1, Math.max(0, heroDiveTarget + deltaPixels / HERO_DIVE_WHEEL_DISTANCE));
  requestHeroDiveRender();
}

function isHeroActive() {
  if (!hero) return false;
  const rect = hero.getBoundingClientRect();
  return rect.top <= 1 && rect.bottom >= innerHeight * 0.8;
}

function handleHeroWheel(event) {
  if (heroDiveCompleted || !isHeroActive()) return;
  if (event.deltaY < 0 && !heroDiveStarted) return;

  const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
  event.preventDefault();
  moveHeroDive(event.deltaY * multiplier);
}

function handleHeroKey(event) {
  if (!isHeroActive() || heroDiveCompleted) return;
  if (!["ArrowDown", "PageDown", " "].includes(event.key)) return;
  event.preventDefault();
  moveHeroDive(event.key === "ArrowDown" ? 180 : 360);
}

function handleHeroTouchStart(event) {
  touchLastY = event.touches[0]?.clientY || 0;
}

function handleHeroTouchMove(event) {
  const currentY = event.touches[0]?.clientY || 0;
  const delta = touchLastY - currentY;
  touchLastY = currentY;
  if (heroDiveCompleted || !isHeroActive()) return;
  if (delta < 0 && !heroDiveStarted) return;
  event.preventDefault();
  moveHeroDive(delta * 2);
}

function scrollToHash(hash, behavior = "smooth") {
  if (!hash || hash === "#") return;
  const target = document.querySelector(hash);
  if (!target) return;
  if (hash === "#hero") resetHeroDive();
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

window.addEventListener("wheel", handleHeroWheel, { passive: false });
window.addEventListener("keydown", handleHeroKey);
window.addEventListener("touchstart", handleHeroTouchStart, { passive: true });
window.addEventListener("touchmove", handleHeroTouchMove, { passive: false });
eyeSequence?.addEventListener("loadedmetadata", () => {
  if (heroDiveStarted && !heroDiveCompleted) requestHeroDiveRender();
});

video?.play().catch(() => {});
eyeSequence?.load();
resetHeroDive();

if (location.hash) {
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToHash(location.hash, "auto")));
}

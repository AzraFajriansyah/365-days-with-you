"use strict";

/* ========================================
   1. DOM ELEMENTS
======================================== */

const opening = document.getElementById("opening");
const website = document.getElementById("website");

const openingAudio = document.getElementById("openingAudio");
const audio = document.getElementById("audio");

const disc = document.getElementById("disc");
const musicToggle = document.getElementById("musicToggle");

const lightbox = document.getElementById("memoryLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");

const MUSIC_VOLUME = 0.35;
const AUDIO_FADE_DURATION = 1500;
const PARTICLE_SYMBOLS = [
  "💗", "💕", "💖", "💞", "🌷",
  "🌸", "🌻", "💐", "🧸", "🐻",
  "🦋", "✨", "🥰", "😘", "❤️",
];

const HEART_SYMBOLS = ["❤️", "💗", "💕", "🌸", "✨"];

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let activeAudio = null;
let previousFocus = null;
let previousBodyOverflow = "";

let audioSwitchId = 0;
const fadeTimers = new Map();

/* ========================================
   2. SHARED UTILITIES
======================================== */

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function removeAfterAnimation(element, fallbackDuration = 7500) {
  const cleanup = () => element.remove();

  element.addEventListener("animationend", cleanup, { once: true });

  window.setTimeout(cleanup, fallbackDuration);
}

function scrollToElement(element, block = "center") {
  if (!element) return;

  element.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block,
  });
}

/* ========================================
   3. OPENING EXPERIENCE
======================================== */

function openWebsite() {
  if (!opening || !website || website.classList.contains("show")) {
    return;
  }

  opening.classList.add("hidden");
  website.classList.add("show");

  window.scrollTo({
    top: 0,
    behavior: reduceMotion ? "auto" : "smooth",
  });

  createHearts();
  switchAudio(openingAudio);
}

/* ========================================
   4. AUDIO FADE SYSTEM
======================================== */

function fadeVolume(player, targetVolume, duration = AUDIO_FADE_DURATION) {
  if (!player) return Promise.resolve();

  const previousFade = fadeTimers.get(player);

  if (previousFade) {
    clearInterval(previousFade.timer);
    fadeTimers.delete(player);
    previousFade.resolve();
  }

  const target = Math.max(0, Math.min(1, targetVolume));

  if (reduceMotion || duration <= 0) {
    player.volume = target;
    return Promise.resolve();
  }

  const startVolume = player.volume;
  const difference = target - startVolume;
  const steps = 30;
  const interval = duration / steps;

  let currentStep = 0;

  return new Promise((resolve) => {
    const fade = {
      timer: null,
      resolve,
    };

    fade.timer = window.setInterval(() => {
      currentStep++;

      player.volume = Math.max(
        0,
        Math.min(1, startVolume + difference * (currentStep / steps)),
      );

      if (currentStep >= steps) {
        clearInterval(fade.timer);
        fadeTimers.delete(player);

        player.volume = target;
        resolve();
      }
    }, interval);

    fadeTimers.set(player, fade);
  });
}

/* ========================================
   5. MUSIC PLAYER
======================================== */

async function switchAudio(target) {
  if (!target) return;

  if (activeAudio === target && !target.paused) return;

  const switchId = ++audioSwitchId;
  const previous = activeAudio;

  // Start the new track silently.
  target.volume = 0;

  try {
    await target.play();
  } catch (error) {
    console.warn("Music playback failed:", error);
    updateMusicUI();
    return;
  }

  // Ignore outdated audio switch requests.
  if (switchId !== audioSwitchId) {
    target.pause();
    return;
  }

  activeAudio = target;
  updateMusicUI();

  // Fade out the previous track.
  if (previous && previous !== target && !previous.paused) {
    await fadeVolume(previous, 0, 1000);

    if (activeAudio !== target) return;

    previous.pause();
    previous.currentTime = 0;
  }

  // Fade in the current track.
  if (activeAudio === target && !target.paused) {
    await fadeVolume(target, MUSIC_VOLUME, AUDIO_FADE_DURATION);
  }
}

function updateMusicUI() {
  const isPlaying = Boolean(activeAudio && !activeAudio.paused);

  if (musicToggle) {
    musicToggle.textContent = isPlaying ? "♫" : "♪";

    musicToggle.setAttribute(
      "aria-label",
      isPlaying ? "Pause music" : "Play music",
    );
  }

  if (disc) {
    disc.classList.toggle(
      "playing",
      audio === activeAudio && isPlaying,
    );
  }
}

async function toggleMusic() {
  if (!activeAudio) {
    await switchAudio(openingAudio);
    return;
  }

  const player = activeAudio;

  if (player.paused) {
    try {
      await player.play();

      if (activeAudio !== player) return;

      await fadeVolume(player, MUSIC_VOLUME, 1200);
    } catch (error) {
      console.warn("Unable to resume music:", error);
    }
  } else {
    await fadeVolume(player, 0, 700);

    if (activeAudio === player && !player.paused) {
      player.pause();
    }
  }

  updateMusicUI();
}

function playOurSong() {
  switchAudio(audio);
}

// Register audio events.
[openingAudio, audio].forEach((player) => {
  if (!player) return;

  player.addEventListener("play", updateMusicUI);
  player.addEventListener("pause", updateMusicUI);
  player.addEventListener("ended", updateMusicUI);
});

/* ========================================
   6. ANNIVERSARY COUNTER
======================================== */

const startDate = new Date(2025, 10, 11);
const MILLISECONDS_PER_DAY = 86400000;

function updateCounter() {
  const daysElement = document.getElementById("days");

  if (!daysElement) return;

  const today = new Date();

  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const elapsedDays = Math.floor(
    (todayDate - startDate) / MILLISECONDS_PER_DAY,
  );

  const isAnniversary =
    todayDate.getMonth() === 10 &&
    todayDate.getDate() === 11;

  daysElement.textContent = Math.max(0, elapsedDays).toLocaleString("id-ID");

  if (isAnniversary) {
    daysElement.textContent = "365";
    daysElement.dataset.status = "anniversary";
  } else {
    daysElement.dataset.status = "counting";
  }
}

updateCounter();

/* ========================================
   7. LOVE LETTER EXPERIENCE
======================================== */

function openLoveLetter() {
  const letter = document.getElementById("loveLetter");
  const envelope = document.getElementById("letterEnvelope");

  if (!letter || !envelope) return;

  if (letter.classList.contains("letter-open")) return;

  letter.classList.remove("letter-closed");
  letter.classList.add("letter-open");

  envelope.classList.add("hidden");

  scrollToElement(letter);
  createHearts();
}

/* ========================================
   8. MEMORY PHOTO LIGHTBOX
======================================== */

function openMemory(image) {
  if (!image || !lightbox || !lightboxImage || !lightboxCaption) {
    return;
  }

  previousFocus = image;
  previousBodyOverflow = document.body.style.overflow;

  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt || "A memory of us";

  lightboxCaption.textContent =
    image.closest(".memory-card")?.querySelector("p")?.textContent ||
    "A little memory with you";

  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";

  lightbox.querySelector(".lightbox-close")?.focus();
}

function closeMemory(event) {
  if (event && event.target !== event.currentTarget) return;

  if (!lightbox || !lightbox.classList.contains("open")) return;

  lightbox.classList.remove("open");
  document.body.style.overflow = previousBodyOverflow;

  if (lightboxImage) {
    lightboxImage.src = "";
  }

  if (previousFocus) {
    previousFocus.focus();
    previousFocus = null;
  }
}

/* ========================================
   9. SECRET SURPRISE
======================================== */

function revealSecret() {
  const message = document.getElementById("secretMessage");
  const box = document.querySelector(".secret-box");

  if (!message || !box) return;

  const button = box.querySelector(".primary-btn");

  if (!message.classList.contains("hidden")) {
    sendHugs();
    return;
  }

  message.classList.remove("hidden");
  box.classList.add("secret-open");

  if (button) {
    button.textContent = "A thousand hugs for you 💗";
    button.disabled = false;
    button.style.opacity = "1";
  }

  const note = document.createElement("div");

  note.className = "surprise-note";
  note.textContent = "To more chapters, with you. ♡";

  message.appendChild(note);

  scrollToElement(message);

  createHearts();
  sendHugs();
}

/* ========================================
   10. PARTICLE & HEART EFFECTS
======================================== */

function createParticles({
  symbols,
  amount,
  className,
  duration,
  minSize,
  maxSize,
  stagger = 0,
}) {
  if (reduceMotion) return;

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < amount; i++) {
    const particle = document.createElement("span");

    particle.className = className;
    particle.textContent = randomItem(symbols);

    particle.style.left = `${randomBetween(0, 100)}vw`;
    particle.style.bottom = "-40px";

    if (className === "hug-particle") {
      particle.style.setProperty(
        "--drift",
        `${randomBetween(-90, 90)}px`,
      );

      particle.style.setProperty(
        "--rotation",
        `${randomBetween(-180, 180)}deg`,
      );

      particle.style.fontSize = `${randomBetween(minSize, maxSize)}px`;
      particle.style.animationDuration = `${randomBetween(3, duration)}s`;
      particle.style.animationDelay = `${Math.random() * stagger}s`;
    } else {
      particle.style.fontSize = `${randomBetween(minSize, maxSize)}px`;
      particle.style.animationDuration = `${randomBetween(3, duration)}s`;
    }

    fragment.appendChild(particle);

    removeAfterAnimation(
      particle,
      (duration + stagger + 1) * 1000,
    );
  }

  document.body.appendChild(fragment);
}

function sendHugs() {
  createParticles({
    symbols: PARTICLE_SYMBOLS,
    amount: 35,
    className: "hug-particle",
    duration: 6,
    minSize: 18,
    maxSize: 43,
    stagger: 0.8,
  });

  // Animate the surprise button.
  const button = document.querySelector(
    "#secret .secret-box .primary-btn",
  );

  if (button) {
    button.classList.remove("hug-click");

    // Restart the CSS animation.
    void button.offsetWidth;

    button.classList.add("hug-click");
  }
}

function createHearts() {
  createParticles({
    symbols: HEART_SYMBOLS,
    amount: 12,
    className: "floating-heart",
    duration: 7,
    minSize: 15,
    maxSize: 35,
  });
}

/* ========================================
   11. DECORATIVE HEARTS
======================================== */

function createDecorativeHeart() {
  if (!website || !website.classList.contains("show")) return;
  if (reduceMotion) return;

  if (Math.random() > 0.65) {
    const heart = document.createElement("div");

    heart.className = "floating-heart";
    heart.textContent = randomItem(["❤️", "💗", "✨"]);

    heart.style.left = `${randomBetween(0, 100)}vw`;
    heart.style.fontSize = "18px";
    heart.style.animationDuration = "5s";

    document.body.appendChild(heart);

    removeAfterAnimation(heart, 5500);
  }
}

if (!reduceMotion) {
  window.setInterval(createDecorativeHeart, 5000);
}

/* ========================================
   12. KEYBOARD & ACCESSIBILITY
======================================== */

function initializeMemoryGallery() {
  const images = document.querySelectorAll(
    "#memories .gallery .memory-card img",
  );

  images.forEach((image) => {
    image.tabIndex = 0;
    image.setAttribute("role", "button");

    image.setAttribute(
      "aria-label",
      `View ${image.alt || "memory photo"}`,
    );

    image.addEventListener("click", () => {
      openMemory(image);
    });

    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMemory(image);
      }
    });
  });
}

function initializeKeyboardControls() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMemory();
    }

    if (
      lightbox?.classList.contains("open") &&
      event.key === "Tab"
    ) {
      const closeButton = lightbox.querySelector(".lightbox-close");

      if (closeButton) {
        event.preventDefault();
        closeButton.focus();
      }
    }
  });
}

/* ========================================
   13. SCROLL REVEAL
======================================== */

function initializeScrollReveal() {
  const revealTargets = document.querySelectorAll(
    [
      "section > .section-label",
      "section > .section-title",
      "section > .description",
      ".memory-card",
      ".event",
      ".reason",
      ".paper",
      ".song-card",
      ".secret-box",
    ].join(", "),
  );

  if (reduceMotion) {
    revealTargets.forEach((element) => {
      element.classList.add("is-visible");
    });

    return;
  }

  revealTargets.forEach((element) => {
    element.classList.add("reveal");
  });

  if (!("IntersectionObserver" in window)) {
    revealTargets.forEach((element) => {
      element.classList.add("is-visible");
    });

    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -35px 0px",
    },
  );

  revealTargets.forEach((element) => {
    revealObserver.observe(element);
  });
}

/* ========================================
   14. ACTIVE NAVIGATION
======================================== */

function initializeActiveNavigation() {
  const navLinks = [...document.querySelectorAll("nav a")];

  const sections = navLinks
    .map((link) => {
      const href = link.getAttribute("href");

      if (!href?.startsWith("#")) return null;

      return document.querySelector(href);
    })
    .filter(Boolean);

  if (!("IntersectionObserver" in window)) return;

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        navLinks.forEach((link) => {
          const active =
            link.getAttribute("href") === `#${entry.target.id}`;

          link.classList.toggle("active", active);

          if (active) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    },
    {
      rootMargin: "-25% 0px -60% 0px",
    },
  );

  sections.forEach((section) => {
    navObserver.observe(section);
  });
}

/* ========================================
   15. APPLICATION INITIALIZATION
======================================== */

function initializeApp() {
  initializeMemoryGallery();
  initializeKeyboardControls();
  initializeScrollReveal();
  initializeActiveNavigation();

  updateMusicUI();
}

// Support both deferred and dynamically loaded scripts.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp, {
    once: true,
  });
} else {
  initializeApp();
}

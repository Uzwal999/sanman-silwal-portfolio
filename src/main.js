import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createGlobe } from "./globe.js";
import { createToolkit } from "./toolkit.js";
import { createContactForm, copyText } from "./contact.js";
import { career, expertise, toolkit, icons } from "./data.js";

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- Content ---------- */

function renderCareer() {
  $(".timeline__items").innerHTML = career
    .map(
      (job) => `
      <article class="job">
        <div class="job__head">
          <h3>${job.role}</h3>
          <p class="job__company">${job.company}</p>
          <p class="job__meta">${job.meta} · ${job.period}</p>
        </div>
        <div class="job__year">${job.year}</div>
        <ul class="job__points">${job.points.map((p) => `<li>${p}</li>`).join("")}</ul>
      </article>`
    )
    .join("");
}

function renderExpertise() {
  $(".expertise__track").innerHTML = expertise
    .map(
      (item, i) => `
      <article class="slide">
        <div class="slide__info">
          <span class="slide__num">0${i + 1}</span>
          <h3>${item.title}</h3>
          <p class="slide__tag">${item.tag}</p>
          <p class="slide__text">${item.text}</p>
        </div>
        <div class="slide__visual" aria-hidden="true">
          <div class="slide__panel">
            <svg viewBox="0 0 24 24">${icons[item.icon]}</svg>
            <span class="slide__ghost">0${i + 1}</span>
          </div>
        </div>
      </article>`
    )
    .join("");
  $(".expertise__count span").textContent = String(expertise.length).padStart(2, "0");
}

function splitLetters(el) {
  const text = el.textContent;
  el.setAttribute("aria-label", text);
  el.innerHTML = [...text]
    .map((ch) => `<span class="ch" aria-hidden="true">${ch === " " ? "&nbsp;" : ch}</span>`)
    .join("");
  return $$(".ch", el);
}

renderCareer();
renderExpertise();
$(".year").textContent = new Date().getFullYear();

/* ---------- Smooth scroll ---------- */

let lenis;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.stop();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- Toast ---------- */

const toastEl = $(".toast");
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
}

const contact = createContactForm({ toast });

function scrollToEl(target, onComplete) {
  const offset = target.id === "connect" ? -110 : 0;
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.4, onComplete });
  else {
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: offset ? "center" : "start" });
    onComplete && setTimeout(onComplete, reduceMotion ? 0 : 700);
  }
}

$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const target = $(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    const mode = a.dataset.mode;
    if (mode) contact.setMode(mode);
    scrollToEl(target, mode ? () => contact.form.querySelector("input:not(:disabled)").focus({ preventScroll: true }) : null);
  })
);

/* ---------- Mobile menu ---------- */

const menu = $(".menu");
const burger = $(".nav__burger");
function openMenu() {
  document.body.classList.add("menu-open");
  burger.setAttribute("aria-expanded", "true");
  menu.setAttribute("aria-hidden", "false");
  lenis?.stop();
  gsap.fromTo(
    ".menu__links a, .menu__cta .btn",
    { yPercent: 60, opacity: 0 },
    { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.7, ease: "power4.out", delay: 0.15 }
  );
}
function closeMenu() {
  if (!document.body.classList.contains("menu-open")) return;
  document.body.classList.remove("menu-open");
  burger.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-hidden", "true");
  lenis?.start();
}
burger.addEventListener("click", () =>
  document.body.classList.contains("menu-open") ? closeMenu() : openMenu()
);
window.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

/* ---------- Copy buttons ---------- */

$$("[data-copy]").forEach((btn) =>
  btn.addEventListener("click", async () => {
    const ok = await copyText(btn.dataset.copy);
    toast(ok ? `Copied ${btn.dataset.copy}` : "Couldn't copy — please select it manually");
    if (ok) {
      btn.classList.add("is-done");
      setTimeout(() => btn.classList.remove("is-done"), 1600);
    }
  })
);

/* ---------- Rolling link text ---------- */

$$(".roll").forEach((el) => {
  const text = el.textContent.trim();
  el.innerHTML = `<span class="roll__clip"><span class="roll__inner" data-text="${text}">${text}</span></span>`;
});

/* ---------- Magnetic buttons ---------- */

if (finePointer && !reduceMotion) {
  $$("[data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.35);
      yTo((e.clientY - r.top - r.height / 2) * 0.45);
    });
    el.addEventListener("pointerleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" });
    });
  });

  // 3D tilt with a moving glare
  $$("[data-tilt], .cred").forEach((el) => {
    gsap.set(el, { transformPerspective: 800 });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--gx", `${x * 100}%`);
      el.style.setProperty("--gy", `${y * 100}%`);
      gsap.to(el, { rotateY: (x - 0.5) * 10, rotateX: (0.5 - y) * 10, duration: 0.5, ease: "power2.out" });
    });
    el.addEventListener("pointerleave", () =>
      gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "power3.out" })
    );
  });

  // Portrait drifts against the cursor for depth
  const px = gsap.quickTo(".portrait", "x", { duration: 1.2, ease: "power3.out" });
  const py = gsap.quickTo(".portrait", "y", { duration: 1.2, ease: "power3.out" });
  window.addEventListener("pointermove", (e) => {
    px((e.clientX / innerWidth - 0.5) * -22);
    py((e.clientY / innerHeight - 0.5) * -10);
  });
}

/* ---------- Marquee ---------- */

function marquee() {
  const rows = $$(".marquee__row").map((row, i) => {
    const track = $(".marquee__track", row);
    track.innerHTML += track.innerHTML;
    return { track, x: 0, dir: i % 2 ? 1 : -1 };
  });
  let boost = 0;
  let flip = 1;
  gsap.ticker.add((_, dt) => {
    const v = lenis ? lenis.velocity : 0;
    if (Math.abs(v) > 0.5) flip = Math.sign(v);
    boost += (Math.min(Math.abs(v), 40) - boost) * 0.08;
    rows.forEach((r) => {
      const half = r.track.scrollWidth / 2;
      if (!half) return;
      r.x += r.dir * flip * (40 + boost * 18) * (dt / 1000);
      r.x = ((r.x % half) - half) % half;
      r.track.style.transform = `translate3d(${r.x}px,0,0) skewX(${-r.dir * flip * Math.min(boost, 20) * 0.4}deg)`;
    });
  });
}

/* ---------- Cursor ---------- */

if (finePointer && !reduceMotion) {
  const cursor = $(".cursor");
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const target = { ...pos };
  window.addEventListener("pointermove", (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
    cursor.classList.add("is-visible");
  });
  document.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
  gsap.ticker.add(() => {
    pos.x += (target.x - pos.x) * 0.2;
    pos.y += (target.y - pos.y) * 0.2;
    cursor.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  });
  document.addEventListener("pointerover", (e) => {
    cursor.classList.toggle("is-link", !!e.target.closest("[data-cursor=link], a, button"));
    cursor.classList.toggle("is-drag", !!e.target.closest(".globe, .toolkit__canvas"));
  });
} else {
  $(".cursor").remove();
}

/* ---------- Hero roles ---------- */

function startRoles() {
  const roles = $$(".hero__role");
  const letters = roles.map(splitLetters);
  letters.forEach((chars) =>
    chars.forEach((ch, k) => {
      const pct = Math.round((k / Math.max(chars.length - 1, 1)) * 100);
      ch.style.color = `color-mix(in oklab, var(--accent), var(--violet) ${pct}%)`;
    })
  );
  roles.forEach((r, i) => i && gsap.set(letters[i], { yPercent: 110 }));
  let current = 0;
  gsap.set(letters[0], { yPercent: 110 });
  gsap.to(letters[0], { yPercent: 0, stagger: 0.03, duration: 0.8, ease: "power4.out", delay: 0.4 });
  if (reduceMotion) return;
  setInterval(() => {
    const next = (current + 1) % roles.length;
    gsap.to(letters[current], { yPercent: -110, stagger: 0.02, duration: 0.6, ease: "power3.in" });
    gsap.fromTo(
      letters[next],
      { yPercent: 110 },
      { yPercent: 0, stagger: 0.03, duration: 0.8, ease: "power4.out", delay: 0.45 }
    );
    roles[current].classList.remove("is-active");
    roles[next].classList.add("is-active");
    current = next;
  }, 3200);
}

/* ---------- Intro + scroll animations ---------- */

function intro() {
  const nameLetters = $$(".hero__name .split").flatMap(splitLetters);
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.from(".nav > *", { y: -30, opacity: 0, stagger: 0.08, duration: 0.9 }, 0)
    .from(".stage__inner", { scale: 0.85, opacity: 0, duration: 1.6 }, 0)
    .from(".portrait img", { yPercent: 18, opacity: 0, duration: 1.5 }, 0.15)
    .from(nameLetters, { yPercent: 115, stagger: 0.035, duration: 1 }, 0.25)
    .from(".reveal-up", { y: 24, opacity: 0, stagger: 0.1, duration: 0.9 }, 0.35)
    .from(".hero__cta .btn", { y: 30, opacity: 0, stagger: 0.12, duration: 1 }, 0.7)
    .from(".socials a, .hero__hint", { opacity: 0, y: 16, stagger: 0.08, duration: 0.8 }, 0.6);
  startRoles();
}

function scrollAnimations() {
  const mm = gsap.matchMedia();

  const bar = $(".progress span");
  const nav = $(".nav");
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      bar.style.transform = `scaleX(${self.progress})`;
      const y = self.scroll();
      nav.classList.toggle("is-solid", y > 40);
      nav.classList.toggle("is-hidden", self.direction === 1 && y > 400 && !document.body.classList.contains("menu-open"));
    },
  });

  $$(".nav__links a").forEach((link) => {
    const section = $(link.getAttribute("href"));
    ScrollTrigger.create({
      trigger: section,
      start: "top 50%",
      end: "bottom 50%",
      onToggle: (self) => link.classList.toggle("is-active", self.isActive),
    });
  });

  const body = $(".about__body");
  body.innerHTML = body.textContent
    .trim()
    .split(/\s+/)
    .map((w) => `<span class="word">${w}</span>`)
    .join(" ");
  gsap.fromTo(
    ".about__body .word",
    { opacity: 0.18 },
    {
      opacity: 1,
      stagger: 0.05,
      ease: "none",
      scrollTrigger: { trigger: body, start: "top 80%", end: "bottom 45%", scrub: true },
    }
  );

  mm.add("(min-width: 900px)", () => {
    gsap
      .timeline({
        scrollTrigger: { trigger: ".about", start: "top bottom", end: "top 15%", scrub: 1 },
      })
      .to(".stage__inner", { xPercent: -24, scale: 0.92, ease: "none" }, 0)
      .to(".hero__left", { x: -120, opacity: 0, ease: "none" }, 0)
      .to(".hero__right", { x: 120, opacity: 0, ease: "none" }, 0)
      .to(".hero__hint", { opacity: 0, ease: "none" }, 0);
  });
  mm.add("(max-width: 899px)", () => {
    gsap.to(".stage__inner", {
      opacity: 0.25,
      scale: 0.9,
      ease: "none",
      scrollTrigger: { trigger: ".about", start: "top bottom", end: "top 30%", scrub: 1 },
    });
  });

  // About content
  gsap.from(".about__content > *", {
    y: 50,
    opacity: 0,
    stagger: 0.12,
    duration: 1,
    ease: "power3.out",
    scrollTrigger: { trigger: ".about", start: "top 55%" },
  });

  $$(".stat__num").forEach((el) => {
    const obj = { n: 0 };
    gsap.to(obj, {
      n: +el.dataset.count,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => (el.textContent = Math.round(obj.n)),
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // What I do
  gsap.from(".whatido__title > span", {
    yPercent: 60,
    opacity: 0,
    stagger: 0.15,
    duration: 1.1,
    ease: "power4.out",
    scrollTrigger: { trigger: ".whatido", start: "top 70%" },
  });
  gsap.from(".wcard", {
    y: 80,
    opacity: 0,
    stagger: 0.15,
    duration: 1.1,
    ease: "power3.out",
    scrollTrigger: { trigger: ".whatido__cards", start: "top 80%" },
  });

  // Section titles
  $$(".section-title, .toolkit__title, .contact__title").forEach((el) =>
    gsap.from(el, {
      y: 60,
      opacity: 0,
      duration: 1.1,
      ease: "power4.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
    })
  );

  // Career timeline
  gsap.fromTo(
    ".timeline__progress",
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: "none",
      scrollTrigger: { trigger: ".timeline", start: "top 60%", end: "bottom 60%", scrub: true },
    }
  );
  gsap.fromTo(
    ".timeline__dot",
    { top: "0%" },
    {
      top: "100%",
      ease: "none",
      scrollTrigger: { trigger: ".timeline", start: "top 60%", end: "bottom 60%", scrub: true },
    }
  );
  $$(".job").forEach((job) =>
    gsap.from(job.children, {
      y: 40,
      opacity: 0,
      stagger: 0.1,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: job, start: "top 80%" },
    })
  );

  // Credentials
  gsap.from(".cred", {
    y: 50,
    opacity: 0,
    stagger: 0.08,
    duration: 0.9,
    ease: "power3.out",
    scrollTrigger: { trigger: ".creds__grid", start: "top 80%" },
  });

  gsap.from(".status, .ccard, .contact__langs", {
    y: 40,
    opacity: 0,
    stagger: 0.08,
    duration: 0.9,
    ease: "power3.out",
    scrollTrigger: { trigger: ".contact__layout", start: "top 85%" },
  });
  gsap.from(".cform", {
    y: 60,
    opacity: 0,
    duration: 1.1,
    ease: "power3.out",
    scrollTrigger: { trigger: ".cform", start: "top 90%" },
  });
}

/* ---------- What I do cards: follow-the-cursor glow ---------- */

$$(".wcard").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

/* ---------- Expertise carousel ---------- */

function carousel() {
  const track = $(".expertise__track");
  const slides = $$(".slide", track);
  const count = $(".expertise__count b");
  let index = 0;

  const go = (i) => {
    index = (i + slides.length) % slides.length;
    gsap.to(track, { xPercent: -100 * index, duration: reduceMotion ? 0 : 0.9, ease: "power3.inOut" });
    slides.forEach((s, j) => s.classList.toggle("is-active", j === index));
    count.textContent = String(index + 1).padStart(2, "0");
  };
  $(".arrow--prev").addEventListener("click", () => go(index - 1));
  $(".arrow--next").addEventListener("click", () => go(index + 1));

  let startX = null;
  const viewport = $(".expertise__viewport");
  viewport.addEventListener("pointerdown", (e) => (startX = e.clientX));
  viewport.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
  window.addEventListener("keydown", (e) => {
    const rect = viewport.getBoundingClientRect();
    if (rect.top > innerHeight || rect.bottom < 0) return;
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  });

  // 3D tilt on the visual panel
  slides.forEach((slide) => {
    const panel = $(".slide__panel", slide);
    slide.addEventListener("pointermove", (e) => {
      const r = slide.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(panel, { rotateY: x * 18, rotateX: -y * 18, duration: 0.6, ease: "power2.out" });
    });
    slide.addEventListener("pointerleave", () =>
      gsap.to(panel, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "power3.out" })
    );
  });
  go(0);
}

/* ---------- Clock ---------- */

function clock() {
  const el = $(".clock");
  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  });
  const tick = () => (el.textContent = `${fmt.format(new Date())} NPT`);
  tick();
  setInterval(tick, 30_000);
}

/* ---------- Loader ---------- */

function loader() {
  const num = $(".loader__num");
  const bar = $(".loader__bar span");
  const state = { p: 0 };
  const assets = Promise.all([
    document.fonts.ready,
    new Promise((res) => {
      const img = $(".portrait img");
      img.complete ? res() : img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
    }),
  ]);

  const counter = gsap.to(state, {
    p: 90,
    duration: 1.8,
    ease: "power2.out",
    onUpdate: () => {
      num.textContent = Math.round(state.p);
      bar.style.transform = `scaleX(${state.p / 100})`;
    },
  });

  assets.then(() => {
    counter.kill();
    gsap
      .timeline()
      .to(state, {
        p: 100,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => {
          num.textContent = Math.round(state.p);
          bar.style.transform = `scaleX(${state.p / 100})`;
        },
      })
      .to(".loader > *", { y: -30, opacity: 0, stagger: 0.06, duration: 0.5, ease: "power2.in" })
      .to(".loader", {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.9,
        ease: "power4.inOut",
        onComplete: () => $(".loader").remove(),
      })
      .add(() => {
        document.body.classList.add("is-loaded");
        lenis?.start();
        ScrollTrigger.refresh();
        intro();
        const mode = { "#hire": "hire", "#job": "job" }[location.hash];
        if (mode) {
          contact.setMode(mode);
          setTimeout(() => scrollToEl(contact.form), 900);
        }
      }, "-=0.5");

    createToolkit($(".toolkit__canvas"), toolkit);
  });
}

const globe = createGlobe($(".globe"), $(".globe-labels"));
$$(".chip[data-city]").forEach((chip) =>
  chip.addEventListener("click", () => {
    $$(".chip[data-city]").forEach((c) => c.classList.toggle("is-active", c === chip));
    globe.flyTo(chip.dataset.city);
  })
);
marquee();

/* ---------- Theme ---------- */

const root = document.documentElement;
const themeBtn = $(".theme-toggle");

function applyTheme(theme, save) {
  root.dataset.theme = theme;
  $('meta[name="theme-color"]').content = theme === "light" ? "#f5f3ee" : "#0a0b10";
  themeBtn.setAttribute("aria-label", `Switch to ${theme === "light" ? "dark" : "light"} mode`);
  globe.setTheme(theme);
  if (save) {
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }
}
applyTheme(root.dataset.theme);

themeBtn.addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  if (!document.startViewTransition || reduceMotion) return applyTheme(next, true);
  // Reveal the new theme as a circle growing out of the button.
  const r = themeBtn.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.startViewTransition(() => applyTheme(next, true)).ready.then(() =>
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 750, easing: "cubic-bezier(0.7, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
    )
  );
});

// Follow the system setting until the visitor picks a theme themselves.
matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  let saved;
  try {
    saved = localStorage.getItem("theme");
  } catch {}
  if (!saved) applyTheme(e.matches ? "light" : "dark");
});
carousel();
clock();
scrollAnimations();
loader();

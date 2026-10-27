import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createGlobe } from "./globe.js";
import { createToolkit } from "./toolkit.js";
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

$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const target = $(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(target, { offset: 0, duration: 1.4 }) : target.scrollIntoView({ behavior: "smooth" });
  })
);

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
    .from(".socials a, .hero__hint", { opacity: 0, y: 16, stagger: 0.08, duration: 0.8 }, 0.6);
  startRoles();
}

function scrollAnimations() {
  const mm = gsap.matchMedia();

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

  gsap.from(".contact__mail, .contact__grid > div", {
    y: 40,
    opacity: 0,
    stagger: 0.1,
    duration: 0.9,
    ease: "power3.out",
    scrollTrigger: { trigger: ".contact__mail", start: "top 90%" },
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
  const tick = () => (el.textContent = `· ${fmt.format(new Date())} NPT`);
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
      }, "-=0.5");

    createToolkit($(".toolkit__canvas"), toolkit);
  });
}

createGlobe($(".globe"), $(".globe-labels"));
carousel();
clock();
scrollAnimations();
loader();

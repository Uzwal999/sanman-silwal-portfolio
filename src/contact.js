import gsap from "gsap";

const EMAIL = "sanmansilwal1@gmail.com";

const MODES = {
  hire: { submit: "Send hiring enquiry" },
  job: { submit: "Send job enquiry" },
};

function compose(form) {
  const data = new FormData(form);
  const get = (k) => (data.get(k) || "").toString().trim();
  const name = get("name");
  const lines = (pairs) =>
    pairs
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

  if (form.dataset.mode === "hire") {
    const company = get("company");
    return {
      subject: `Hiring enquiry from ${company || name}`,
      body: `Hi Sanman,\n\n${get("message")}\n\n---\n${lines([
        ["Name", name],
        ["Email", get("email")],
        ["Company", company],
        ["Looking for", get("need")],
      ])}\n\nSent from your portfolio website`,
    };
  }
  const role = get("role");
  return {
    subject: `Job enquiry: ${role || "open to opportunities"} — ${name}`,
    body: `Hi Sanman,\n\n${get("message")}\n\n---\n${lines([
      ["Name", name],
      ["Email", get("email")],
      ["Role I'm looking for", role],
      ["Experience", get("experience")],
      ["Preferred locations", data.getAll("locations").join(", ")],
      ["CV / LinkedIn", get("cv")],
    ])}\n\nSent from your portfolio website`,
  };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function burst(from) {
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const colors = ["#5eead4", "#a78bfa", "#fbbf24", "#f472b6", "#e7e9ee"];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement("span");
    p.className = "spark";
    p.style.background = colors[i % colors.length];
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    document.body.appendChild(p);
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 140;
    gsap.to(p, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 40,
      rotate: Math.random() * 360,
      scale: 0.4 + Math.random(),
      opacity: 0,
      duration: 0.9 + Math.random() * 0.6,
      ease: "power3.out",
      onComplete: () => p.remove(),
    });
  }
}

export function createContactForm({ toast }) {
  const form = document.querySelector("#connect");
  const tabs = [...form.querySelectorAll(".cform__tab")];
  const only = [...form.querySelectorAll("[data-only]")];
  const messageLabel = form.querySelector("[data-hire]");
  const submitText = form.querySelector(".cform__submit-text");
  const grid = form.querySelector(".cform__grid");
  const foot = form.querySelector(".cform__foot");
  const done = form.querySelector(".cform__done");
  let last = null;

  function setMode(mode) {
    if (!MODES[mode]) return;
    form.dataset.mode = mode;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.mode === mode)));
    only.forEach((el) => {
      const on = el.dataset.only === mode;
      el.hidden = !on;
      el.querySelectorAll("input, select, textarea").forEach((i) => (i.disabled = !on));
    });
    messageLabel.textContent = messageLabel.dataset[mode];
    submitText.textContent = MODES[mode].submit;
    gsap.fromTo(
      form.querySelectorAll(`.cform__grid > :not([hidden])`),
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.04, duration: 0.5, ease: "power3.out" }
    );
  }

  function showDone(show) {
    grid.hidden = show;
    foot.hidden = show;
    tabs[0].parentElement.hidden = show;
    done.hidden = !show;
    if (show) gsap.from(done.children, { y: 20, opacity: 0, stagger: 0.08, duration: 0.6, ease: "power3.out" });
  }

  tabs.forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));

  form.addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("is-invalid"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const invalid = [...form.querySelectorAll("input, select, textarea")].filter(
      (el) => !el.disabled && !el.checkValidity()
    );
    form.querySelectorAll(".field.is-invalid").forEach((f) => f.classList.remove("is-invalid"));
    if (invalid.length) {
      invalid.forEach((el) => {
        const field = el.closest(".field");
        field.classList.add("is-invalid");
        gsap.fromTo(field, { x: -6 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
      });
      invalid[0].focus();
      toast("Please fill in the highlighted fields");
      return;
    }
    last = compose(form);
    burst(form.querySelector("[type=submit]"));
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(last.subject)}&body=${encodeURIComponent(last.body)}`;
    showDone(true);
  });

  form.querySelector("[data-action=copy-message]").addEventListener("click", async () => {
    if (!last) return;
    const ok = await copyText(`To: ${EMAIL}\nSubject: ${last.subject}\n\n${last.body}`);
    toast(ok ? "Message copied — paste it into any email" : "Couldn't copy — please select it manually");
  });
  form.querySelector("[data-action=reset]").addEventListener("click", () => {
    form.reset();
    showDone(false);
    setMode(form.dataset.mode);
  });

  setMode(form.dataset.mode);
  return { form, setMode };
}

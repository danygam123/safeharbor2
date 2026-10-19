// home.js — App shell: bottom tab bar, Home screen, breathing exercise, confetti, install hint.
// Requires: data.js, auth.js, app.js (loaded before this file). Works signed-out and signed-in.
// Private data (check-ins) is only read for the signed-in user, via the same RLS-protected client.

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toast = (m, t = "info") => { if (window.showToast) window.showToast(m, t); };
  const haptic = (ms = 8) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* unsupported */ } };
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function localDate(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function dayIndex() {
    const d = new Date();
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  }

  const MOOD_LABEL = ["", "Very low", "Low", "Okay", "Good", "Great"];
  const MOOD_EMOJI = ["", "😞", "😔", "😐", "🙂", "😊"];
  const MOOD_COLOR = { 1: "#f43f5e", 2: "#f97316", 3: "#eab308", 4: "#22c55e", 5: "#6366f1" };

  // ─────────────────────────────────────────────────────────────
  // Tabs
  // ─────────────────────────────────────────────────────────────
  const viewTabs = ["home", "learn"];

  function setTab(name) {
    if (!viewTabs.includes(name)) return;
    document.body.dataset.tab = name;
    document.querySelectorAll("#tab-bar .tab-btn[data-tab]").forEach((b) => {
      const on = b.dataset.tab === name;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  const click = (id) => { const el = $(id); if (el) el.click(); };

  $("tab-home")?.addEventListener("click", () => { haptic(); setTab("home"); });
  $("tab-learn")?.addEventListener("click", () => { haptic(); setTab("learn"); });
  $("tab-checkin")?.addEventListener("click", () => { haptic(12); click("menu-open-checkin-btn"); });
  $("tab-ai")?.addEventListener("click", () => { haptic(); click("menu-open-ai-btn"); });
  $("tab-more")?.addEventListener("click", () => { haptic(); click("menu-btn"); });

  // Anything that filters/shows the resource feed should land on the Learn tab
  $("menu-view-saved-btn")?.addEventListener("click", () => setTab("learn"));

  // Emergency access (header SOS + Home help card) reuses the existing emergency drawer
  const openEmergency = () => { haptic(20); click("emergency-action-btn-main"); };
  $("sos-btn")?.addEventListener("click", openEmergency);
  $("hm-help-btn")?.addEventListener("click", openEmergency);
  $("hm-see-all")?.addEventListener("click", () => { haptic(); setTab("learn"); });
  $("hm-start-btn")?.addEventListener("click", () => { haptic(12); click("tab-checkin"); });

  // ─────────────────────────────────────────────────────────────
  // Greeting / hero
  // ─────────────────────────────────────────────────────────────
  const SUBLINES = [
    "You're in a safe place. Take it one small step at a time.",
    "No judgment here, just support.",
    "Checking in with yourself counts as a win.",
    "Small steps still move you forward.",
    "However today is going, you showed up.",
  ];

  function daypart(h) {
    if (h < 5) return "night";
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    if (h < 21) return "evening";
    return "night";
  }

  function firstName() {
    const user = window.SH_Auth?.getUser?.();
    if (!user) return "";
    const raw = window.SH_Auth?.getProfile?.()?.display_name || (user.email || "").split("@")[0] || "";
    const first = raw.trim().split(/\s+/)[0].slice(0, 20);
    return first.charAt(0).toUpperCase() + first.slice(1);
  }

  function renderHero() {
    const part = daypart(new Date().getHours());
    const name = firstName();
    const hello = {
      morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening",
      night: name ? "Hey" : "Hey, night owl",
    }[part];
    const emoji = { morning: "☀️", afternoon: "🌤️", evening: "🌙", night: "✨" }[part];
    $("hm-hero")?.setAttribute("data-daypart", part);
    if ($("hm-greeting")) $("hm-greeting").textContent = name ? `${hello}, ${name}` : hello;
    if ($("hm-hero-emoji")) $("hm-hero-emoji").textContent = emoji;
    if ($("hm-date")) $("hm-date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    if ($("hm-sub")) $("hm-sub").textContent = SUBLINES[dayIndex() % SUBLINES.length];
  }

  $("hm-hero-emoji")?.addEventListener("click", (e) => {
    haptic(15);
    e.currentTarget.classList.remove("wiggle");
    void e.currentTarget.offsetWidth;
    e.currentTarget.classList.add("wiggle");
  });

  // Easter egg: tap the logo 5 times
  (function () {
    const logo = document.querySelector(".brand-logo");
    if (!logo) return;
    let taps = 0, timer = null;
    logo.style.cursor = "pointer";
    logo.addEventListener("click", () => {
      taps += 1;
      clearTimeout(timer);
      timer = setTimeout(() => { taps = 0; }, 2500);
      if (taps >= 5) {
        taps = 0;
        haptic([20, 40, 20]);
        confetti();
        toast("You found a secret: you're doing great 💜", "success");
      }
    });
  })();

  // ─────────────────────────────────────────────────────────────
  // Mood card: streak, week strip, quick check-in
  // ─────────────────────────────────────────────────────────────
  let todayMood = null;

  function setMoodCardState({ checkedToday, mood, streak, byDate }) {
    todayMood = checkedToday ? mood : null;
    const title = $("hm-mood-title"), note = $("hm-mood-note"), chip = $("hm-streak-chip"), week = $("hm-week");

    document.querySelectorAll("#hm-mood-row .hm-mood").forEach((b) => {
      b.classList.toggle("picked", checkedToday && Number(b.dataset.mood) === mood);
    });
    if (title) title.textContent = checkedToday ? "Checked in today 🎉" : "How are you feeling today?";
    if (note) {
      note.textContent = checkedToday
        ? `Feeling ${MOOD_LABEL[mood].toLowerCase()}. Tap to review or edit your check-in.`
        : byDate
          ? "Tap a face to start a quick, private check-in."
          : "Tap a face to get started. You'll sign in so your check-ins stay private.";
    }
    if (chip) {
      if (streak >= 1) { chip.hidden = false; chip.textContent = `🔥 ${streak}-day streak`; } else chip.hidden = true;
    }
    if (week) {
      if (!byDate) { week.hidden = true; week.innerHTML = ""; }
      else {
        const days = [];
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
        week.hidden = false;
        week.innerHTML = days.map((d, i) => {
          const key = localDate(d), m = byDate[key];
          const letter = d.toLocaleDateString(undefined, { weekday: "narrow" });
          const isToday = i === 6;
          return `<div class="hm-day"><div class="hm-dot ${m ? "done" : ""} ${isToday ? "today" : ""}"
                    style="${m ? `background:${MOOD_COLOR[m]};animation-delay:${i * 60}ms` : ""}"
                    title="${esc(key)}">${m ? MOOD_EMOJI[m] : ""}</div><span>${esc(letter)}</span></div>`;
        }).join("");
      }
    }
    // Gentle nudge dot on the center tab (no guilt framing: it simply disappears once done)
    $("tab-checkin")?.classList.toggle("has-dot", !!byDate && !checkedToday);
  }

  async function loadMoodData() {
    const db = window.supabaseClient;
    const user = window.SH_Auth?.getUser?.();
    if (!db || !user) { setMoodCardState({ checkedToday: false, mood: null, streak: 0, byDate: null }); return; }

    const { data, error } = await db
      .from("checkins")
      .select("entry_date, mood")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .limit(60);
    if (error) { console.warn("Home check-in load failed:", error.message); return; }

    const byDate = {};
    (data || []).forEach((r) => { if (r.mood) byDate[r.entry_date] = r.mood; });
    const today = localDate();
    const checkedToday = !!byDate[today];

    // Streak counts back from today, or from yesterday if today isn't done yet (never "loses" mid-day)
    let streak = 0;
    const cursor = new Date();
    if (!checkedToday) cursor.setDate(cursor.getDate() - 1);
    while (byDate[localDate(cursor)]) { streak += 1; cursor.setDate(cursor.getDate() - 1); }

    setMoodCardState({ checkedToday, mood: byDate[today] || null, streak, byDate });
  }

  document.querySelectorAll("#hm-mood-row .hm-mood").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mood = Number(btn.dataset.mood);
      haptic(12);
      document.querySelectorAll("#hm-mood-row .hm-mood").forEach((b) => b.classList.remove("picked"));
      btn.classList.add("picked");
      if (window.SH_Checkin?.preselectMood && todayMood === null) window.SH_Checkin.preselectMood(mood);
      setTimeout(() => click("menu-open-checkin-btn"), reduceMotion ? 0 : 280);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Quick-action tiles
  // ─────────────────────────────────────────────────────────────
  document.querySelectorAll("#hm-tiles .hm-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      haptic();
      const target = tile.dataset.go;
      if (target === "menu-view-saved-btn") setTab("learn");
      click(target);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Did-you-know card
  // ─────────────────────────────────────────────────────────────
  (function () {
    const facts = window.QUICK_FACTS || [];
    const card = $("hm-fact");
    if (!card || facts.length === 0) { if (card) card.hidden = true; return; }
    let idx = dayIndex() % facts.length;

    function show() {
      const f = facts[idx];
      $("hm-fact-q").textContent = f.fact;
      $("hm-fact-a").textContent = f.detail;
    }
    function setOpen(open) {
      card.classList.toggle("open", open);
      card.setAttribute("aria-expanded", String(open));
      $("hm-fact-hint").textContent = open ? "Tap to close" : "Tap to read more";
    }
    card.addEventListener("click", () => { haptic(); setOpen(!card.classList.contains("open")); });
    card.addEventListener("keydown", (e) => {
      if (e.target !== card) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!card.classList.contains("open")); }
    });
    $("hm-fact-next")?.addEventListener("click", (e) => {
      e.stopPropagation();
      haptic();
      idx = (idx + 1) % facts.length;
      setOpen(false);
      show();
    });
    show();
  })();

  // ─────────────────────────────────────────────────────────────
  // Daily intention
  // ─────────────────────────────────────────────────────────────
  (function () {
    const lines = [
      "Today I can do one small thing that's good for me.",
      "It's okay to ask for help. That takes strength.",
      "I don't have to have it all figured out today.",
      "My feelings are valid, and they don't last forever.",
      "Progress isn't a straight line, and that's okay.",
      "I can say no to things that don't feel right for me.",
      "Being kind to myself is part of the plan.",
      "I'm allowed to take breaks and rest.",
      "Reaching out to someone I trust is a good move.",
      "One breath at a time is enough right now.",
      "I'm learning what helps me, and that's real progress.",
      "Today I'll check in with how I really feel.",
      "I get to choose what's good for my future self.",
      "Small wins count. I'll notice one today.",
    ];
    const el = $("hm-intent-text");
    if (!el) return;
    let idx = dayIndex() % lines.length;
    el.textContent = lines[idx];
    $("hm-intent-next")?.addEventListener("click", () => {
      haptic();
      let next;
      do { next = Math.floor(Math.random() * lines.length); } while (next === idx);
      idx = next;
      el.classList.add("fade");
      setTimeout(() => { el.textContent = lines[idx]; el.classList.remove("fade"); }, reduceMotion ? 0 : 220);
    });
  })();

  // ─────────────────────────────────────────────────────────────
  // Featured resources (from data.js)
  // ─────────────────────────────────────────────────────────────
  (function () {
    const box = $("hm-resources");
    const all = window.RESOURCES_DATA || [];
    if (!box || all.length === 0) return;
    const picks = ["res-4", "res-3", "res-6", "res-9", "res-13"]
      .map((id) => all.find((r) => r.id === id)).filter(Boolean)
      .filter((r) => /^https?:\/\//.test(r.url));
    box.innerHTML = picks.map((r) => `
      <a class="hm-rcard" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">
        <span class="hm-rorg">${esc(r.org)}</span>
        <span class="hm-rtitle">${esc(r.title)}</span>
        <span class="hm-rdesc">${esc(r.description)}</span>
      </a>`).join("");
  })();

  // ─────────────────────────────────────────────────────────────
  // Install-as-app hint
  // ─────────────────────────────────────────────────────────────
  (function () {
    const card = $("hm-install");
    if (!card) return;
    const standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone;
    let dismissed = false;
    try { dismissed = localStorage.getItem("sh_install_dismissed") === "1"; } catch (e) { /* private mode */ }
    if (standalone || dismissed) return;

    let deferred = null;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferred = e;
      $("hm-install-btn").hidden = false;
      card.hidden = false;
    });
    if (isIOS) {
      $("hm-install-text").textContent = "Tap the Share button in Safari, then “Add to Home Screen” for the full-screen app.";
      card.hidden = false;
    }
    $("hm-install-btn")?.addEventListener("click", async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      deferred = null;
      card.hidden = true;
    });
    $("hm-install-dismiss")?.addEventListener("click", () => {
      card.hidden = true;
      try { localStorage.setItem("sh_install_dismissed", "1"); } catch (e) { /* ignore */ }
    });
  })();

  // ─────────────────────────────────────────────────────────────
  // Breathing exercise
  // ─────────────────────────────────────────────────────────────
  const PATTERNS = {
    box:  { label: "Box 4-4-4-4", cycles: 4, steps: [["Breathe in", 4, 1.25], ["Hold", 4, 1.25], ["Breathe out", 4, 0.7], ["Hold", 4, 0.7]] },
    calm: { label: "Calm 4-7-8",  cycles: 3, steps: [["Breathe in", 4, 1.25], ["Hold", 7, 1.25], ["Breathe out", 8, 0.7]] },
  };

  let breathEl = null;
  let breathRun = null;
  let lastFocus = null;

  function openBreath() {
    haptic(15);
    lastFocus = document.activeElement;
    if (breathEl) return;

    breathEl = document.createElement("div");
    breathEl.className = "breath-overlay";
    breathEl.setAttribute("role", "dialog");
    breathEl.setAttribute("aria-modal", "true");
    breathEl.setAttribute("aria-label", "Guided breathing exercise");
    breathEl.innerHTML = `
      <button class="breath-close" aria-label="Close breathing exercise">✕</button>
      <div class="breath-modes" role="group" aria-label="Breathing pattern">
        <button class="breath-mode active" data-mode="box">Box 4-4-4-4</button>
        <button class="breath-mode" data-mode="calm">Calm 4-7-8</button>
      </div>
      <div class="breath-stage"><div class="breath-ring"></div><div class="breath-circle" id="breath-circle"></div></div>
      <div>
        <div class="breath-phase" id="breath-phase" aria-live="polite">Ready?</div>
        <div class="breath-sub" id="breath-sub">Find a comfortable position and relax your shoulders.</div>
      </div>
      <div class="breath-actions" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
        <button class="breath-start" id="breath-start">Start</button>
        <button class="breath-mode" id="breath-checkin" style="display:none;padding:12px 22px;">Check in</button>
      </div>`;
    document.body.appendChild(breathEl);
    requestAnimationFrame(() => breathEl && breathEl.classList.add("show"));

    let mode = "box";
    breathEl.querySelector(".breath-close").addEventListener("click", closeBreath);
    breathEl.querySelectorAll(".breath-mode[data-mode]").forEach((b) => b.addEventListener("click", () => {
      if (breathRun) return;
      mode = b.dataset.mode;
      breathEl.querySelectorAll(".breath-mode[data-mode]").forEach((x) => x.classList.toggle("active", x === b));
    }));
    $("breath-start").addEventListener("click", () => startBreath(mode));
    $("breath-checkin").addEventListener("click", () => { closeBreath(); setTimeout(() => click("menu-open-checkin-btn"), 250); });
    breathEl.querySelector(".breath-close").focus();
  }

  function closeBreath() {
    if (!breathEl) return;
    if (breathRun) breathRun.cancelled = true;
    breathRun = null;
    const el = breathEl;
    breathEl = null;
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && breathEl) closeBreath(); });

  async function startBreath(mode) {
    const pattern = PATTERNS[mode];
    const run = { cancelled: false };
    breathRun = run;
    const circle = $("breath-circle"), phase = $("breath-phase"), sub = $("breath-sub"), startBtn = $("breath-start");
    startBtn.style.display = "none";
    $("breath-checkin").style.display = "none";

    for (let c = 1; c <= pattern.cycles; c++) {
      for (const [label, secs, scale] of pattern.steps) {
        if (run.cancelled) return;
        phase.textContent = label;
        haptic(15);
        circle.style.transition = `transform ${secs}s ease-in-out`;
        circle.style.transform = `scale(${scale})`;
        for (let s = secs; s >= 1; s--) {
          if (run.cancelled) return;
          sub.textContent = `${s}  ·  round ${c} of ${pattern.cycles}`;
          await sleep(1000);
        }
      }
    }
    if (run.cancelled) return;
    breathRun = null;
    circle.style.transition = "transform 1.2s ease-in-out";
    circle.style.transform = "scale(.7)";
    phase.textContent = "Nice work 💜";
    sub.textContent = "Notice how you feel right now. Want to log it?";
    startBtn.textContent = "Go again";
    startBtn.style.display = "";
    $("breath-checkin").style.display = "";
    haptic([20, 40, 20]);
    confetti({ count: 60 });
  }

  $("hm-breath-cta")?.addEventListener("click", openBreath);

  // ─────────────────────────────────────────────────────────────
  // Confetti
  // ─────────────────────────────────────────────────────────────
  function confetti(opts = {}) {
    if (reduceMotion) return;
    const count = opts.count || 130;
    let canvas = $("confetti-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "confetti-canvas";
      canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
    }
    const dpr = window.devicePixelRatio || 1;
    const W = (canvas.width = window.innerWidth * dpr);
    const H = (canvas.height = window.innerHeight * dpr);
    const ctx = canvas.getContext("2d");
    const colors = ["#14b8a6", "#6366f1", "#f59e0b", "#f43f5e", "#22c55e", "#a78bfa"];
    const parts = Array.from({ length: count }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.62,
      vx: (Math.random() - 0.5) * 16 * dpr,
      vy: (-Math.random() * 15 - 7) * dpr,
      s: (Math.random() * 6 + 4) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const start = performance.now();
    (function frame(now) {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.38 * dpr; p.vx *= 0.99;
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 2600);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (t < 2600) requestAnimationFrame(frame); else canvas.remove();
    })(start);
  }

  // ─────────────────────────────────────────────────────────────
  // Scroll-in animation for Home cards (only added when supported, so nothing can stay hidden)
  // ─────────────────────────────────────────────────────────────
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll("#home-view > *").forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = `${Math.min(i, 6) * 50}ms`;
      io.observe(el);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Wiring to the rest of the app
  // ─────────────────────────────────────────────────────────────
  window.addEventListener("safeharbor:authchange", () => { renderHero(); loadMoodData(); });
  window.addEventListener("safeharbor:checkinsaved", () => {
    confetti();
    haptic([15, 30, 15]);
    loadMoodData();
  });

  renderHero();
  loadMoodData();

  window.SH_Home = { setTab, confetti, refresh: () => { renderHero(); loadMoodData(); } };
});

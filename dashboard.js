// dashboard.js — Personal Progress Dashboard Module
// Requires: supabase.js, auth.js
// Displays real check-in data, mood/stress trends, goals summary.
// All data is private to the current user.

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const db = window.supabaseClient;

  // ── DOM refs ────────────────────────────────────────────────────
  const dashAuthWall   = document.getElementById("dashboard-auth-wall");
  const dashContent    = document.getElementById("dashboard-content");
  const dashLoading    = document.getElementById("dashboard-loading");

  // Stat elements
  const statTotalCheckins  = document.getElementById("stat-total-checkins");
  const statAvgMood        = document.getElementById("stat-avg-mood");
  const statAvgStress      = document.getElementById("stat-avg-stress");
  const statGoalsMet       = document.getElementById("stat-goals-met");
  const moodChartEl        = document.getElementById("mood-chart-svg");
  const stressChartEl      = document.getElementById("stress-chart-svg");
  const dashCopingList     = document.getElementById("dash-coping-list");
  const dashGoalsList      = document.getElementById("dash-goals-list");
  const dashWeekReflection = document.getElementById("dash-week-reflection");
  const dashRecentCheckins = document.getElementById("dash-recent-checkins");

  function esc(v) {
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  // ── Auth wall ────────────────────────────────────────────────────
  function showAuthWall() {
    if (dashAuthWall) dashAuthWall.style.display = "flex";
    if (dashContent)  dashContent.style.display  = "none";
  }

  function hideAuthWall() {
    if (dashAuthWall) dashAuthWall.style.display = "none";
    if (dashContent)  dashContent.style.display  = "flex";
  }

  function showLoading(show) {
    if (dashLoading) dashLoading.style.display = show ? "flex" : "none";
    if (dashContent && !show) dashContent.style.opacity = "1";
    if (dashContent && show)  dashContent.style.opacity = "0.3";
  }

  // ── Drawer open ──────────────────────────────────────────────────
  window.addEventListener("safeharbor:opendashboard", () => {
    const user = window.SH_Auth?.getUser();
    if (!user || !db) { showAuthWall(); return; }
    hideAuthWall();
    loadDashboard();
  });

  window.addEventListener("safeharbor:authchange", ({ detail }) => {
    const dashDrawer = document.getElementById("dashboard-drawer");
    if (dashDrawer && dashDrawer.style.display !== "none") {
      if (detail.user) { hideAuthWall(); loadDashboard(); }
      else showAuthWall();
    }
  });

  // ── Main loader ──────────────────────────────────────────────────
  async function loadDashboard() {
    const user = window.SH_Auth?.getUser();
    if (!user || !db) return;

    showLoading(true);

    const [checkinsResult, goalsResult] = await Promise.all([
      db.from("checkins")
        .select("entry_date, mood, stress, coping_strategy, reflection, support_felt")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .limit(30),
      db.from("personal_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    showLoading(false);

    const checkins = checkinsResult.data || [];
    const goals    = goalsResult.data || [];

    renderStats(checkins, goals);
    renderMoodChart(checkins);
    renderStressChart(checkins);
    renderCopingList(checkins);
    renderGoalsList(goals);
    renderWeekReflection(checkins);
    renderRecentCheckins(checkins);
  }

  // ── Stats ────────────────────────────────────────────────────────
  function renderStats(checkins, goals) {
    if (statTotalCheckins) statTotalCheckins.textContent = checkins.length;

    if (checkins.length > 0) {
      const moodVals   = checkins.filter((c) => c.mood).map((c) => c.mood);
      const stressVals = checkins.filter((c) => c.stress).map((c) => c.stress);
      const avgMood    = moodVals.length ? (moodVals.reduce((a, b) => a + b, 0) / moodVals.length).toFixed(1) : "—";
      const avgStress  = stressVals.length ? (stressVals.reduce((a, b) => a + b, 0) / stressVals.length).toFixed(1) : "—";
      if (statAvgMood)   statAvgMood.textContent   = avgMood;
      if (statAvgStress) statAvgStress.textContent = avgStress;
    } else {
      if (statAvgMood)   statAvgMood.textContent   = "—";
      if (statAvgStress) statAvgStress.textContent = "—";
    }

    const metGoals = goals.filter((g) => g.status === "met").length;
    if (statGoalsMet) statGoalsMet.textContent = `${metGoals} / ${goals.length}`;
  }

  // ── SVG Chart Helper ─────────────────────────────────────────────
  function buildBarChart(values, colors, labels) {
    if (!values || values.length === 0) {
      return `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-size="11">Not enough data yet</text>`;
    }

    const W = 280, H = 90, padX = 24, padY = 8;
    const maxVal = 5;
    const barW = Math.max(8, (W - padX * 2) / values.length - 4);
    const chartH = H - padY * 2;

    let bars = "";
    values.forEach((v, i) => {
      const x = padX + i * ((W - padX * 2) / values.length);
      const barH = v ? (v / maxVal) * chartH : 2;
      const y = padY + chartH - barH;
      const color = colors[i] || "#6366f1";
      bars += `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${barH.toFixed(1)}"
              rx="3" fill="${color}" opacity="0.85"/>
        ${labels && labels[i] ? `<text x="${(x + barW / 2).toFixed(1)}" y="${(H - 2).toFixed(1)}"
              text-anchor="middle" fill="#64748b" font-size="8">${labels[i]}</text>` : ""}
        ${v ? `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 3).toFixed(1)}"
              text-anchor="middle" fill="#94a3b8" font-size="9">${v}</text>` : ""}
      `;
    });

    return bars;
  }

  function getMoodColor(val) {
    const colors = { 1: "#f43f5e", 2: "#f97316", 3: "#eab308", 4: "#22c55e", 5: "#6366f1" };
    return colors[val] || "#6366f1";
  }

  function getStressColor(val) {
    const colors = { 1: "#6366f1", 2: "#22c55e", 3: "#eab308", 4: "#f97316", 5: "#f43f5e" };
    return colors[val] || "#6366f1";
  }

  // ── Mood Chart (last 7 days) ──────────────────────────────────────
  function renderMoodChart(checkins) {
    if (!moodChartEl) return;

    const last7 = getLast7Days();
    const byDate = Object.fromEntries(checkins.map((c) => [c.entry_date, c]));

    const values = last7.map((d) => byDate[d]?.mood || 0);
    const colors = values.map((v) => getMoodColor(v));
    const labels = last7.map((d) => {
      const dt = new Date(d + "T12:00:00");
      return dt.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
    });

    moodChartEl.innerHTML = buildBarChart(values, colors, labels);
  }

  // ── Stress Chart (last 7 days) ────────────────────────────────────
  function renderStressChart(checkins) {
    if (!stressChartEl) return;

    const last7 = getLast7Days();
    const byDate = Object.fromEntries(checkins.map((c) => [c.entry_date, c]));

    const values = last7.map((d) => byDate[d]?.stress || 0);
    const colors = values.map((v) => getStressColor(v));
    const labels = last7.map((d) => {
      const dt = new Date(d + "T12:00:00");
      return dt.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
    });

    stressChartEl.innerHTML = buildBarChart(values, colors, labels);
  }

  // ── Last 7 days array ────────────────────────────────────────────
  function getLast7Days() {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return result;
  }

  // ── Coping strategies ────────────────────────────────────────────
  function renderCopingList(checkins) {
    if (!dashCopingList) return;

    const strategies = checkins
      .map((c) => c.coping_strategy)
      .filter(Boolean)
      .slice(0, 5);

    if (strategies.length === 0) {
      dashCopingList.innerHTML = `<p class="empty-list-text">Share what helped you cope in your next check-in.</p>`;
      return;
    }

    dashCopingList.innerHTML = strategies.map((s) => `
      <div class="dash-coping-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>${esc(s)}</span>
      </div>
    `).join("");
  }

  // ── Goals summary ────────────────────────────────────────────────
  function renderGoalsList(goals) {
    if (!dashGoalsList) return;

    if (goals.length === 0) {
      dashGoalsList.innerHTML = `<p class="empty-list-text">No goals set yet. Add one from Goals & Analytics.</p>`;
      return;
    }

    const statusIcon = { active: "🎯", met: "✅", unmet: "💪" };
    const statusLabel = { active: "In progress", met: "Accomplished", unmet: "Keep going" };

    dashGoalsList.innerHTML = goals.slice(0, 5).map((g) => `
      <div class="dash-goal-item status-${g.status}">
        <span class="dash-goal-icon">${statusIcon[g.status] || "🎯"}</span>
        <div class="dash-goal-text">
          <span>${esc(g.text)}</span>
          <span class="dash-goal-status">${statusLabel[g.status] || g.status}</span>
        </div>
      </div>
    `).join("");
  }

  // ── Weekly reflection snippet ─────────────────────────────────────
  function renderWeekReflection(checkins) {
    if (!dashWeekReflection) return;

    const reflections = checkins
      .slice(0, 7)
      .map((c) => c.reflection)
      .filter(Boolean);

    if (reflections.length === 0) {
      dashWeekReflection.innerHTML = `<p class="empty-list-text">Add reflections in your check-ins to see them here.</p>`;
      return;
    }

    dashWeekReflection.innerHTML = reflections.slice(0, 3).map((r) => `
      <div class="dash-reflection-snippet">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>"${esc(r.slice(0, 120))}${r.length > 120 ? "…" : ""}"</span>
      </div>
    `).join("");
  }

  // ── Recent check-ins ─────────────────────────────────────────────
  function renderRecentCheckins(checkins) {
    if (!dashRecentCheckins) return;

    if (checkins.length === 0) {
      dashRecentCheckins.innerHTML = `<p class="empty-list-text">Complete your first check-in to see history here.</p>`;
      return;
    }

    const moodEmoji = ["", "😞", "😔", "😐", "🙂", "😊"];
    const stressWord = ["", "Very Low", "Low", "Moderate", "High", "Very High"];

    dashRecentCheckins.innerHTML = checkins.slice(0, 5).map((c) => {
      const d = new Date(c.entry_date + "T12:00:00");
      const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      return `
        <div class="dash-recent-item">
          <div class="dri-date">${label}</div>
          <div class="dri-badges">
            ${c.mood ? `<span class="dri-badge mood">${moodEmoji[c.mood]} Mood ${c.mood}/5</span>` : ""}
            ${c.stress ? `<span class="dri-badge stress">Stress: ${stressWord[c.stress]}</span>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  window.SH_Dashboard = { reload: loadDashboard };
});

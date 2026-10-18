// checkin.js — Daily Wellness Check-in Module
// Requires: supabase.js, auth.js
// Uses local date (not UTC) for "today's entry"

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const db = window.supabaseClient;

  // ── DOM refs ────────────────────────────────────────────────────
  const checkinDrawer    = document.getElementById("checkin-drawer");
  const checkinForm      = document.getElementById("checkin-form");
  const checkinSteps     = document.querySelectorAll(".checkin-step");
  const checkinPrevBtn   = document.getElementById("checkin-prev");
  const checkinNextBtn   = document.getElementById("checkin-next");
  const checkinSubmitBtn = document.getElementById("checkin-submit");
  const checkinStepCount = document.getElementById("checkin-step-count");
  const checkinSuccess   = document.getElementById("checkin-success-state");
  const checkinFormWrap  = document.getElementById("checkin-form-wrap");
  const checkinEditBtn   = document.getElementById("checkin-edit-btn");
  const checkinHistory   = document.getElementById("checkin-history-list");
  const checkinAuthWall  = document.getElementById("checkin-auth-wall");

  // Mood buttons
  const moodBtns  = document.querySelectorAll(".mood-btn");
  const stressBtns = document.querySelectorAll(".stress-btn");

  // ── State ────────────────────────────────────────────────────────
  let currentStep   = 1;
  const TOTAL_STEPS = 4;
  let todayEntry    = null;
  let editMode      = false;

  const formData = {
    mood: null,
    stress: null,
    support_felt: null,
    difficult_day: null,
    difficult_day_note: "",
    coping_strategy: "",
    reflection: "",
  };

  // ── Helpers ──────────────────────────────────────────────────────
  function esc(v) {
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function getLocalDateString() {
    const d = new Date();
    // YYYY-MM-DD in local time zone
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDisplayDate(dateStr) {
    const d = new Date(dateStr + "T12:00:00"); // avoid tz shift
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }

  function moodLabel(n) {
    return ["", "Very Low", "Low", "Okay", "Good", "Great"][n] || "—";
  }

  function stressLabel(n) {
    return ["", "Very Low", "Low", "Moderate", "High", "Very High"][n] || "—";
  }

  // ── Auth wall ────────────────────────────────────────────────────
  function showAuthWall() {
    if (checkinAuthWall) checkinAuthWall.style.display = "flex";
    if (checkinFormWrap) checkinFormWrap.style.display = "none";
    if (checkinSuccess) checkinSuccess.style.display = "none";
  }

  function hideAuthWall() {
    if (checkinAuthWall) checkinAuthWall.style.display = "none";
  }

  // ── Drawer open handler ──────────────────────────────────────────
  window.addEventListener("safeharbor:opencheckin", () => {
    const user = window.SH_Auth?.getUser();
    if (!user || !db) {
      showAuthWall();
      return;
    }
    hideAuthWall();
    loadCheckin();
  });

  // Re-check when auth changes
  window.addEventListener("safeharbor:authchange", ({ detail }) => {
    if (checkinDrawer && checkinDrawer.style.display !== "none") {
      if (detail.user) { hideAuthWall(); loadCheckin(); }
      else showAuthWall();
    }
  });

  // ── Step navigation ──────────────────────────────────────────────
  function goToStep(n) {
    currentStep = Math.max(1, Math.min(TOTAL_STEPS, n));
    checkinSteps.forEach((el) => {
      el.style.display = el.dataset.step == currentStep ? "flex" : "none";
    });
    if (checkinStepCount) {
      checkinStepCount.textContent = `Step ${currentStep} of ${TOTAL_STEPS}`;
    }
    if (checkinPrevBtn) checkinPrevBtn.disabled = currentStep === 1;
    if (checkinNextBtn) checkinNextBtn.style.display = currentStep < TOTAL_STEPS ? "flex" : "none";
    if (checkinSubmitBtn) checkinSubmitBtn.style.display = currentStep === TOTAL_STEPS ? "flex" : "none";
  }

  if (checkinPrevBtn) checkinPrevBtn.addEventListener("click", () => goToStep(currentStep - 1));
  if (checkinNextBtn) checkinNextBtn.addEventListener("click", () => {
    if (currentStep === 1 && !formData.mood) {
      if (window.showToast) window.showToast("Please choose how you're feeling today.", "info");
      return;
    }
    if (currentStep === 2 && !formData.stress) {
      if (window.showToast) window.showToast("Please rate your stress level.", "info");
      return;
    }
    goToStep(currentStep + 1);
  });

  // ── Mood selection ───────────────────────────────────────────────
  moodBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      moodBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      formData.mood = parseInt(btn.dataset.value, 10);
    });
  });

  // ── Stress selection ─────────────────────────────────────────────
  stressBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      stressBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      formData.stress = parseInt(btn.dataset.value, 10);
    });
  });

  // ── Optional question inputs ─────────────────────────────────────
  const supportBtns = document.querySelectorAll(".support-btn");
  supportBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      supportBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      formData.support_felt = btn.dataset.value === "yes";
    });
  });

  const difficultBtns = document.querySelectorAll(".difficult-btn");
  const difficultNote = document.getElementById("checkin-difficult-note");
  difficultBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      difficultBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      formData.difficult_day = btn.dataset.value === "yes";
      if (difficultNote)
        difficultNote.style.display = formData.difficult_day ? "block" : "none";
    });
  });

  if (difficultNote) {
    difficultNote.addEventListener("input", () => {
      formData.difficult_day_note = difficultNote.value;
    });
  }

  const copingInput = document.getElementById("checkin-coping");
  if (copingInput) {
    copingInput.addEventListener("input", () => {
      formData.coping_strategy = copingInput.value;
    });
  }

  const reflectionInput = document.getElementById("checkin-reflection");
  if (reflectionInput) {
    reflectionInput.addEventListener("input", () => {
      formData.reflection = reflectionInput.value;
    });
  }

  // Skip buttons
  document.querySelectorAll(".checkin-skip-btn").forEach((btn) => {
    btn.addEventListener("click", () => goToStep(currentStep + 1));
  });

  // ── Submit ───────────────────────────────────────────────────────
  if (checkinSubmitBtn) {
    checkinSubmitBtn.addEventListener("click", async () => {
      const user = window.SH_Auth?.getUser();
      if (!user || !db) return;

      checkinSubmitBtn.disabled = true;
      checkinSubmitBtn.textContent = "Saving…";

      const payload = {
        user_id:           user.id,
        entry_date:        getLocalDateString(),
        mood:              formData.mood,
        stress:            formData.stress,
        support_felt:      formData.support_felt,
        difficult_day:     formData.difficult_day,
        difficult_day_note: formData.difficult_day_note || null,
        coping_strategy:   formData.coping_strategy || null,
        reflection:        formData.reflection || null,
        updated_at:        new Date().toISOString(),
      };

      const { data, error } = await db
        .from("checkins")
        .upsert(payload, { onConflict: "user_id,entry_date" })
        .select()
        .single();

      checkinSubmitBtn.disabled = false;
      checkinSubmitBtn.textContent = "Save Check-in";

      if (error) {
        if (window.showToast) window.showToast("Couldn't save. Please try again.", "error");
        console.error("Check-in save error:", error);
        return;
      }

      todayEntry = data;
      showSuccessState();
      loadHistory();
      if (window.showToast) window.showToast("Check-in saved! Great job showing up.", "success");
    });
  }

  // ── Edit today's entry ───────────────────────────────────────────
  if (checkinEditBtn) {
    checkinEditBtn.addEventListener("click", () => {
      editMode = true;
      populateFormFromEntry(todayEntry);
      showFormState();
      goToStep(1);
    });
  }

  function populateFormFromEntry(entry) {
    if (!entry) return;
    formData.mood             = entry.mood;
    formData.stress           = entry.stress;
    formData.support_felt     = entry.support_felt;
    formData.difficult_day    = entry.difficult_day;
    formData.difficult_day_note = entry.difficult_day_note || "";
    formData.coping_strategy  = entry.coping_strategy || "";
    formData.reflection       = entry.reflection || "";

    // Reset UI selections
    moodBtns.forEach((b) => {
      b.classList.toggle("selected", parseInt(b.dataset.value) === entry.mood);
    });
    stressBtns.forEach((b) => {
      b.classList.toggle("selected", parseInt(b.dataset.value) === entry.stress);
    });
    supportBtns.forEach((b) => {
      b.classList.toggle("selected",
        entry.support_felt !== null && b.dataset.value === (entry.support_felt ? "yes" : "no")
      );
    });
    difficultBtns.forEach((b) => {
      b.classList.toggle("selected",
        entry.difficult_day !== null && b.dataset.value === (entry.difficult_day ? "yes" : "no")
      );
    });
    if (difficultNote) {
      difficultNote.value = entry.difficult_day_note || "";
      difficultNote.style.display = entry.difficult_day ? "block" : "none";
    }
    if (copingInput) copingInput.value = entry.coping_strategy || "";
    if (reflectionInput) reflectionInput.value = entry.reflection || "";
  }

  // ── State transitions ────────────────────────────────────────────
  function showSuccessState() {
    if (checkinFormWrap) checkinFormWrap.style.display = "none";
    if (checkinSuccess) {
      checkinSuccess.style.display = "flex";
      // Populate summary
      const summaryEl = document.getElementById("checkin-success-summary");
      if (summaryEl && todayEntry) {
        summaryEl.innerHTML = `
          <div class="checkin-summary-row">
            <span>Mood</span>
            <span>${moodLabel(todayEntry.mood)}</span>
          </div>
          <div class="checkin-summary-row">
            <span>Stress</span>
            <span>${stressLabel(todayEntry.stress)}</span>
          </div>
          ${todayEntry.coping_strategy ? `<div class="checkin-summary-row"><span>Coping</span><span>${esc(todayEntry.coping_strategy)}</span></div>` : ""}
        `;
      }
    }
  }

  function showFormState() {
    if (checkinSuccess) checkinSuccess.style.display = "none";
    if (checkinFormWrap) checkinFormWrap.style.display = "flex";
    goToStep(1);
  }

  function resetForm() {
    formData.mood = null;
    formData.stress = null;
    formData.support_felt = null;
    formData.difficult_day = null;
    formData.difficult_day_note = "";
    formData.coping_strategy = "";
    formData.reflection = "";

    moodBtns.forEach((b) => b.classList.remove("selected"));
    stressBtns.forEach((b) => b.classList.remove("selected"));
    supportBtns.forEach((b) => b.classList.remove("selected"));
    difficultBtns.forEach((b) => b.classList.remove("selected"));
    if (difficultNote) { difficultNote.value = ""; difficultNote.style.display = "none"; }
    if (copingInput) copingInput.value = "";
    if (reflectionInput) reflectionInput.value = "";
    editMode = false;
  }

  // ── Load today's entry ────────────────────────────────────────────
  async function loadCheckin() {
    const user = window.SH_Auth?.getUser();
    if (!user || !db) return;

    // Update header date
    const dateEl = document.getElementById("checkin-date-label");
    if (dateEl) dateEl.textContent = formatDisplayDate(getLocalDateString());

    const { data, error } = await db
      .from("checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("entry_date", getLocalDateString())
      .maybeSingle();

    if (error) { console.error("Checkin load error:", error); return; }

    todayEntry = data;

    if (todayEntry && !editMode) {
      showSuccessState();
    } else {
      resetForm();
      showFormState();
    }

    loadHistory();
  }

  // ── History ──────────────────────────────────────────────────────
  async function loadHistory() {
    const user = window.SH_Auth?.getUser();
    if (!user || !db || !checkinHistory) return;

    const { data } = await db
      .from("checkins")
      .select("entry_date, mood, stress, coping_strategy")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .limit(7);

    if (!data || data.length === 0) {
      checkinHistory.innerHTML = `<p class="empty-list-text">No previous check-ins yet.</p>`;
      return;
    }

    const moodEmojis = ["", "😞", "😔", "😐", "🙂", "😊"];
    checkinHistory.innerHTML = data.map((row) => `
      <div class="checkin-history-item">
        <div class="chi-date">${formatDisplayDate(row.entry_date)}</div>
        <div class="chi-stats">
          <span class="chi-badge mood">${moodEmojis[row.mood] || "—"} ${moodLabel(row.mood)}</span>
          <span class="chi-badge stress">Stress: ${stressLabel(row.stress)}</span>
        </div>
        ${row.coping_strategy ? `<div class="chi-coping">"${esc(row.coping_strategy)}"</div>` : ""}
      </div>
    `).join("");
  }

  // Expose for external triggers (e.g., dashboard)
  window.SH_Checkin = { reload: loadCheckin };
});

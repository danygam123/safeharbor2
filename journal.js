// journal.js — Private Journal Module
// Requires: supabase.js, auth.js
// Entries are private: never shared, never sent to AI without consent

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const db = window.supabaseClient;

  // ── DOM refs ────────────────────────────────────────────────────
  const journalAuthWall   = document.getElementById("journal-auth-wall");
  const journalContent    = document.getElementById("journal-content");
  const journalListView   = document.getElementById("journal-list-view");
  const journalEditorView = document.getElementById("journal-editor-view");
  const journalEntriesList = document.getElementById("journal-entries-list");
  const newEntryBtn       = document.getElementById("journal-new-btn");
  const editorTitle       = document.getElementById("journal-editor-title");
  const editorContent     = document.getElementById("journal-editor-content");
  const editorPromptSel   = document.getElementById("journal-prompt-select");
  const editorSaveBtn     = document.getElementById("journal-save-btn");
  const editorDeleteBtn   = document.getElementById("journal-delete-btn");
  const editorCancelBtn   = document.getElementById("journal-cancel-btn");
  const editorStatus      = document.getElementById("journal-editor-status");
  const editorDateLabel   = document.getElementById("journal-editor-date");
  const editorCharCount   = document.getElementById("journal-char-count");

  // ── State ────────────────────────────────────────────────────────
  let entries = [];
  let editingId = null;
  let autosaveTimer = null;
  let isDirty = false;

  // ── Reflection prompts ────────────────────────────────────────────
  const PROMPTS = [
    { value: "", label: "Free write (no prompt)" },
    { value: "What went well for me today?", label: "What went well today?" },
    { value: "What was challenging, and how did I handle it?", label: "What was challenging?" },
    { value: "What helped me feel better when things got hard?", label: "What helped me cope?" },
    { value: "Is there something I'm proud of recently?", label: "What am I proud of?" },
    { value: "What do I need right now that I haven't given myself?", label: "What do I need?" },
    { value: "If I could tell my past self one thing about today, what would it be?", label: "Letter to past self" },
    { value: "Who or what am I grateful for right now?", label: "Gratitude" },
    { value: "What's one small step I could take to feel better tomorrow?", label: "Tomorrow's small step" },
  ];

  function esc(v) {
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function getLocalDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  // ── Auth wall ────────────────────────────────────────────────────
  function showAuthWall() {
    if (journalAuthWall) journalAuthWall.style.display = "flex";
    if (journalContent) journalContent.style.display = "none";
  }

  function hideAuthWall() {
    if (journalAuthWall) journalAuthWall.style.display = "none";
    if (journalContent) journalContent.style.display = "flex";
  }

  // ── Drawer open ──────────────────────────────────────────────────
  window.addEventListener("safeharbor:openjournal", () => {
    const user = window.SH_Auth?.getUser();
    if (!user || !db) { showAuthWall(); return; }
    hideAuthWall();
    loadEntries();
    showListView();
  });

  window.addEventListener("safeharbor:authchange", ({ detail }) => {
    const journalDrawer = document.getElementById("journal-drawer");
    if (journalDrawer && journalDrawer.style.display !== "none") {
      if (detail.user) { hideAuthWall(); loadEntries(); }
      else { showAuthWall(); }
    }
  });

  // ── Views ────────────────────────────────────────────────────────
  function showListView() {
    if (journalListView) journalListView.style.display = "flex";
    if (journalEditorView) journalEditorView.style.display = "none";
  }

  function showEditorView() {
    if (journalListView) journalListView.style.display = "none";
    if (journalEditorView) journalEditorView.style.display = "flex";
  }

  // ── Load entries ─────────────────────────────────────────────────
  async function loadEntries() {
    const user = window.SH_Auth?.getUser();
    if (!user || !db) return;

    const { data, error } = await db
      .from("journal_entries")
      .select("id, title, content, prompt_used, entry_date, created_at")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) { console.error("Journal load error:", error); return; }
    entries = data || [];
    renderList();
  }

  // ── Render list ──────────────────────────────────────────────────
  function renderList() {
    if (!journalEntriesList) return;

    if (entries.length === 0) {
      journalEntriesList.innerHTML = `
        <div class="journal-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p>Your journal is empty.</p>
          <p style="font-size:0.78rem; color:var(--text-muted);">Tap "New Entry" to start writing.</p>
        </div>
      `;
      return;
    }

    // Group by month
    const grouped = {};
    entries.forEach((e) => {
      const d = new Date(e.entry_date + "T12:00:00");
      const key = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });

    journalEntriesList.innerHTML = Object.entries(grouped).map(([month, items]) => `
      <div class="journal-month-group">
        <div class="journal-month-label">${month}</div>
        ${items.map((e) => `
          <div class="journal-entry-card" data-id="${e.id}" role="button" tabindex="0"
               aria-label="Open journal entry: ${esc(e.title || "Untitled")}">
            <div class="jec-header">
              <div class="jec-title">${e.title ? esc(e.title) : "<em>Untitled</em>"}</div>
              <div class="jec-date">${formatDate(e.entry_date)}</div>
            </div>
            <div class="jec-preview">${esc(e.content.slice(0, 100))}${e.content.length > 100 ? "…" : ""}</div>
            ${e.prompt_used ? `<div class="jec-prompt-badge">💬 ${esc(e.prompt_used.slice(0, 50))}…</div>` : ""}
          </div>
        `).join("")}
      </div>
    `).join("");

    // Click to edit
    journalEntriesList.querySelectorAll(".journal-entry-card").forEach((card) => {
      const handler = () => openEditor(card.dataset.id);
      card.addEventListener("click", handler);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") handler(); });
    });
  }

  // ── Editor ───────────────────────────────────────────────────────
  function openEditor(entryId = null) {
    editingId = entryId;
    isDirty = false;

    // Populate prompts
    if (editorPromptSel) {
      editorPromptSel.innerHTML = PROMPTS.map(
        (p) => `<option value="${p.value}">${p.label}</option>`
      ).join("");
      editorPromptSel.onchange = () => {
        const prompt = editorPromptSel.value;
        if (prompt && !editorContent.value.trim()) {
          editorContent.placeholder = prompt;
        }
      };
    }

    if (entryId) {
      // Edit existing
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      if (editorTitle) editorTitle.value = entry.title || "";
      if (editorContent) editorContent.value = entry.content;
      if (editorPromptSel && entry.prompt_used) {
        const opt = Array.from(editorPromptSel.options).find((o) => o.value === entry.prompt_used);
        if (opt) editorPromptSel.value = opt.value;
      }
      if (editorDateLabel) editorDateLabel.textContent = formatDate(entry.entry_date);
      if (editorDeleteBtn) editorDeleteBtn.style.display = "flex";
    } else {
      // New entry
      if (editorTitle) editorTitle.value = "";
      if (editorContent) { editorContent.value = ""; editorContent.placeholder = "Start writing…"; }
      if (editorPromptSel) editorPromptSel.value = "";
      if (editorDateLabel) editorDateLabel.textContent = formatDate(getLocalDateString());
      if (editorDeleteBtn) editorDeleteBtn.style.display = "none";
    }

    updateCharCount();
    setEditorStatus("");
    showEditorView();
    if (editorContent) editorContent.focus();
  }

  function updateCharCount() {
    if (!editorCharCount || !editorContent) return;
    const len = editorContent.value.length;
    editorCharCount.textContent = `${len} character${len !== 1 ? "s" : ""}`;
  }

  function setEditorStatus(msg, type = "info") {
    if (!editorStatus) return;
    editorStatus.textContent = msg;
    editorStatus.className = `journal-editor-status ${type}`;
    editorStatus.style.display = msg ? "block" : "none";
  }

  // ── Autosave ──────────────────────────────────────────────────────
  if (editorContent) {
    editorContent.addEventListener("input", () => {
      isDirty = true;
      updateCharCount();
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        if (isDirty && editingId) saveEntry(true);
      }, 30000); // Autosave after 30s of inactivity (only for existing entries)
    });
  }

  if (editorTitle) {
    editorTitle.addEventListener("input", () => { isDirty = true; });
  }

  // ── Save ─────────────────────────────────────────────────────────
  async function saveEntry(isAutosave = false) {
    const user = window.SH_Auth?.getUser();
    if (!user || !db) return;

    const content = editorContent?.value?.trim();
    if (!content) {
      if (!isAutosave) setEditorStatus("Please write something before saving.", "error");
      return;
    }

    if (!isAutosave) {
      editorSaveBtn.disabled = true;
      editorSaveBtn.textContent = "Saving…";
    }
    setEditorStatus(isAutosave ? "Autosaving…" : "Saving…", "info");

    const payload = {
      user_id:     user.id,
      title:       editorTitle?.value?.trim() || null,
      content:     content,
      prompt_used: editorPromptSel?.value || null,
      entry_date:  getLocalDateString(),
      updated_at:  new Date().toISOString(),
    };

    let error;
    let data;

    if (editingId) {
      ({ data, error } = await db
        .from("journal_entries")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", user.id)
        .select()
        .single());
    } else {
      ({ data, error } = await db
        .from("journal_entries")
        .insert(payload)
        .select()
        .single());
      if (!error && data) editingId = data.id;
    }

    if (error) {
      setEditorStatus("Save failed. Please try again.", "error");
      console.error("Journal save error:", error);
    } else {
      isDirty = false;
      setEditorStatus("Saved ✓", "success");
      if (!isAutosave && window.showToast) window.showToast("Journal entry saved.", "success");
      await loadEntries();
    }

    if (!isAutosave && editorSaveBtn) {
      editorSaveBtn.disabled = false;
      editorSaveBtn.textContent = "Save Entry";
    }
  }

  if (editorSaveBtn) {
    editorSaveBtn.addEventListener("click", () => saveEntry(false));
  }

  // ── Delete ───────────────────────────────────────────────────────
  if (editorDeleteBtn) {
    editorDeleteBtn.addEventListener("click", async () => {
      if (!editingId) return;
      const confirmed = confirm("Delete this journal entry? This cannot be undone.");
      if (!confirmed) return;

      const user = window.SH_Auth?.getUser();
      const { error } = await db
        .from("journal_entries")
        .delete()
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (error) {
        if (window.showToast) window.showToast("Could not delete entry.", "error");
        return;
      }

      editingId = null;
      await loadEntries();
      showListView();
      if (window.showToast) window.showToast("Entry deleted.", "info");
    });
  }

  // ── Cancel / Back ────────────────────────────────────────────────
  if (editorCancelBtn) {
    editorCancelBtn.addEventListener("click", () => {
      if (isDirty) {
        const ok = confirm("You have unsaved changes. Discard them?");
        if (!ok) return;
      }
      clearTimeout(autosaveTimer);
      editingId = null;
      isDirty = false;
      showListView();
    });
  }

  if (newEntryBtn) {
    newEntryBtn.addEventListener("click", () => openEditor(null));
  }

  window.SH_Journal = { reload: loadEntries };
});

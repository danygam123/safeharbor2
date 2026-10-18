// ai.js — AI Educational Companion Module
// Requires: config.js (GEMINI_API_KEY)
// Uses Google Gemini (model set by GEMINI_MODEL in config.js) via REST API
//
// PRIVACY: The companion does NOT automatically receive journal entries
// or check-in data. Only messages the user explicitly types are sent.
// The API key is stored only in config.js (gitignored).

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const cfg = window.SAFEHARBOR_CONFIG || {};
  const GEMINI_KEY = cfg.GEMINI_API_KEY || "";
  // Model is configurable in config.js (GEMINI_MODEL). gemini-1.5-* has been retired.
  const GEMINI_MODEL = cfg.GEMINI_MODEL || "gemini-2.5-flash";
  const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  // ── DOM refs ────────────────────────────────────────────────────
  const aiDrawer        = document.getElementById("ai-drawer");
  const aiMessages      = document.getElementById("ai-messages");
  const aiInput         = document.getElementById("ai-input");
  const aiSendBtn       = document.getElementById("ai-send-btn");
  const aiNewConvoBtn   = document.getElementById("ai-new-convo-btn");
  const aiLoadingEl     = document.getElementById("ai-loading");
  const aiConfigWall    = document.getElementById("ai-config-wall");
  const aiChatArea      = document.getElementById("ai-chat-area");
  const aiCharCount     = document.getElementById("ai-char-count");

  // ── State ────────────────────────────────────────────────────────
  let conversationHistory = []; // { role: "user"|"model", parts: [{ text }] }
  let isWaiting = false;
  const MAX_HISTORY = 20; // Keep last 20 turns for context
  const MAX_CHARS = 1000;

  // ── Safety keywords ──────────────────────────────────────────────
  const CRISIS_PATTERNS = [
    /\boverdos/i, /\bsuicid/i, /\bself.?harm/i, /\bkill myself/i,
    /\bend my life/i, /\bwant to die/i, /\bcut myself/i, /\bhurt myself/i,
    /\bcan't go on/i, /\bno reason to live/i, /\bserious crisis/i,
  ];

  const IMMEDIATE_EMERGENCY = [
    /\bcalling 911\b/i, /\bsomeone is overdosing\b/i, /\bnot breathing\b/i,
    /\bunconscious\b/i, /\bunconsious\b/i, /\bnot responding\b/i, /\bstopped breathing\b/i, /\bcan't breathe\b/i, /\bunresponsive\b/i, /\bblue lips\b/i,
  ];

  // ── System prompt ────────────────────────────────────────────────
  const SYSTEM_INSTRUCTION = `You are SafeHarbor's educational wellness companion — a warm, supportive, and non-judgmental AI assistant helping people learn about substance use prevention, mental wellness, and healthy coping strategies.

YOUR ROLE:
- You are an educational support tool, NOT a therapist, doctor, or emergency service.
- Always make clear you are an AI when directly asked.
- You are especially appropriate for teenagers and young adults.
- Use plain, empathetic, age-appropriate language.

WHAT YOU CAN HELP WITH:
- Explaining risks related to substance use (evidence-based, non-shaming)
- Discussing healthy coping strategies and wellness concepts
- Helping users learn how to respond to peer pressure
- Providing information about how to support a friend
- Pointing to trusted resources (SAMHSA, NIDA, 988, CDC)
- General mental wellness education

TRUSTED RESOURCES TO CITE:
- Emergency (immediate danger): Call 911
- Suicide & Crisis Lifeline: Call or text 988 | https://988lifeline.org
- SAMHSA Helpline (free, confidential): 1-800-662-4357 | https://www.samhsa.gov
- NIDA (drug education): https://nida.nih.gov
- CDC Overdose Prevention: https://www.cdc.gov/overdose-prevention/

SAFETY PROTOCOL — HIGHEST PRIORITY:
If a user expresses immediate danger, suspected overdose, suicidal crisis, or self-harm:
1. Respond with genuine compassion immediately.
2. IMMEDIATELY provide: "If this is a medical emergency or you are in immediate danger, call 911 now. For mental health crisis support, call or text 988."
3. Do NOT delay this guidance with extended conversation.
4. Do NOT attempt to handle an emergency yourself.
5. Clearly distinguish: 911 = immediate medical/physical emergencies, 988 = mental health crisis support.

HARD RULES — NEVER VIOLATE:
- Never recommend illegal drug use or unsafe experimentation.
- Never diagnose addiction, depression, anxiety, or any medical condition.
- Never claim to predict relapse or mental health crises.
- Never claim to monitor users or contact authorities (you cannot).
- Never invent citations, statistics, or emergency contact numbers.
- Never discourage someone from seeking professional help.
- If you don't know something factual, say so and point to a trusted source.

RESPONSE STYLE:
- Be warm, genuine, and concise. Avoid clinical or robotic language.
- When citing health facts, mention the source (e.g., "According to NIDA...").
- End responses with an open question or next step when appropriate.
- Keep responses appropriately brief — this is a mobile-friendly chat interface.`;

  // ── Config wall ──────────────────────────────────────────────────
  function checkConfig() {
    const configured = GEMINI_KEY && GEMINI_KEY !== "YOUR_GEMINI_API_KEY_HERE";
    if (aiConfigWall) aiConfigWall.style.display = configured ? "none" : "flex";
    if (aiChatArea)   aiChatArea.style.display   = configured ? "flex" : "none";
    return configured;
  }

  // ── Drawer open ──────────────────────────────────────────────────
  window.addEventListener("safeharbor:openai", () => {
    if (!checkConfig()) return;
    if (conversationHistory.length === 0) {
      appendMessage("model", getWelcomeMessage());
    }
    scrollToBottom();
  });

  function getWelcomeMessage() {
    return `Hi, I'm SafeHarbor's educational wellness companion 👋

I'm here to help you learn about substance use prevention, explore healthy coping strategies, or just have a supportive conversation.

**A few things to know:**
- I'm an AI, not a therapist or doctor
- Everything you share here is between you and me
- If you're ever in immediate danger, call **911**; for mental health crisis support, call or text **988**

What's on your mind today?`;
  }

  // ── Send message ─────────────────────────────────────────────────
  async function sendMessage() {
    if (isWaiting || !aiInput) return;
    const text = aiInput.value.trim();
    if (!text) return;
    if (text.length > MAX_CHARS) {
      if (window.showToast) window.showToast(`Message too long (max ${MAX_CHARS} characters).`, "info");
      return;
    }
    if (!checkConfig()) return;

    // Safety check — immediate emergency
    const isImmediate = IMMEDIATE_EMERGENCY.some((p) => p.test(text));
    const isCrisis    = CRISIS_PATTERNS.some((p) => p.test(text));

    // Append user message
    appendMessage("user", text);
    aiInput.value = "";
    updateCharCount();
    conversationHistory.push({ role: "user", parts: [{ text }] });

    // Trim history
    if (conversationHistory.length > MAX_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2);
    }

    // If immediate emergency — respond instantly, don't call API
    if (isImmediate) {
      const safetyMsg = `🚨 **This sounds like a medical emergency.**\n\n**Call 911 right now** — don't wait.\n\nStay with the person until paramedics arrive. If an opioid overdose is suspected and Narcan (naloxone) is available, administer it while waiting for help.\n\n988 is for mental health crisis support — for an active medical emergency, 911 is the right call.`;
      appendMessage("model", safetyMsg);
      conversationHistory.push({ role: "model", parts: [{ text: safetyMsg }] });
      scrollToBottom();
      return;
    }

    // Show typing indicator
    setLoading(true);

    try {
      const body = {
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: conversationHistory,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.9,
          ...(GEMINI_MODEL.includes("2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      };

      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Gemini API error:", res.status, errText);
        throw new Error(`API error ${res.status}`);
      }

      const json = await res.json();
      const replyText =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I wasn't able to generate a response. Please try again.";

      setLoading(false);
      const replyBubble = appendMessage("model", replyText);
      conversationHistory.push({ role: "model", parts: [{ text: replyText }] });

      // Add crisis resource reminder if crisis keyword was detected
      if (isCrisis && !replyText.includes("988")) {
        const reminder = `\n\n---\n*Remember: If you're in crisis, call or text **988** anytime, day or night.*`;
        if (replyBubble) replyBubble.innerHTML += renderMarkdown(reminder);
      }

    } catch (err) {
      setLoading(false);
      let msg = "I ran into a problem connecting. Please check your internet connection and try again.";
      if (err.message?.includes("429")) msg = "I'm a little busy right now. Please wait a moment and try again.";
      if (isCrisis) {
        msg += "\n\n**If you're in crisis, call or text 988 any time. If it's a medical emergency, call 911.**";
      }
      appendMessage("model", msg);
      console.error("AI send error:", err);
    }

    scrollToBottom();
  }

  // ── UI helpers ───────────────────────────────────────────────────
  function appendMessage(role, text) {
    if (!aiMessages) return;

    const wrapper = document.createElement("div");
    wrapper.className = `ai-msg-row ${role}`;

    const bubble = document.createElement("div");
    bubble.className = `ai-msg-bubble ${role}`;
    bubble.innerHTML = renderMarkdown(text);

    wrapper.appendChild(bubble);
    aiMessages.appendChild(wrapper);
    scrollToBottom();
    return bubble;
  }

  function renderMarkdown(text) {
    // Simple markdown: bold, line breaks, code, links
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n---\n/g, "<hr/>")
      .replace(/\n/g, "<br/>")
      .replace(/#{1,3} (.+)/g, "<strong>$1</strong>");
  }

  function setLoading(show) {
    isWaiting = show;
    if (aiLoadingEl) aiLoadingEl.style.display = show ? "flex" : "none";
    if (aiSendBtn) aiSendBtn.disabled = show;
    if (aiInput) aiInput.disabled = show;
  }

  function scrollToBottom() {
    if (aiMessages) {
      requestAnimationFrame(() => {
        aiMessages.scrollTop = aiMessages.scrollHeight;
      });
    }
  }

  function updateCharCount() {
    if (!aiCharCount || !aiInput) return;
    const len = aiInput.value.length;
    aiCharCount.textContent = `${len}/${MAX_CHARS}`;
    aiCharCount.style.color = len > MAX_CHARS * 0.9 ? "var(--emergency-color)" : "var(--text-muted)";
  }

  // ── Event listeners ──────────────────────────────────────────────
  if (aiSendBtn) {
    aiSendBtn.addEventListener("click", sendMessage);
  }

  if (aiInput) {
    aiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    aiInput.addEventListener("input", updateCharCount);
  }

  if (aiNewConvoBtn) {
    aiNewConvoBtn.addEventListener("click", () => {
      if (conversationHistory.length > 0) {
        const ok = confirm("Start a new conversation? This will clear your current chat history.");
        if (!ok) return;
      }
      conversationHistory = [];
      if (aiMessages) aiMessages.innerHTML = "";
      appendMessage("model", getWelcomeMessage());
      if (window.showToast) window.showToast("New conversation started.", "info");
    });
  }

  // Initial config check
  if (aiDrawer) {
    checkConfig();
  }

  window.SH_AI = { checkConfig };
});

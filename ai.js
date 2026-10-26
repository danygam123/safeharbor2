// ai.js — AI Educational Companion Module
// Talks to /api/chat (Vercel serverless function) which holds the Gemini key server-side.
// No API key is ever present in the browser.
//
// PRIVACY: The companion does NOT automatically receive journal entries
// or check-in data. Only messages the user explicitly types are sent.
// The API key is stored only in config.js (gitignored).

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const CHAT_ENDPOINT = "/api/chat";

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

  // ── Config wall ──────────────────────────────────────────────────
  function checkConfig() {
    // The companion needs the server function, so it only works over http(s) (deployed site / vercel dev)
    const configured = location.protocol === "http:" || location.protocol === "https:";
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
    const buddyName = window.SH_CompanionBuddy?.()?.name || "Harbor";
    return `Hi, I'm ${buddyName}, your SafeHarbor AI companion 👋

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
      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: conversationHistory,
          companion: window.SH_CompanionBuddy?.()?.name || "Harbor",
        }),
      });

      if (!res.ok) {
        let errorMessage = "The AI service is temporarily unavailable. Please try again shortly.";
        try {
          const errorBody = await res.json();
          if (typeof errorBody?.error === "string" && errorBody.error.trim()) {
            errorMessage = errorBody.error.trim();
          }
        } catch (_) {
          // Keep the safe fallback if the server didn't return JSON.
        }
        console.error("Chat API error:", res.status, errorMessage);
        throw new Error(errorMessage);
      }

      let replyText = "";
      let replyBubble = null;
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleEvent = (eventText) => {
          const data = eventText
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data || data === "[DONE]") return;

          let event;
          try {
            event = JSON.parse(data);
          } catch (_) {
            return;
          }
          if (event?.error) {
            throw new Error(event.error.message || "The AI service stopped responding. Please try again.");
          }

          const text = event?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
          if (!text) return;
          replyText += text;
          if (!replyBubble) {
            if (aiLoadingEl) aiLoadingEl.style.display = "none";
            replyBubble = appendMessage("model", "");
          }
          replyBubble.innerHTML = renderMarkdown(replyText);
          scrollToBottom();
        };

        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
          let boundary;
          while ((boundary = buffer.match(/\r?\n\r?\n/))) {
            const index = boundary.index;
            handleEvent(buffer.slice(0, index));
            buffer = buffer.slice(index + boundary[0].length);
          }
          if (done) break;
        }
        if (buffer.trim()) handleEvent(buffer);
      } else {
        // Keep compatibility with older deployments that return one JSON response.
        const json = await res.json();
        replyText = json?.reply || "I'm sorry, I wasn't able to generate a response. Please try again.";
        replyBubble = appendMessage("model", replyText);
      }

      if (!replyText) {
        replyText = "I'm not able to help with that one, but I'm still here for you. If you're in crisis, call or text **988**. If it's a medical emergency, call **911**. You can also ask me about coping strategies or supporting a friend.";
        replyBubble = appendMessage("model", replyText);
      }

      setLoading(false);
      conversationHistory.push({ role: "model", parts: [{ text: replyText }] });

      // Add crisis resource reminder if crisis keyword was detected
      if (isCrisis && !replyText.includes("988")) {
        const reminder = `\n\n---\n*Remember: If you're in crisis, call or text **988** anytime, day or night.*`;
        if (replyBubble) replyBubble.innerHTML += renderMarkdown(reminder);
      }

    } catch (err) {
      setLoading(false);
      let msg = err.name === "TypeError"
        ? "I couldn't reach the chat service. Check your internet connection and try again."
        : (err.message || "The AI service is temporarily unavailable. Please try again shortly.");
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

    if (role === "model") {
      const buddy = window.SH_CompanionBuddy?.();
      if (buddy?.icon) {
        const avatar = document.createElement("span");
        avatar.className = "ai-msg-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = buddy.icon;
        wrapper.appendChild(avatar);
      }
    }

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

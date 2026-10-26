// api/chat.js — Vercel serverless function (Node, CommonJS)
// Keeps the Gemini API key on the server. Set these in Vercel -> Project -> Settings -> Environment Variables:
//   GEMINI_API_KEY   (required)  your key from aistudio.google.com
//   GEMINI_MODEL     (optional)  defaults to gemini-3.5-flash-lite for lower-latency chat.
//   GEMINI_FALLBACK_MODEL (optional) defaults to gemini-3.8-flash for temporary 503 overloads.
//
// Security model: the browser may send ONLY chat messages. The system prompt, safety settings
// and generation settings are fixed here, so this endpoint can't be used as a general-purpose proxy.

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

const COMPANION_NAMES = new Set(["Harbor", "Shelly", "Ember", "Sunny", "Sage"]);

const MAX_TURNS = 40;       // messages kept per request
const MAX_CHARS = 1000;     // per message
const RATE_LIMIT = 20;      // requests per IP per window (best-effort; resets on cold start)
const WINDOW_MS = 60 * 1000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > WINDOW_MS) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  hits.set(ip, rec);
  if (hits.size > 5000) hits.clear();
  return rec.n > RATE_LIMIT;
}

// Accept only well-formed {role: "user"|"model", parts:[{text}]} turns; Gemini needs the first turn to be "user".
function cleanContents(input) {
  if (!Array.isArray(input)) return null;
  const out = [];
  for (const m of input.slice(-MAX_TURNS)) {
    if (!m || (m.role !== "user" && m.role !== "model")) return null;
    const text = m.parts && m.parts[0] && m.parts[0].text;
    if (typeof text !== "string" || !text.trim()) return null;
    out.push({ role: m.role, parts: [{ text: text.slice(0, MAX_CHARS * (m.role === "model" ? 4 : 1)) }] });
  }
  while (out.length && out[0].role !== "user") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Same-origin only (browsers send Origin on POST)
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: "Forbidden" });
    } catch (e) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "AI companion is not configured on the server." });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: "Too many requests. Please wait a moment." });

  const contents = cleanContents(req.body && req.body.contents);
  if (!contents) return res.status(400).json({ error: "Invalid request." });

  // Only accept the app's fixed buddy names. A selected buddy changes the friendly
  // presentation, never the safety or educational boundaries above.
  const requestedCompanion = req.body && req.body.companion;
  const companionName = COMPANION_NAMES.has(requestedCompanion) ? requestedCompanion : "Harbor";
  const systemInstruction = `${SYSTEM_INSTRUCTION}\n\nCOMPANION PRESENTATION:\n- The user's selected friendly companion is ${companionName}. You may introduce yourself by this name and use a warm, approachable voice.\n- This name and icon are a visual personalization only. You are still an AI, not a person, animal, therapist, or medical professional. Be transparent if asked.\n- These presentation preferences never override the safety protocol or hard rules above.`;

  const configuredModel = process.env.GEMINI_MODEL;
  const model = !configuredModel || configuredModel === "gemini-3.8-flash"
    ? "gemini-3.5-flash-lite"
    : configuredModel;
  const configuredFallback = process.env.GEMINI_FALLBACK_MODEL;
  const fallbackModel = configuredFallback && configuredFallback !== model
    ? configuredFallback
    : (model === "gemini-3.5-flash-lite" ? "gemini-3.8-flash" : "gemini-3.5-flash-lite");

  const requestBase = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { maxOutputTokens: 1024 },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  try {
    const requestModel = async (modelName) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:streamGenerateContent?alt=sse`;
      const body = {
        ...requestBase,
        generationConfig: {
          ...requestBase.generationConfig,
          ...(modelName.includes("3.8-flash") ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
        },
      };
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
      });
    };

    let activeModel = model;
    let upstream = await requestModel(activeModel);

    // Gemini can temporarily return 503 when a model is overloaded. Retry once
    // against the alternate model before sending any response headers to the client.
    if (upstream.status === 503 && fallbackModel && fallbackModel !== model) {
      const primaryDetails = (await upstream.text()).slice(0, 300);
      console.warn("Gemini primary model overloaded; trying fallback", model, primaryDetails);
      activeModel = fallbackModel;
      upstream = await requestModel(activeModel);
    }

    if (!upstream.ok) {
      const details = (await upstream.text()).slice(0, 300);
      console.error("Gemini error", activeModel, upstream.status, details);

      // Keep provider internals in server logs, but return a useful, non-sensitive
      // next step to the app so configuration and quota errors aren't mistaken for offline use.
      const safeErrors = {
        400: "Gemini rejected the chat request. Check the configured model and request settings.",
        401: "Gemini rejected the server API key. Check the Production GEMINI_API_KEY in Vercel.",
        403: "Gemini denied access for this API key. Check its Gemini API access and project status.",
        404: "The configured Gemini model was not found. Check GEMINI_MODEL in Vercel.",
        429: "Gemini rate limit or quota reached. Wait a moment or review the project's AI usage limits.",
        503: "Gemini is experiencing high demand right now. Please try again shortly.",
      };
      const status = upstream.status === 429 ? 429 : 502;
      return res.status(status).json({
        error: safeErrors[upstream.status] || "Gemini is temporarily unavailable. Please try again shortly.",
      });
    }

    if (!upstream.body) {
      return res.status(502).json({ error: "Gemini did not return a response stream. Please try again." });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    let streamedAnyText = false;
    try {
      for await (const chunk of upstream.body) {
        streamedAnyText = true;
        if (!res.write(chunk)) {
          await new Promise((resolve) => res.once("drain", resolve));
        }
      }
    } catch (streamError) {
      console.error("Gemini stream error", activeModel, streamError);
      if (!res.destroyed && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: { message: "The reply was interrupted. Please try again." } })}\n\n`);
      }
      return res.end();
    }
    if (!streamedAnyText) {
      res.write(`data: ${JSON.stringify({ error: { message: "Gemini returned an empty response." } })}\n\n`);
    }
    return res.end();
  } catch (err) {
    console.error("chat handler error", err);
    return res.status(502).json({ error: "The AI service is unavailable right now." });
  }
};

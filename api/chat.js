// api/chat.js — Vercel serverless function (Node, CommonJS)
// Keeps the Gemini API key on the server. Set these in Vercel -> Project -> Settings -> Environment Variables:
//   GEMINI_API_KEY   (required)  your key from aistudio.google.com
//   GEMINI_MODEL     (optional)  defaults to gemini-2.5-flash
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

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
      topP: 0.9,
      ...(model.includes("2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      console.error("Gemini error", upstream.status, (await upstream.text()).slice(0, 300));
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: "The AI service is unavailable right now." });
    }

    const json = await upstream.json();
    const reply = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
    if (!reply) {
      // Blocked by safety filters or empty: respond gently and keep crisis resources visible
      return res.status(200).json({
        reply:
          "I'm not able to help with that one, but I'm still here for you. If you're in crisis, call or text **988**. " +
          "If it's a medical emergency, call **911**. You can also ask me about coping strategies or how to support a friend.",
      });
    }
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("chat handler error", err);
    return res.status(502).json({ error: "The AI service is unavailable right now." });
  }
};

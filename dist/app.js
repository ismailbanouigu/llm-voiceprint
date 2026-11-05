const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const connect = $("#polliConnect");
const appKey = window.VOICEPRINT_CONFIG?.appKey || "";
const SAMPLE = `In today's rapidly evolving digital landscape, effective communication is more important than ever. It's not just about conveying information—it's about creating meaningful connections that resonate with your audience. By embracing clarity, authenticity, and strategic storytelling, organizations can unlock new opportunities, foster lasting engagement, and drive transformative impact. Ultimately, the future of communication lies in balancing innovation with a human touch.`;

const DEFINITIONS = [
  { id: "framing", name: "Generic framing", test: /(in today'?s|in a world|at its core|in an era|the landscape|more important than ever)/gi, why: "The passage clears its throat with context broad enough to fit almost any topic." },
  { id: "contrast", name: "Packaged contrast", test: /(not (?:just|merely|only)[^.!?]{0,90}(?:but|—)|more than (?:just|a)|rather than)/gi, why: "Repeated not-X-but-Y structures make nuance feel pre-assembled." },
  { id: "abstract", name: "Abstract uplift", test: /(innovation|transformation|impact|potential|journey|testament|landscape|ecosystem|opportunities|engagement|authenticity)/gi, why: "Abstract nouns replace people, objects, and observable actions." },
  { id: "transitions", name: "Essay transitions", test: /(moreover|furthermore|ultimately|in conclusion|it is worth noting|delve|embracing)/gi, why: "The transitions announce structure instead of letting the argument create it." },
  { id: "punctuation", name: "Em-dash cadence", test: /—/g, why: "The em dash repeatedly performs the same reveal or qualification." },
  { id: "cadence", name: "Polished sameness", test: null, why: "Sentences land at similar lengths and emotional temperatures, with little friction or surprise." }
];

if (/^pk_[A-Za-z0-9_-]+$/.test(appKey) && !appKey.includes("REPLACE")) connect.setAttribute("app-key", appKey);

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 3000);
}

function words(text) { return text.trim() ? text.trim().split(/\s+/) : []; }

function sentenceLengths(text) {
  return text.split(/[.!?]+/).map((s) => words(s).length).filter(Boolean);
}

function localAnalyze(text) {
  const wordTotal = Math.max(1, words(text).length);
  const sentences = sentenceLengths(text);
  const mean = sentences.reduce((a, b) => a + b, 0) / Math.max(1, sentences.length);
  const variance = sentences.reduce((sum, n) => sum + ((n - mean) ** 2), 0) / Math.max(1, sentences.length);
  const cadenceScore = Math.max(0, Math.min(100, Math.round(88 - Math.sqrt(variance) * 8 + Math.min(20, mean))));

  const markers = DEFINITIONS.map((definition) => {
    if (definition.id === "cadence") return { ...definition, score: cadenceScore, evidence: `${sentences.length} sentences; ${Math.round(mean)} words on average` };
    const matches = [...text.matchAll(new RegExp(definition.test.source, definition.test.flags))];
    const weight = definition.id === "punctuation" ? 35 : 27;
    return {
      ...definition,
      score: Math.min(100, Math.round((matches.length * weight * 100) / Math.max(100, wordTotal))),
      evidence: matches.length ? matches.slice(0, 3).map((m) => `“${m[0]}”`).join(", ") : "No strong example found"
    };
  });
  const overall = Math.round(markers.reduce((sum, marker) => sum + marker.score, 0) / markers.length);
  return { overall, verdict: verdictFor(overall), markers, rewritten: "", edits: ["Local scan only—connect for a contextual rewrite."] };
}

function verdictFor(score) {
  if (score >= 70) return "The prose is polished past the point of personality.";
  if (score >= 45) return "The voice has several model-shaped habits, but some texture survives.";
  return "The passage keeps enough specificity and irregular rhythm to resist the stock voice.";
}

function parseJson(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model did not return a readable analysis. Try again.");
  const data = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(data.markers) || !data.rewritten) throw new Error("The analysis was incomplete. Try again.");
  data.markers = data.markers.slice(0, 6).map((marker, index) => ({
    name: String(marker.name || DEFINITIONS[index]?.name || `Marker ${index + 1}`),
    score: Math.max(0, Math.min(100, Number(marker.score) || 0)),
    evidence: String(marker.evidence || "No excerpt supplied"),
    why: String(marker.why || "This pattern contributes to a generic, repeatable cadence.")
  }));
  data.overall = Math.max(0, Math.min(100, Number(data.overall) || 0));
  data.verdict = String(data.verdict || verdictFor(data.overall));
  data.edits = Array.isArray(data.edits) ? data.edits.slice(0, 4).map(String) : [];
  return data;
}

async function aiAnalyze(text, mode) {
  const system = `You are a precise writing editor studying the recognizable "LLM voice": generic framing, symmetric contrast, abstract uplift, predictable transitions, repeated em-dash reveals, and uniformly polished cadence. Analyze style only; never claim to detect whether AI authored the text. Return ONLY JSON:
{"overall":0,"verdict":"one concise sentence","markers":[{"name":"marker","score":0,"evidence":"short exact excerpt or concrete observation","why":"one sentence"}],"rewritten":"complete rewrite","edits":["specific change"]}
Return exactly 6 markers with integer scores 0-100. Preserve facts and intent. Rewrite in a ${mode} voice: specific, varied, direct, no generic scene-setting, no fake personal experience, no invented facts. Keep roughly the same length. No Markdown.`;
  const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${connect.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-5.4-nano", reasoning_effort: "low", temperature: 0.3, max_tokens: 2400, messages: [{ role: "system", content: system }, { role: "user", content: text }] })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `Request failed (${response.status})`);
  return parseJson(payload?.choices?.[0]?.message?.content || "");
}

function polar(cx, cy, radius, angle) { return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]; }

function renderRadar(markers) {
  const svg = $("#radar");
  svg.replaceChildren();
  const cx = 260, cy = 210, radius = 145, count = Math.max(3, markers.length);
  for (let ring = 1; ring <= 4; ring += 1) {
    const points = markers.map((_, i) => polar(cx, cy, radius * ring / 4, -Math.PI / 2 + i * Math.PI * 2 / count).join(",")).join(" ");
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", points); polygon.setAttribute("class", "radar-grid"); svg.append(polygon);
  }
  markers.forEach((_, i) => {
    const [x, y] = polar(cx, cy, radius, -Math.PI / 2 + i * Math.PI * 2 / count);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    Object.entries({ x1: cx, y1: cy, x2: x, y2: y, class: "radar-axis" }).forEach(([k, v]) => line.setAttribute(k, v)); svg.append(line);
  });
  const values = markers.map((marker, i) => polar(cx, cy, radius * marker.score / 100, -Math.PI / 2 + i * Math.PI * 2 / count));
  const area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  area.setAttribute("points", values.map((p) => p.join(",")).join(" ")); area.setAttribute("class", "radar-area"); svg.append(area);
  values.forEach(([x, y], i) => {
    const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    point.setAttribute("cx", x); point.setAttribute("cy", y); point.setAttribute("r", 4); point.setAttribute("class", "radar-point"); svg.append(point);
    const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
    const [lx, ly] = polar(cx, cy, radius + 36, angle);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", lx); label.setAttribute("y", ly); label.setAttribute("class", "radar-label"); label.textContent = markers[i].name.toUpperCase(); svg.append(label);
  });
}

function renderMarkers(markers) {
  const mount = $("#markerList"); mount.replaceChildren();
  markers.forEach((marker, index) => {
    const item = document.createElement("div"); item.className = "marker";
    const num = document.createElement("span"); num.textContent = String(index + 1).padStart(2, "0");
    const copy = document.createElement("div"); const title = document.createElement("h3"); const detail = document.createElement("p");
    title.textContent = marker.name; detail.textContent = `${marker.evidence} — ${marker.why}`; copy.append(title, detail);
    const score = document.createElement("b"); score.textContent = String(Math.round(marker.score)); item.append(num, copy, score); mount.append(item);
  });
}

function renderResult(result, original, type, scroll = true) {
  $("#verdict").textContent = result.verdict;
  $("#overallScore").textContent = String(Math.round(result.overall));
  $("#analysisType").textContent = type;
  $("#originalText").textContent = original;
  $("#rewrittenText").textContent = result.rewritten || "Connect your Pollinations wallet and choose Analyze + rewrite for a contextual rewrite.";
  const editList = $("#editList"); editList.replaceChildren();
  result.edits.forEach((edit) => { const li = document.createElement("li"); li.textContent = edit; editList.append(li); });
  renderRadar(result.markers); renderMarkers(result.markers); $("#results").hidden = false;
  if (scroll) $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function currentText() { return $("#textInput").value.trim(); }
function validateText() { const text = currentText(); if (words(text).length < 25) { toast("Paste at least 25 words so there is a voice to inspect."); return ""; } return text; }

async function analyzeWithAi() {
  const text = validateText(); if (!text) return;
  if (!/^pk_[A-Za-z0-9_-]+$/.test(appKey) || appKey.includes("REPLACE")) { toast("Voiceprint is waiting for its Pollinations App Key."); return; }
  if (!connect.apiKey) { toast("Connect your Pollinations wallet first."); connect.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  $("#loading").hidden = false; $("#analyzeButton").disabled = true;
  try { const mode = $('input[name="mode"]:checked')?.value || "plainspoken"; renderResult(await aiAnalyze(text, mode), text, "AI REVIEW"); }
  catch (error) { toast(error.message || "The analysis could not finish."); }
  finally { $("#loading").hidden = true; $("#analyzeButton").disabled = false; }
}

$("#textInput").addEventListener("input", () => { $("#wordCount").textContent = `${words(currentText()).length} words`; });
$("#loadSample").addEventListener("click", () => { $("#textInput").value = SAMPLE; $("#textInput").dispatchEvent(new Event("input")); toast("Specimen loaded. Try the free local scan."); });
$("#localButton").addEventListener("click", () => { const text = validateText(); if (text) renderResult(localAnalyze(text), text, "LOCAL HEURISTIC"); });
$("#analyzeButton").addEventListener("click", analyzeWithAi);
$("#copyRewrite").addEventListener("click", async () => { const text = $("#rewrittenText").textContent; await navigator.clipboard.writeText(text); toast("Rewrite copied."); });
connect.addEventListener("change", () => toast(connect.apiKey ? "Wallet connected. AI review is ready." : "Wallet disconnected."));

$("#textInput").value = SAMPLE;
$("#textInput").dispatchEvent(new Event("input"));
renderResult(localAnalyze(SAMPLE), SAMPLE, "LOCAL HEURISTIC", false);
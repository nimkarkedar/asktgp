import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse, after } from "next/server";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { checkRateLimit } from "@/lib/rateLimit";
import { makeSlug } from "@/lib/qa";

const MAX_QUESTION_LENGTH = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function logToSheet(question: string, ip: string) {
  if (!process.env.GOOGLE_SHEET_ID) return;
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:C",
      valueInputOption: "RAW",
      requestBody: {
        values: [[new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), question, ip]],
      },
    });
  } catch (err) {
    console.error("Sheet log error:", err);
  }
}

async function embedQuestion(question: string): Promise<number[]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ model: "voyage-3", input: [question] }),
  });
  const data = await res.json() as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

// ── Guest index ──────────────────────────────────────────────────────────────
// Cache the list of episode titles in memory and refresh every 5 minutes.
// We match question tokens against title tokens so ANY phrasing that contains
// a guest name (single, bigram, or typo) finds the right episode.

type TitleEntry = { title: string; tokens: string[] };
let titleCache: { entries: TitleEntry[]; expiresAt: number } | null = null;

// Tokens that appear in questions or titles but should never be treated as
// names. Stripped from both sides of the match so they can't cause false hits.
const NON_NAME_TOKENS = new Set([
  // Archive metadata
  "ep", "episode", "transcript", "part", "vol", "volume", "interview",
  // Articles / prepositions / conjunctions
  "the", "a", "an", "and", "or", "of", "on", "in", "at", "to", "for",
  "with", "by", "from", "about", "is", "are", "was", "were", "be", "been",
  "between", "into", "onto", "over", "under", "through",
  // Question / instruction words
  "what", "who", "how", "why", "when", "where", "which", "tell", "say",
  "said", "think", "thinks", "thought", "know", "knows", "did", "does",
  "do", "can", "could", "would", "should", "will", "shall", "may", "might",
  "please", "give", "show", "describe", "explain", "summarise", "summarize",
  "summary", "overview", "advice", "thoughts", "view", "views", "opinion",
  "perspective", "according", "example", "examples", "like", "love", "hate",
  "mean", "means", "meaning", "talk", "talks", "talked", "talking",
  // Generic verbs that show up in titles
  "designing", "making", "writing", "drawing", "painting", "building",
  "discussing", "creating", "learning", "teaching", "reading", "knowing",
  "understanding", "hiring", "leading", "working", "studying",
  // Common topic nouns (added to avoid matching question topic → unrelated title)
  "type", "typography", "book", "books", "space", "spaces", "leadership",
  "leader", "leaders", "illustration", "illustrator", "music", "film",
  "films", "cinema", "poetry", "writer", "photographer", "photography",
  "painter", "cover", "covers", "brand", "branding", "logo", "logos",
  "identity", "product", "craft", "culture", "taste", "voice", "vision",
  "critique", "feedback", "client", "brief", "career", "portfolio",
  "process", "practice", "inspiration", "muse", "research", "synthesis",
  "education", "history", "philosophy", "aesthetic", "material", "method",
  "methods", "approach", "story", "stories", "narrative", "path", "work",
  "works", "project", "projects", "piece", "pieces", "series", "collection",
  "show", "exhibition", "museum", "gallery", "studio", "agency", "company",
  "startup", "student", "students", "teacher", "mentor", "lesson", "lessons",
  "context", "style", "styles", "movement", "concept", "concepts",
  "principle", "principles", "rule", "rules", "color", "colour", "form",
  "line", "print", "digital", "web", "app", "mobile", "tool", "tools",
  // Generic topic words that dominate many titles
  "design", "art", "artist", "designer", "creative", "creativity", "idea",
  "ideas", "podcast", "conversation", "feat", "ft", "india", "indian",
  // Generic episode title words from this archive
  "architecture", "films", "thinking", "generalists", "specialists",
  // Month names / dates
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct",
  "nov", "dec", "january", "february", "march", "april", "june", "july",
  "august", "september", "october", "november", "december",
]);

// Ordinary English words that appear in descriptive episode titles
// ("Designers with Agency", "Indic Typefaces", "Designing Temples"). They are
// not names, so a question using them ("how should designers…") must not be
// routed to that one episode by the name shortcut. Generated from the titles
// against a dictionary, with real surnames (Joshi, Singh, Perry, Oak…) removed.
// Re-check when new transcripts with descriptive titles are ingested.
const GENERIC_TITLE_WORDS = new Set([
  "abstract", "actor", "aesthetics", "agency", "angle", "animation", "appliance",
  "architecture", "archives", "ark", "art", "artist", "banker", "behind", "beyond",
  "case", "centered", "cinema", "context", "conversation", "dance", "dead", "deep",
  "design", "designer", "designers", "designing", "discussing", "discussion", "dissent",
  "drawings", "dreams", "earth", "education", "epistemology", "film", "films", "game",
  "generalists", "government", "guide", "history", "home", "honest", "humans", "ideas",
  "illustrations", "importance", "improvisation", "indic", "industrial", "insights",
  "intensity", "introduction", "jazz", "knowing", "language", "last", "leaders",
  "leadership", "learning", "lecture", "lessons", "lines", "logo", "manuscript",
  "material", "materials", "matter", "means", "mela", "memory", "more", "motion",
  "movement", "mud", "murals", "museum", "music", "new", "nid", "nuances", "order",
  "paintings", "paper", "parallel", "peace", "pedagogy", "perspective", "philosophical",
  "photographs", "playing", "plays", "poetry", "pot", "practical", "prof", "project",
  "raw", "readings", "rhythm", "rock", "rupee", "scissors", "shed", "spark", "speaking",
  "specialists", "stop", "structures", "study", "symbol", "tabla", "template",
  "temples", "temptations", "theoretical", "thinking", "thoughts", "translation",
  "transport", "trucks", "type", "understanding", "value", "youth",
  "typefaces", "typeface",
]);

function tokenizeTitle(title: string): string[] {
  return title
    .split(/[\s._\-]+/)
    .map((t) => t.toLowerCase().replace(/[^a-z]/g, ""))
    .filter((t) => t.length >= 3 && !/^\d+$/.test(t) && !NON_NAME_TOKENS.has(t) && !GENERIC_TITLE_WORDS.has(t));
}

async function getTitleIndex(): Promise<TitleEntry[]> {
  const now = Date.now();
  if (titleCache && titleCache.expiresAt > now) return titleCache.entries;

  // Supabase caps each request at 1000 rows. Paginate through all chunks
  // (the archive has ~5000 rows across 160+ episodes).
  const seen = new Set<string>();
  const PAGE = 1000;
  for (let offset = 0; offset < 20000; offset += PAGE) {
    const { data, error } = await supabase
      .from("transcript_chunks")
      .select("episode_title")
      .range(offset, offset + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data) seen.add(row.episode_title as string);
    if (data.length < PAGE) break;
  }

  const entries = Array.from(seen).map((title) => ({ title, tokens: tokenizeTitle(title) }));
  titleCache = { entries, expiresAt: now + 5 * 60 * 1000 };
  return entries;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i, ...new Array(b.length).fill(0)];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    }
    for (let k = 0; k <= b.length; k++) prev[k] = cur[k];
  }
  return prev[b.length];
}

// Fuzzy match: true if question token matches title token within typo tolerance.
// Match strength: 0 = no match, 2 = fuzzy (typo), 3 = exact or prefix.
// Fuzzy is intentionally tight (Lev ≤ 1) to avoid nonsense like random→Randy.
function matchStrength(qTok: string, tTok: string): number {
  if (qTok === tTok) return 3;
  if (qTok.length >= 5 && tTok.length >= 5) {
    if (tTok.startsWith(qTok) || qTok.startsWith(tTok)) return 3;
  }
  if (qTok.length >= 5 && tTok.length >= 5 &&
      Math.abs(qTok.length - tTok.length) <= 1 &&
      levenshtein(qTok, tTok) <= 1) {
    return 2;
  }
  return 0;
}

// Score a title against question tokens. Exact matches beat fuzzy in ties.
// Consecutive bigram hit (full name, e.g. "Susmita Mohanty") is strongest.
function scoreTitle(qTokens: string[], entry: TitleEntry): number {
  let score = 0;
  for (const qTok of qTokens) {
    let best = 0;
    for (const tTok of entry.tokens) {
      best = Math.max(best, matchStrength(qTok, tTok));
      if (best === 3) break;
    }
    score += best;
  }
  for (let i = 0; i < qTokens.length - 1; i++) {
    for (let j = 0; j < entry.tokens.length - 1; j++) {
      if (matchStrength(qTokens[i], entry.tokens[j]) > 0 &&
          matchStrength(qTokens[i + 1], entry.tokens[j + 1]) > 0) {
        score += 5;
      }
    }
  }
  return score;
}

async function findEpisodeByName(question: string): Promise<string | null> {
  // Pull every word that looks like it could be a name: 3+ letters, not a stopword.
  const qTokens = question
    .split(/[\s,.?!]+/)
    .map((w) => w.toLowerCase().replace(/[^a-z']/g, "").replace(/'s$/, ""))
    .filter((w) => w.length >= 3 && !NON_NAME_TOKENS.has(w));

  if (qTokens.length === 0) return null;

  const entries = await getTitleIndex();
  let best: { title: string; score: number } | null = null;
  for (const entry of entries) {
    const score = scoreTitle(qTokens, entry);
    if (score > 0 && (!best || score > best.score)) {
      best = { title: entry.title, score };
    }
  }

  // Score 3+ means at least one exact name-token match, or a fuzzy match on
  // a distinctive name plus another signal. Pure single-fuzzy (score 2) still
  // passes because typos like Sushmita→Susmita and Pinki→Pinaki are common,
  // but we only allow it when the title has ≤ 2 name tokens total (so the
  // matched token is clearly the guest's name, not a stray word).
  if (!best) return null;
  const matched: { title: string; score: number } = best;
  if (matched.score >= 3) return matched.title;
  if (matched.score === 2) {
    const entry = entries.find((e) => e.title === matched.title);
    if (entry && entry.tokens.length <= 2) return matched.title;
  }
  return null;
}

// ── Keyword extraction for hybrid search ─────────────────────────────────────
// Vector search alone often misses topical matches because the guest uses
// different vocabulary than the question. Hybrid = vector + keyword, merged.

const STOPWORDS_FOR_KEYWORDS = new Set([
  ...NON_NAME_TOKENS,
  "think", "know", "find", "want", "need", "feel", "look", "make", "made",
  "take", "took", "come", "came", "went", "said", "says", "ask", "asked",
  "use", "used", "good", "bad", "best", "better", "worse", "more", "less",
  "most", "least", "many", "much", "some", "any", "all", "none", "every",
  "thing", "things", "stuff", "really", "very", "just", "quite", "also",
  "only", "even", "still", "yet", "then", "than", "too", "here", "there",
]);

// Normalize a word to a searchable stem-like prefix that substring-matches
// both singular and plural forms in the archive.
//   "communities" → "communit"  (matches community, communities, communal)
//   "colors" → "color"
//   "forming" → "form"
//   "designed" → "design"
function stemLite(w: string): string {
  const x = w.toLowerCase();
  if (x.length <= 4) return x;
  if (x.endsWith("ies")) return x.slice(0, -3);
  if (x.endsWith("ing") && x.length > 5) return x.slice(0, -3);
  if (x.endsWith("ed") && x.length > 4) return x.slice(0, -2);
  if (x.endsWith("s") && !x.endsWith("ss")) return x.slice(0, -1);
  return x;
}

// Short words are usually noise, but these carry the topic of a design
// question ("web designer", "UX", "AI in art"). They are matched as whole
// words so "art" doesn't hit "start" and "ux" doesn't hit "luxury".
const SHORT_TOPIC_TERMS = new Set(["web", "ux", "ui", "app", "art", "ai", "vr", "ar", "tv", "3d"]);

function extractKeywords(question: string): string[] {
  const raw = question
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => (w.length >= 4 || SHORT_TOPIC_TERMS.has(w)) && !STOPWORDS_FOR_KEYWORDS.has(w));
  // Dedupe by stem
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of raw) {
    const s = stemLite(w);
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

type Chunk = { episode_title: string; content: string; chunk_index?: number };

// Keyword search strategy:
//   - If 2+ keywords: require ALL to appear in chunk (AND). Highly selective,
//     catches topical matches vector search misses (e.g. Sarover Zaidi for
//     "communities" + "color" when her chunks discuss both explicitly).
//   - If AND returns nothing: fall back to OR, keep chunks with most hits.
//   - If only 1 keyword: require just that one.
// Whole-word pattern for short terms; substring match for longer ones.
function isShort(k: string) {
  return k.length < 4;
}
function wordPattern(k: string) {
  return `(^|[^a-z])${k}([^a-z]|$)`;
}
function countHits(text: string, k: string): number {
  const re = isShort(k)
    ? new RegExp(wordPattern(k), "g")
    : new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  return (text.match(re) ?? []).length;
}

type ChunkQuery = ReturnType<typeof chunkQuery>;
function chunkQuery() {
  return supabase.from("transcript_chunks").select("episode_title, content, chunk_index");
}
function withKeyword(q: ChunkQuery, k: string): ChunkQuery {
  return isShort(k) ? q.filter("content", "imatch", wordPattern(k)) : q.ilike("content", `%${k}%`);
}

async function keywordSearch(keywords: string[], limit = 12): Promise<Chunk[]> {
  if (keywords.length === 0) return [];

  // AND: every keyword must appear; rank by keyword density.
  if (keywords.length >= 2) {
    let q = chunkQuery();
    for (const k of keywords) q = withKeyword(q, k);
    const { data } = await q.limit(limit * 3);
    if (data && data.length > 0) {
      const scored = data.map((r) => {
        const low = (r.content as string).toLowerCase();
        const density = keywords.reduce((n, k) => n + countHits(low, k), 0);
        return { ...r, score: density } as Chunk & { score: number };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit);
    }
  }

  // Fallback (or single keyword): OR across keywords, ranked by how many
  // different keywords each chunk contains. One query per keyword keeps the
  // whole-word patterns out of PostgREST's or() syntax.
  const results = await Promise.all(keywords.map((k) => withKeyword(chunkQuery(), k).limit(200)));
  const byKey = new Map<string, Chunk>();
  for (const { data } of results) {
    for (const r of data ?? []) byKey.set(`${r.episode_title}::${r.chunk_index}`, r as Chunk);
  }
  const scored = [...byKey.values()].map((r) => {
    const low = r.content.toLowerCase();
    const hits = keywords.filter((k) => countHits(low, k) > 0).length;
    return { ...r, score: hits } as Chunk & { score: number };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((r) => r.score >= 1).slice(0, limit);
}

async function vectorSearch(question: string, matchCount = 10): Promise<Chunk[]> {
  const embedding = await embedQuestion(question);
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
  });
  if (error) {
    console.error("vectorSearch error:", JSON.stringify(error));
    return [];
  }
  return (data ?? []) as Chunk[];
}

// Merge keyword + vector results, dedupe by (episode_title, chunk_index or
// content prefix). Interleave so both signals get representation near the top.
function mergeHybrid(kw: Chunk[], vec: Chunk[], maxTotal = 14): Chunk[] {
  const seen = new Set<string>();
  const out: Chunk[] = [];
  const key = (c: Chunk) =>
    `${c.episode_title}::${c.chunk_index ?? c.content.slice(0, 60)}`;
  const max = Math.max(kw.length, vec.length);
  for (let i = 0; i < max && out.length < maxTotal; i++) {
    for (const src of [kw, vec]) {
      if (i < src.length) {
        const c = src[i];
        const k = key(c);
        if (!seen.has(k)) {
          seen.add(k);
          out.push(c);
          if (out.length >= maxTotal) break;
        }
      }
    }
  }
  return out;
}

async function getRelevantChunks(question: string): Promise<Chunk[]> {
  // 1. Name-aware retrieval — direct title match.
  const matchedTitle = await findEpisodeByName(question);
  if (matchedTitle) {
    const { data: personChunks } = await supabase
      .from("transcript_chunks")
      .select("episode_title, content, chunk_index")
      .eq("episode_title", matchedTitle)
      .order("chunk_index")
      .limit(8);

    if (personChunks && personChunks.length > 0) {
      console.log(`🎯 Name match → ${matchedTitle} (${personChunks.length} chunks)`);
      return personChunks as Chunk[];
    }
  }

  // 2. Topic query: rephrase for search, then hybrid search (keyword + vector)
  //    over both the visitor's words and the rephrased version.
  const rewrite = await rewriteForSearch(question);
  const keywords = rewrite?.keywords.length ? rewrite.keywords : extractKeywords(question);
  const [kw, vecOriginal, vecRewritten] = await Promise.all([
    keywordSearch(keywords),
    vectorSearch(question, 8),
    rewrite ? vectorSearch(rewrite.search, 8) : Promise.resolve([] as Chunk[]),
  ]);
  const vec = mergeHybrid(vecRewritten, vecOriginal, 12);

  console.log(
    `🔍 Hybrid: search="${rewrite?.search ?? question}" keywords=[${keywords.join(", ")}] → kw:${kw.length} vec:${vec.length}`
  );
  return mergeHybrid(kw, vec, 14);
}

// Turns a conversational question into what the archive would actually
// contain: "how can you help a web designer" → "web design, interface design,
// user experience". Cheap and fast; any failure falls back to the original
// question so answering never depends on it.
const REWRITE_MODEL = "claude-haiku-4-5";

async function rewriteForSearch(question: string): Promise<{ search: string; keywords: string[] } | null> {
  try {
    const response = await client.messages.create(
      {
        model: REWRITE_MODEL,
        max_tokens: 300,
        system: `You turn a visitor's question into search terms for an archive of long-form podcast conversations with Indian designers, artists, architects, filmmakers, musicians and writers.

Return ONLY JSON: {"search": string, "keywords": string[]}
- "search": one plain sentence naming the topics a conversation would have to discuss to answer the question, in the words guests would use (e.g. "web design, interface design and user experience advice for designers").
- "keywords": 2 to 4 single lowercase words that would literally appear in such a conversation. Most specific first. No generic words like "design", "designer", "advice", "help".
- If the question addresses the tool itself ("how can you help me as a web designer"), treat it as asking what these conversations offer that person.`,
        messages: [{ role: "user", content: question }],
      },
      { timeout: 5000, maxRetries: 0 }
    );
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const search = typeof json.search === "string" ? json.search.trim() : "";
    const keywords = Array.isArray(json.keywords)
      ? json.keywords
          .map((k: unknown) => String(k).toLowerCase().trim())
          .filter((k: string) => /^[a-z]{2,20}$/.test(k))
          .slice(0, 4)
      : [];
    return search ? { search, keywords } : null;
  } catch (err) {
    console.error("rewriteForSearch failed, using the original question:", err instanceof Error ? err.message : err);
    return null;
  }
}

// Random meme / reaction GIFs shown when a question is out of syllabus.
// Files live in /public/oos/. URL-encoded so spaces in filenames work.
const FUN_GIFS = [
  "Angry Schitts Creek GIF by CBC.gif",
  "Confused 3 Idiots GIF.gif",
  "Confused Dogs by MOODMAN.gif",
  "Confused Schitts Creek GIF by CBC.gif",
  "Congress Modi GIF.gif",
  "Exam Study Time GIF by Digital Pratik.gif",
  "GIF from Giphy.gif",
  "Generic Reaction GIF.gif",
  "Indian Cinema No GIF by Bombay Softwares.gif",
  "Irrfan Khan GIF.gif",
  "Losing It Epic Fail GIF Magic Radio.gif",
  "Michael Cohen GIF (1).gif",
  "Richard Rankin Fml GIF.gif",
  "Sad Bigg Boss GIF.gif",
  "Sorry Barack Obama GIF.gif",
  "Sorry Please Forgive Me GIF by Tata Play.gif",
  "Sorry The Hangover GIF.gif",
  "Test Teacher GIF by BuzzFeed.gif",
  "You Can't Indian Cinema GIF by Bombay Softwares.gif",
].map((name) => `/oos/${encodeURIComponent(name)}`);

// Sentinel stored in qa_history.short_answer to flag out-of-syllabus rows.
// These rows record question + timestamp + location for analytics but are
// filtered out of the public Explore feed.
const OUT_OF_SYLLABUS_MARKER = "__OUT_OF_SYLLABUS__";

function buildSystemPrompt(
  context: string,
  episodeTitles: string[],
  allowNeedsContext: boolean,
  allowOutOfSyllabus: boolean
): string {
  const promptPath = path.join(process.cwd(), "PROMPT.md");
  const promptDoc = fs.readFileSync(promptPath, "utf-8");

  const referencesInstruction = episodeTitles.length > 0
    ? `The transcripts you are drawing from belong to the following guests — use these names exactly as written:
${episodeTitles.map((t) => `- ${t}`).join("\n")}

In the "references" array, include each name exactly as listed above, and pair it with their primary profession as you can determine from the transcript content (e.g. Designer, Architect, Artist, Illustrator, Typographer, Filmmaker, Writer, Musician, Photographer — one or two words). If a title looks like a book, paper, or document title rather than a person's name, exclude it from references.`
    : `Use an empty "references" array.`;

  const outOfSyllabusRule = `GROUNDING RULE — read carefully:

You may ONLY answer from the excerpts provided below. You may NOT use general knowledge, general design wisdom, or anything outside these excerpts. If the excerpts do not contain enough material to give a grounded, specific answer to the question, respond ONLY with:
{ "outOfSyllabus": true }

Return outOfSyllabus when:
- The question is unrelated to design, art, or creative practice (e.g. sports, politics, recipes).
- The excerpts are present but genuinely do not address the question — even loosely. Do not stretch unrelated excerpts into an answer.
- You would have to invent, generalise, or speak from outside the archive to answer.

Do NOT return outOfSyllabus just because the excerpts require interpretation. If there is a plausible thread in the excerpts that connects to the question, draw from it. But never fabricate, never bluff, never "puff" an answer using general AI knowledge.

Closely related is enough: if the question is about one field and the excerpts discuss a neighbouring one that clearly applies (for example interface or UX design for a question about web design, or type design for a question about fonts), answer from what the excerpts actually say. If the question addresses Ask TGP itself ("how can you help me as a web designer"), answer what these conversations offer that person.

Return outOfSyllabus only when nothing in the excerpts genuinely speaks to the question.`;

  return `You are the oracle of Ask TGP — a distillation of wisdom from The Gyaan Project's full knowledge base: 300+ podcast conversations with artists, designers, and creative thinkers, alongside books, white papers, and presentations on design and art.

${outOfSyllabusRule}

${allowNeedsContext ? `AMBIGUOUS QUESTIONS: If the question has no design or art keywords and is too vague to answer (e.g. "Which is better?", "How do I start?", "What should I choose?"), respond ONLY with:
{ "needsContext": true, "hint": "A one-sentence friendly suggestion asking them to specify the design or art context." }

Otherwise, when` : `When`} a user asks a question about design or art, respond in two parts. Use the guidelines below (from PROMPT.md) to shape your response.

---
${promptDoc}
---

${context ? `Here are the most relevant excerpts from The Gyaan Project transcripts to inform your answer:\n\n${context}\n\nDraw from this wisdom to craft your response. Be specific and reference ideas from these conversations.` : "Draw from your general understanding of design and art wisdom."}

${referencesInstruction}

HARD LIMITS:
- The "long" answer must be between 120 and 150 words, drawn verbatim (or near-verbatim) from ONE single most-relevant episode. Never mash up multiple episodes.
- Never mention any guest, person, or interviewee name anywhere in short or long.
- Never use hyphens or em-dashes anywhere. Use commas, periods, or restructure.

Respond ONLY in this exact JSON format, with no text outside it:
{
  "short": "The koan here (2 to 5 words)",
  "long": "The detailed answer here (120 to 150 words), using \\n\\n to separate paragraphs.",
  "references": [
    { "name": "Guest Name", "profession": "Profession" }
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string" || question.trim() === "") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }
    if (question.trim().length > MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        { error: `Please keep your question under ${MAX_QUESTION_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // Handle meta questions about Ask TGP directly, without hitting the AI
    const metaPatterns = /what\s+is\s+(this|ask\s+tgp|the\s+gyaan\s+project|tgp)|how\s+does\s+this\s+work|who\s+(made|created|built)\s+this|what\s+can\s+(i|you)\s+(ask|do)/i;
    if (metaPatterns.test(question.trim())) {
      return NextResponse.json({
        short: "A window into 300 conversations.",
        long: "Ask TGP is an AI oracle built on The Gyaan Project — a podcast by Kedar Nimkar featuring 300+ conversations with India's finest designers, artists, architects, musicians, and creative thinkers.\n\nAsk it anything about design, art, or creative practice. It draws from those conversations to give you a short answer and a long answer — distilled wisdom, not a search result.\n\nThink of it as sitting across from someone who has spent years listening carefully to brilliant people, and is now quietly passing on what they heard.",
        references: [],
      });
    }

    const limit = await checkRateLimit(supabase, req, "ask");
    if (!limit.ok) {
      return NextResponse.json({ error: limit.reason }, { status: 429 });
    }

    const hasDesignContext = /design|art|artist|architect|creative|creativity|craft|typography|type\b|illustration|illustrat|photograph|film|cinema|music|theatre|dance|paint|sculpt|brand|logo|identity|ux|ui|product|studio|maker|making|aesthetic|culture|cultural|writer|writing|poet|theatre|performance|summaris|summariz|episode|gyaan|tgp|material|space|craft|process|practice|inspiration|muse|voice|style|taste|vision|critique|feedback|client|brief|career|portfolio/i.test(question);

    // Search for relevant transcript chunks
    const chunks = await getRelevantChunks(question);

    // Trust the model's own judgment: it sees the excerpts and decides
    // whether they genuinely support a grounded answer. Forcing an answer
    // causes bluffing, which we want to avoid.
    const allowOutOfSyllabus = true;

    // Build context from top chunks
    const context = chunks
      .map((c: { episode_title: string; content: string }) =>
        `[From: ${c.episode_title}]\n${c.content}`
      )
      .join("\n\n---\n\n");

    // Extract unique episode titles — these are the ground-truth guest names
    const episodeTitles = [...new Set(
      chunks.map((c: { episode_title: string }) => c.episode_title)
    )] as string[];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: buildSystemPrompt(context, episodeTitles, !hasDesignContext, allowOutOfSyllabus),
      messages: [{ role: "user", content: `Question: ${question.trim()}` }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Raw AI response:", raw);
      return NextResponse.json({ error: "Failed to parse AI response." }, { status: 500 });
    }


    // Strip URLs, "Learn more" lines, em-dashes, and hyphen dashes
    function sanitize(text: string): string {
      return text
        .replace(/\n*\s*Learn more[:\s].*$/gim, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/—/g, ",")      // em-dash to comma
        .replace(/–/g, ",")      // en-dash to comma
        .replace(/ - /g, ", ")   // spaced hyphen to comma
        .replace(/ -\s/g, ", ")
        .replace(/\s-\s/g, ", ")
        .trim();
    }

    if (parsed.long) parsed.long = sanitize(parsed.long);
    if (parsed.short) parsed.short = sanitize(parsed.short);

    // Soft cap: allow up to 150 words. Only truncate if model overshoots.
    if (parsed.long) {
      const words = parsed.long.split(/\s+/);
      if (words.length > 150) {
        const truncated = words.slice(0, 150).join(" ");
        const lastSentence = Math.max(
          truncated.lastIndexOf(". "),
          truncated.lastIndexOf("! "),
          truncated.lastIndexOf("? ")
        );
        parsed.long = lastSentence > truncated.length * 0.6
          ? truncated.slice(0, lastSentence + 1)
          : truncated;
      }
    }

    if (parsed.needsContext) {
      return NextResponse.json({ needsContext: true, hint: parsed.hint ?? "Try adding 'design' or 'art' to your question for a more focused answer." });
    }


    if (parsed.outOfSyllabus) {
      const funUrl = FUN_GIFS[Math.floor(Math.random() * FUN_GIFS.length)];

      // Record the question (no answer) so we can see what people are asking
      // that falls outside the archive. Flagged with sentinel short_answer.
      try {
        await supabase.from("qa_history").insert({
          question: question.trim(),
          short_answer: OUT_OF_SYLLABUS_MARKER,
          long_answer: "",
        });
      } catch {
        // non-fatal
      }

      const city = decodeURIComponent(req.headers.get("x-vercel-ip-city") ?? "unknown");
      const country = req.headers.get("x-vercel-ip-country") ?? "";
      const location = country ? `${city}, ${country}` : city;
      // Run after the response is sent — Vercel keeps the function alive
      // until the after() callback resolves, so the Sheets write actually lands.
      after(async () => {
        try {
          await logToSheet(`[OUT OF SYLLABUS] ${question.trim()}`, location);
        } catch (err) {
          console.error("Sheet log (OOS) failed:", err);
        }
      });

      return NextResponse.json({ outOfSyllabus: true, funUrl });
    }

    if (!Array.isArray(parsed.references)) parsed.references = [];

    // Fallback: if Claude returned no references, use episode titles directly
    if (parsed.references.length === 0) {
      parsed.references = episodeTitles.map((title) => ({ name: title, profession: "" }));
    }

    // Save to qa_history — skip only if an identical *answered* question exists
    // in the last 2 minutes. Sentinel (out-of-syllabus) rows must NOT block a
    // later real answer from being stored.
    const sources = [...new Set(
      (parsed.references as { name?: string }[])
        .map((r) => r?.name?.trim())
        .filter((n): n is string => !!n)
    )].map((guest) => ({ guest }));

    let saved: { id: string; slug: string | null; created_at: string } | null = null;
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: dupeRows, error: dupeErr } = await supabase
        .from("qa_history")
        .select("id, slug, created_at")
        .eq("question", question.trim())
        .neq("short_answer", OUT_OF_SYLLABUS_MARKER)
        .gte("created_at", twoMinutesAgo)
        .limit(1);

      if (dupeErr) console.error("qa_history dedupe check error:", dupeErr.message);

      const dupe = dupeRows && dupeRows.length > 0 ? dupeRows[0] : null;

      if (!dupe) {
        const { data: historyRow, error: insertErr } = await supabase
          .from("qa_history")
          .insert({
            question: question.trim(),
            short_answer: parsed.short,
            long_answer: parsed.long,
            slug: makeSlug(question.trim()),
            sources,
          })
          .select("id, slug, created_at")
          .single();
        if (insertErr) console.error("qa_history insert error:", insertErr.message);
        saved = historyRow ?? null;
      } else {
        saved = dupe;
      }
    } catch (err) {
      console.error("qa_history save exception:", err);
    }

    // Log to Google Sheet — runs after the response is sent so the user
    // doesn't wait, but Vercel keeps the function alive until it lands.
    const city = decodeURIComponent(req.headers.get("x-vercel-ip-city") ?? "unknown");
    const country = req.headers.get("x-vercel-ip-country") ?? "";
    const location = country ? `${city}, ${country}` : city;
    after(async () => {
      try {
        await logToSheet(question.trim(), location);
      } catch (err) {
        console.error("Sheet log failed:", err);
      }
    });

    return NextResponse.json({
      ...parsed,
      id: saved?.id ?? null,
      slug: saved?.slug ?? null,
      created_at: saved?.created_at ?? new Date().toISOString(),
      sources,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

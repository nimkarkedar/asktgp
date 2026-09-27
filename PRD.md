# AskTGP — Product Requirements Document

**Product:** asktgp.com
**Owner:** Kedar Nimkar, Host of The Gyaan Project (TGP) podcast
**Status:** Draft v0.10, a living document
**Last updated:** 27 Sep 2026

> This PRD will change as the product is built. Record every decision change in the **Changelog** at the bottom so Claude in VS Code always works from the current version.

---

## 1. Summary

AskTGP is a single-purpose website. A visitor types any question about **design and art**, and gets two answers straight away:

- **Short answer:** 3–5 words at most. Shorter is better.
- **Long answer:** 150–200 words.

Both answers come **only** from 10 years of The Gyaan Project conversations with 300+ creative luminaries of India. The source is the transcripts and documents (PDF, TXT, DOCX) stored in Kedar's Google Drive folder. Nothing comes from the open internet or from the AI model's general knowledge.

Every question and answer is:
1. Saved to a **Google Sheet**.
2. Listed on a **public feed**, so visitors can see what others are asking.
3. Given its **own shareable URL**.

## 2. Why this exists

- Ten years of Indian design and art wisdom is currently locked inside long audio and long transcripts. AskTGP makes it searchable in seconds.
- It sends people back to the podcast. Every answer credits the guest(s) and links to their episodes.
- The public question feed shows what the creative community wants to know.

## 3. Goals and non-goals

### Goals (v1)
- G1. Answer design and art questions using only the TGP archive, with credit to the guest(s).
- G2. Give the answer back immediately.
- G3. Save every Q&A to a Google Sheet automatically.
- G4. Give every Q&A a permanent, shareable URL with a good social preview.
- G5. Provide a public, browsable feed of questions.
- G6. Say honestly when the archive does not cover a question, and never invent an answer.

### Non-goals (v1)
- User accounts or logins.
- Follow-up questions or chat-style conversation. Each question stands alone.
- Answers drawn from the web or the model's general knowledge.
- Audio or video playback on the site.
- Languages other than English (may come later; see Open Questions).

## 4. Users

| User | What they want |
|---|---|
| Design/art student | Fast, credible advice from people they admire |
| Working creative professional | Perspectives on craft, career, clients, pricing, process |
| TGP listener | To find which guest said what |
| Curious visitor from a shared link | To read one good answer, then ask their own question |
| Kedar (admin) | To see what people ask, fix bad answers, add new transcripts |

## 5. Core user flows

### 5.1 Ask a question
1. Visitor lands on asktgp.com and sees the ask box at the top and a wall of past questions below it (see Section 9).
2. They type a question and press Submit or Enter.
3. A new tile appears on the wall and expands into the answer panel.
4. The **short answer** appears first (e.g. "51% on foot.").
5. The **long answer** streams in below it (150–200 words).
6. The guest credit line ("Reference found in conversations with *Guest name*") appears.
7. The URL changes to the Q&A's own page (e.g. `asktgp.com/q/how-does-mumbai-travel-k3x9`).
8. Share buttons appear: copy link, WhatsApp, X, LinkedIn.

### 5.2 Question the archive doesn't cover
- Short answer: "Not in the archive yet."
- Long answer: a brief note that no TGP guest has discussed this yet, plus 2–3 related questions the archive *can* answer.
- The question is still saved and flagged as `unanswered`.

### 5.3 Question off-topic from design and art
- Politely redirect: "AskTGP only answers questions about design and art."
- Save it with the flag `off_topic`, but do not show it in the public feed.

### 5.4 Browse the public feed
- The feed is the **questions wall on the homepage**. There is no separate feed page in v1.
- Clicking any tile expands it into the full answer; Previous and Next move through the other answers.
- Later: filters by guest, by topic, and "most viewed".

### 5.5 Open a shared link
- `asktgp.com/q/{slug}` opens the homepage with that Q&A's panel already expanded, **served from storage**. The AI is not called again, so the answer never changes and costs nothing to reload.
- Closing the panel reveals the ask box and the wall, so the visitor can ask their own question.

## 6. Functional requirements

### 6.1 Answer engine (RAG: retrieval-augmented generation)

**How an answer is made:**
1. **Retrieve:** find the 8–15 most relevant transcript passages for the question (semantic search, optionally combined with keyword search).
2. **Generate:** send only those passages, plus a strict instruction prompt, to Claude. Claude writes the short answer, the long answer, and the list of sources used.
3. **Check:** if the retrieved passages are not relevant enough (similarity score below a set threshold), skip generation and return the "Not in the archive yet" response.

**Answer rules (put these in the system prompt):**
- R1. Use only the provided passages. If they don't answer the question, say so.
- R2. Short answer: at most 5 words. It should be a sharp, quotable takeaway, not a summary label.
- R3. Long answer: 150–200 words, in plain, warm English, written in the spirit of the conversations.
- R4. Never put words in a guest's mouth. Any direct quote must appear word-for-word in a retrieved passage.
- R5. When guests disagree, say so. That tension is valuable.
- R6. No invented facts, dates, or names.
- R7. Output as structured JSON: `{ short_answer, long_answer, sources: [{guest, episode_id}], status }`.

**Semantic cache (saves cost and builds the archive):** before generating, check whether a very similar question has already been answered (embedding similarity ≥ ~0.95). If so, return the existing Q&A page instead of generating a new one. The threshold should be tunable.

### 6.2 Knowledge base ingestion

- **Source:** one Google Drive folder, `tgp-transcripts-for-asktgp` (`1TW-EMW-39Ki8nSlgzd-fvUbHJbcdve6U`, owned by thegyaanproject@gmail.com), plus subfolders, of PDF, TXT, and DOCX files. This is the only source of truth for transcripts.
- **Episode manifest (important):** a separate Google Sheet, `episodes`, with one row per episode: `episode_id, guest_name(s), drive_file_id(s)`. File names alone are not reliable enough for accurate guest credit. Building this manifest is the first manual task.
- **Pipeline** (a script run from VS Code; later a scheduled job):
  1. List the files in the Drive folder through the Google Drive API.
  2. Extract the text (PDF, DOCX, and TXT each need a different parser).
  3. Clean it: strip timestamps and filler, and normalise speaker labels (Kedar / Guest).
  4. Split into chunks of about 500–800 tokens with some overlap, keeping each speaker turn together where possible.
  5. Attach metadata to every chunk: `episode_id, guest, speaker, position`.
  6. Create embeddings and store them in the vector database.
  7. Track each file's `modifiedTime` so re-runs only process new or changed files.
- **Scanned PDFs:** detect them (no extractable text) and log them for OCR later. Don't fail silently.

### 6.3 Storage

Two stores, for different jobs:

| Store | Role |
|---|---|
| **Primary database** (recommended: Supabase Postgres with pgvector) | Source of truth for Q&As, transcript chunks and embeddings, and view counts. Fast, reliable, and powers the site. |
| **Google Sheet** `asktgp_questions` | A mirror that Kedar can read, sort, and annotate. One row is appended per Q&A. |

**Why not use Google Sheets alone?** Sheets has API rate limits, is slow for page loads, and can't do vector search. It works well as a log and review tool, but not as the site's backend.

**Q&A record fields:**
`id, slug, question, short_answer, long_answer, sources (guest + episode ids), status (answered | unanswered | off_topic | hidden), created_at, view_count, model_used, retrieval_score, country (coarse, optional)`

**Sheet columns:** the same fields plus `public_url` and an empty `kedar_notes` column for manual review.

### 6.4 Unique URLs and sharing
- Format: `asktgp.com/q/{short-slug-from-question}-{4-6 char id}`.
- Pages are rendered on the server so they can be indexed by search engines.
- Every page gets an **auto-generated social preview image** (question + short answer + TGP branding) for WhatsApp, X, and LinkedIn.
- Links are permanent. If a Q&A is hidden, its URL shows a polite "This answer was removed" page, not a 404.

### 6.5 Public feed
- The homepage questions wall (Section 9.5): an infinite-scroll list of `answered` Q&As.
- `unanswered` ones are either shown publicly or kept private (see Open Questions).
- `off_topic` and `hidden` never appear.

### 6.6 Admin (v1: minimal)
- Moderation happens in the Google Sheet: setting `status = hidden` in the sheet hides the Q&A on the site (sync every few minutes, or via a simple password-protected admin page later).
- Command to re-run ingestion.
- Later: an admin page to edit an answer, merge duplicates, or pin favourites.

### 6.7 Safety and abuse
- Rate limit per IP (e.g. 10 questions per hour).
- Maximum question length of about 300 characters.
- A moderation check before publishing, so abusive or spammy questions never reach the public feed.
- Resistance to prompt injection: user text is treated only as a question, never as instructions.
- A daily spending cap on AI API use, with an alert.
- A notice under the input box: "Questions are public. Don't include personal information."

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Speed | Answers come back immediately. Exact timing targets to be decided once the first working version can be measured. |
| Cost | Target an average cost per new answer in the low single-digit US cents; the semantic cache should grow the share of free answers over time. |
| Mobile | Mobile first in design, build, and testing. See Section 9.0 for the rules and performance budget. |
| SEO | Server-rendered Q&A pages, sitemap, clean titles/descriptions. |
| Accessibility | Keyboard usable, good contrast, readable type (WCAG AA). |
| Privacy | No accounts or tracking cookies in v1. Privacy-friendly analytics only. |
| Reliability | If the AI or database is down, show a friendly error. Never show a half-made answer. |

## 8. Suggested tech stack

Chosen to be simple to build step by step with Claude in VS Code. Every item can be swapped out later.

| Layer | Suggestion | Notes |
|---|---|---|
| Framework | **Next.js** (App Router, TypeScript) | One codebase for pages and API routes |
| Hosting | **Vercel** | Free tier to start; connects to your domain easily |
| Database + vectors | **Supabase** (Postgres + pgvector) | Free tier is enough for 300+ transcripts |
| Embeddings | **Voyage AI** (or OpenAI embeddings) | Claude doesn't make embeddings itself; Voyage is Anthropic's recommended partner |
| Answer generation | **Claude API**, e.g. `claude-sonnet-5` for quality, `claude-haiku-4-5-20251001` for cost/speed | Test both on the same question set |
| Google integration | Google Drive API + Google Sheets API through a **service account** | Share the Drive folder and the Sheet with the service account's email |
| Rate limiting | Upstash Redis (or a Supabase table) | |
| Analytics | Plausible or Vercel Analytics | Privacy-friendly |
| Styling | Tailwind CSS | |

**Secrets** (in `.env.local`, never committed): `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `DRIVE_FOLDER_ID`, `SHEET_ID`.

## 9. Design direction

Reference mockups are in `/design-reference` (`home.pdf`, `expanded-answer.pdf`). When this section and the mockups disagree, this section wins.

### 9.0 Mobile first (non-negotiable)
- **Design and build every screen at 375px wide first.** Tablet and desktop are enhancements layered on top with `min-width` media queries. They are never where a screen starts.
- Most visitors will arrive from a link shared on WhatsApp or Instagram, on a phone, often on a slow connection.
- Breakpoints: base (0–639px), `sm` 640px, `lg` 1024px.
- Touch targets are at least 44×44px. Nothing depends on hover.
- The ask box's text is at least 16px so iOS doesn't zoom in when it's tapped.
- Respect safe-area insets (notch and home bar).
- Performance budget: homepage under 150 KB of JavaScript, Largest Contentful Paint under 2.5 s on a mid-range Android on 4G. Load the Libre Baskerville font with `font-display: swap` and subset it to Latin.
- Every feature is tested on a real phone before it's considered done.

### 9.1 Feel
- **Notion + Mailchimp.** Notion's calm, generous white space and its quiet, editorial restraint. Mailchimp's confident, slightly warm personality in the wordmark and copy. It should feel mature, minimal, and literary rather than "tech startup".
- **Black and white.** Colour is used only where it earns attention (see 9.3).
- The content is the decoration. There are no illustrations, gradients, shadows-on-everything, or emoji.

### 9.2 Typography
- **Libre Baskerville** (Google Fonts, variable weight 400–700) throughout: wordmark, UI, questions, and answers.
- **Exactly three type styles across the whole site**, at every screen size. Nothing else is allowed:

| Style | Size / line height | Weight | Used for |
|---|---|---|---|
| Body | 16 / 1.6 | Regular | About / Support links, short answer, long answer, tile text, input text, page copy |
| Heading | 16 / 1.5 | Semibold (600) | Question, "Short answer" / "Long answer" labels, page titles, Submit |
| Small | 12 / 1.4 | Regular | Nav, "Powered by" line, helper text, credit line, share row |

- Hierarchy comes from weight, colour (`--ink` vs `--ink-muted`) and spacing, not size. Long answer max width is about 65 characters.
- The long answer is left-aligned with real paragraph breaks. It should never be justified.

### 9.3 Colour tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page |
| `--ink` | `#111111` | All primary text |
| `--ink-muted` | `#6B6B6B` | Helper text, labels, date |
| `--tile` | `#D9D9D9` (to be refined; possibly lighter, e.g. `#EDEDED`) | Question tiles |
| `--line` | `#DDDDDD` | Input border |
| `--accent` | `#FF6900` | **Submit button only** (decided v0.6) |

Dark mode is out of scope for v1.

### 9.4 Homepage layout (`/`)
**Mobile (base), from top to bottom:**
1. **Header:** "About" and "Support" as small text links in the top corners. The "asktgp" wordmark is centred below them, with "Powered by <u>The Gyaan Project</u> Podcast" beneath it. The TGP link goes to the podcast.
2. **Ask box:** a full-width rounded text area with a 16px side margin and the placeholder "Ask any question on design and art". It grows as the visitor types (up to about 5 lines). A character counter appears near the 300-character limit.
3. **Submit:** a full-width pill button, at least 48px tall. The helper line "Questions are public. Don't include personal information." sits beneath it in small, muted type.
4. A generous vertical gap, then the **questions wall**.

**Desktop (`lg`):** "About", the centred wordmark, and "Support" sit on one line. The ask box is about 560px wide and centred. The Submit button sits to the left with the helper line beside it, as in the mockup. Enter submits the question; Shift+Enter adds a new line. On mobile, the Return key adds a new line and the button submits.

### 9.5 The questions wall
- Rounded grey tiles (radius about 16px), each showing one past question **truncated to 2 lines** with an ellipsis.
- **Mobile (base):** two columns of tiles with a 12px gap, where every other row is nudged half a tile to one side and bleeds off the screen edge. This keeps the "endless wall" feel from the mockup at phone size. If that test poorly on real phones, fall back to one column of full-width tiles.
- **Desktop (`lg`):** full brick layout. Tiles are about 265×110px, alternate rows are offset by half a tile, and tiles run off both edges of the screen.
- Each row drifts slowly from right to left in a seamless loop (about 12 s per tile width); alternate rows start half a tile along. The drift pauses while an answer is open and on hover (desktop), and is off for `prefers-reduced-motion`.
- Loads more tiles as you scroll (infinite scroll).
- Ordering is newest first by default (see Open Question 9).
- A tap gives an immediate pressed state (slightly darker). On desktop, hover darkens the tile slightly. There is no scale bounce.

### 9.6 Expanded answer view
Tapping a tile **animates it open**. On mobile (base), the tile grows into a **full-screen sheet**. On desktop (`lg`), it grows into a large centred panel and the wall fades behind it. This is a shared-element transition (in Next.js, Framer Motion's `layoutId` does this well). Closing reverses the animation back into the tile.

**Panel content, in order:**
1. Header (About / wordmark / Support) stays visible.
2. **Question** (Heading style).
3. Label "Short answer" (bold), then the short answer (regular).
4. Label "Long answer" (bold), then the 150–200 word answer (regular).
5. **Guest credit line:** "Reference found in conversations with <i>Guest name</i>". Guest names are in italics. When the answer draws on more than one transcript, the names are comma-separated, e.g. "Reference found in conversations with <i>Guest A</i>, <i>Guest B</i>". Plain text only, with no links. The names come from the episode manifest (Section 6.2) for the passages used to write the answer.
6. Share row: Copy link · WhatsApp · X · LinkedIn.
7. **Navigation:** `← PREVIOUS   × CLOSE   NEXT →` in small caps with letter-spacing, centred at the bottom. Previous and Next move through the wall in its current order without closing the panel.

**Behaviour:**
- Opening a tile updates the URL to `/q/{slug}` without a full page reload. Closing it returns the URL to `/`.
- Visiting `/q/{slug}` directly (a shared link) loads the homepage with that panel already open, rendered on the server for SEO and social previews.
- **Mobile (base):** the navigation bar (`← PREVIOUS × CLOSE NEXT →`) sticks to the bottom of the screen, above the safe area. Swipe left or right moves to the next or previous answer. Swipe down from the top closes the sheet. The phone's back button or back gesture also closes the sheet, because the URL was pushed to the browser history. Share uses the phone's native share sheet (`navigator.share`), falling back to the individual buttons.
- **Desktop (`lg`):** `Esc` closes the panel, and `←` / `→` move to the previous or next answer.
- Focus is trapped inside the open panel, and the page behind it doesn't scroll.

### 9.7 Asking a new question
1. After Submit, the button shows a subtle loading state (for example, three pulsing dots, with no spinner).
2. A **new tile appears at the top-left of the wall and immediately expands** into the panel.
3. The short answer appears first; the long answer streams in word by word beneath it.
4. The guest credits appear once the long answer has finished.
5. If the question was already answered (semantic cache), the existing Q&A opens instead, with a small note: "Someone asked this before."

### 9.8 Motion principles
- 250–350 ms, ease-out. Motion should feel calm and deliberate, never bouncy.
- Respect `prefers-reduced-motion`: use a simple fade instead of the tile expansion.

### 9.9 Voice of the copy
- Lowercase wordmark, sentence case everywhere else.
- Warm, brief, and a little literary. Examples: "Not in the archive yet.", "Someone asked this before.", "Ask any question on design and art".

## 10. Build plan (phases)

Build in small, testable steps. Each phase ends with something working.

| Phase | Outcome | Done when |
|---|---|---|
| **0. Setup** | Existing `mondo-wiki` repo renamed to `asktgp` and audited (keep / remove); Next.js app, `.env`, Supabase project, Google service account, domain | `localhost:3000` runs; old name gone from the code; Drive folder and Sheet are shared with the service account |
| **1. Episode manifest** | `episodes` sheet filled in for all transcripts | Every Drive file maps to an episode and a guest |
| **2. Ingestion** | Script that pulls Drive files → text → chunks → embeddings → Supabase | All transcripts indexed; scanned or failed files logged |
| **3. Answer engine (no UI)** | Script: question in, JSON answer out | 30-question test set gives grounded answers with correct credits; out-of-scope questions return "Not in the archive yet" |
| **4. Minimal website** | Header, ask box, and answer panel from Section 9, built mobile first | Works on a real phone first, then on desktop |
| **5. Storage + URLs** | Q&As saved to the database, mirrored to the Sheet, each with its own `/q/` URL | Shared link opens the saved answer with no new AI call |
| **6. Questions wall** | Tile wall on the homepage, expand/collapse animation, previous/next, swipe gestures | Smooth on a mid-range Android; back button closes the panel |
| **7. Safety** | Rate limits, moderation, cost cap, semantic cache | Spam test blocked; duplicate question returns the cached page |
| **8. Polish + launch** | Branding, social preview images, SEO, analytics | Live on asktgp.com |
| **Later** | Guest pages, topic filters, Hindi/Marathi, voice input, weekly newsletter of top questions | |

## 11. Quality and evaluation

- Keep a **test set** of 30–50 real questions with notes on which guests *should* be cited. Re-run it after every prompt or retrieval change.
- Measure on each run:
  - **Grounded:** every claim is supported by a retrieved passage.
  - **Credited correctly:** the named guests actually said it.
  - **Length rules met:** short ≤ 5 words; long 150–200 words.
  - **Honest refusal:** out-of-archive questions are declined.
- Kedar spot-checks 10 live answers a week through the Sheet's `kedar_notes` column.

## 12. Success metrics

- Questions asked per week.
- Share rate: the percentage of Q&A pages that receive visits from a shared link.
- Unanswered rate.
- Average cost per question, and cache hit rate.
- Kedar's quality score from weekly spot-checks.

## 13. Risks

| Risk | Mitigation |
|---|---|
| The AI misquotes or misattributes a guest | Strict prompt; only allow quotes that appear word-for-word in the passages; an attribution check; easy hide/correct from the Sheet |
| Guests' consent for this new use of their words | Review the original recording terms; consider notifying guests; offer an opt-out per guest (a `excluded` flag in the manifest) |
| Offensive or spam questions in the public feed | Moderation before publishing; rate limits; hide status |
| AI costs spike after going viral | Semantic cache, daily spending cap, a cheaper model as fallback |
| Transcript quality varies (auto-transcripts, scans) | Cleaning step; OCR queue; per-file quality notes in the manifest |
| Short answers become vague slogans | Test-set review; prompt examples of good and bad short answers |

## 14. Open questions

1. Should `unanswered` questions be shown publicly or kept private?
2. *Resolved (v0.5):* answers show only the guest credit line (Section 9.6), with no passages or episode links.
3. *No longer needed (v0.5):* episode links are not shown.
4. Could a later version include Hindi / Marathi questions and answers?
5. Should visitors be able to upvote questions or answers?
6. Should Kedar be able to write his own "host's note" on selected answers?
7. Is the Drive folder complete, or will transcripts keep being added (which would mean scheduled re-sync)?
8. *Resolved (v0.6):* the Submit button is `#FF6900`, the one accent colour.
9. Wall order: newest first, a random shuffle (the mockup says "random questions"), or most viewed?
10. Voice of the long answer: the mockup's example reads in the guest's own first person ("I am quoting this from a study…"). Should long answers speak *as* the guest, or *about* the guest ("As [Guest] explains…")? Speaking about the guest is safer against misattribution.

## 15. Changelog

| Date | Version | Change |
|---|---|---|
| 27 Sep 2026 | 0.1 | First draft |
| 27 Sep 2026 | 0.2 | Design direction written from the reference mockups (Notion + Mailchimp feel, black and white, Libre Baskerville). Questions wall moved onto the homepage; tiles expand into the answer panel. Everything made mobile first. Build starts from the existing mondo-wiki repo, renamed to asktgp. |
| 27 Sep 2026 | 0.3 | Removed the idea of using questions as a source of future episode ideas; it was never part of the brief. |
| 27 Sep 2026 | 0.4 | Removed the invented 3-second target; the requirement is simply that answers come back immediately. |
| 27 Sep 2026 | 0.5 | Guest credit set to one line under the answer: "Reference found in conversations with *Guest name*", italic names, comma-separated when several transcripts are used. Episode links removed everywhere; manifest reduced to episode, guest and file. |
| 27 Sep 2026 | 0.6 | Submit button colour set to `#FF6900` (Open Question 8 resolved). Helper line beside Submit replaced with "Questions are public. Don't include personal information." Repo renamed from `mondo-wiki` to `asktgp` on GitHub; it is the source of truth for code, this PRD and the mockups (`/design-reference`). The Explore page is retired in favour of the homepage wall; `/explore` redirects to `/`. Empty placeholder tiles fill the wall (at least six rows) so it never looks bare. |
| 27 Sep 2026 | 0.7 | Type reduced to three styles site-wide: 16 Regular (body), 16 Semibold (headings, incl. wordmark, question and short answer), 12 Regular (small). Libre Baskerville loaded as its variable font. Wall rows now drift slowly right to left. |
| 27 Sep 2026 | 0.8 | The single source of truth for transcripts is the Drive folder `tgp-transcripts-for-asktgp` (`1TW-EMW-39Ki8nSlgzd-fvUbHJbcdve6U`): clean, labelled files. No other transcript folder is used. |
| 27 Sep 2026 | 0.9 | Answer panel: "Short answer" / "Long answer" labels are bold (Heading style); both answers are regular (Body). The "Asked {date}, {time} IST" line is removed from the panel (`created_at` is still stored). |
| 27 Sep 2026 | 0.10 | Header uses the new asktgp logo (SVG) at 33px tall instead of a text wordmark. About and Support links are 16px (Body). |

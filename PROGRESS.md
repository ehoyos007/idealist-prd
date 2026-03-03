# Idealist PRD - Progress Log

## Session: 2026-03-02 (Session 18 — Vision System Deploy & Smoke Test)

**Summary:** Deployed Vision System end-to-end — migration, 6 edge functions, API smoke test passed, committed and pushed to GitHub/Vercel.

### What was done

1. **Renamed migration** `20260302000000_vision_columns.sql` → `20260307000000_vision_columns.sql` (timestamp conflict with initial schema)
2. **Pushed migration** via `supabase db push` — added `vision_md`, `eval_md`, `vision_transcript` columns to `prd_projects`
3. **Deployed `synthesize-vision`** edge function (new) to Supabase
4. **Redeployed 5 functions** sharing updated `prompts.ts`: `synthesize-project`, `fetch-github-repo`, `retrieve-context`, `chunk-and-index`, `parse-file-context`
5. **API smoke test** — `synthesize-vision` returned HTTP 200 with full VISION.md (5 sections: Core Identity, Decision Framework, Constraint Architecture, Acceptance Criteria, Decomposition Patterns) + EVAL.md (checklist, interview questions, session log template)
6. **Build verified** — zero errors
7. **Committed and pushed** 15 files (+634/-37 lines) to GitHub main (`db1ee89`) — Vercel auto-redeploy triggered

### What remains (manual, requires mic)
- Full E2E: PRD session → Go Deeper → vision session → Vision tab → ZIP export
- Test text chat, pause/resume, auto-save during voice sessions

---

## Session: 2026-03-02 (Session 17 — Vision System Integration, Route C Two-Phase)

**Summary:** Implemented full Vision System integration — voice-first vision coaching sessions that produce VISION.md + EVAL.md alongside existing PRD, with Go Deeper button, Vision tab, enhanced ZIP export, and session persistence.

### What was done

**Backend (4 items)**
1. Created DB migration `20260302000000_vision_columns.sql` — adds `vision_md`, `eval_md`, `vision_transcript` to `prd_projects`
2. Added 5 new exports to `supabase/functions/_shared/prompts.ts`: `VISION_AGENT_PROMPT`, `VISION_AGENT_FIRST_MESSAGE`, `buildVisionContextPrompt()`, `buildVisionFirstMessage()`, `VISION_SYNTHESIS_PROMPT`
3. Created `supabase/functions/synthesize-vision/index.ts` — edge function following synthesize-project pattern (Gemini 2.5 Pro via OpenRouter, `create_vision_docs` tool call)
4. Added `[functions.synthesize-vision]` to `supabase/config.toml`

**Frontend (10 items)**
5. Extended `ProjectCard` type with `visionMd?`, `evalMd?`, `visionTranscript?` fields
6. Updated `projectTransformers.ts` with DB ↔ TS mappings for vision columns
7. Added `buildVisionContextPrompt()` + `mode` parameter to `useElevenLabsConversation.ts` `startConversation()`
8. Added `sessionMode`/`visionTargetProjectId` state + `handleStartVisionSession`/`handleVisionComplete` to `Index.tsx`
9. Updated `SessionView.tsx` — vision mode indicator badge, button text, synthesis call to `synthesize-vision`, vision metadata for pause/auto-save
10. Updated `ProjectCardFull.tsx` — "Go Deeper: Vision Session" button (Eye icon, violet), Vision tab with VISION.md + EVAL.md display, "Redo Vision" variant
11. Pass-through `onStartVisionSession` in `ProjectDetailView.tsx`
12. Vision draft labels in `LibraryView.tsx` (violet badge + project name)
13. Enhanced `generateProjectZip.ts` — conditionally adds VISION.md + EVAL.md, enhances CLAUDE.md with Vision-Guided Development instructions
14. Session persistence already supported `extraMetadata` — wired vision metadata through

**Verification:** `npm run build` passes with zero errors (479 lines added, 37 removed across 14 files).

### Not yet done
- Deploy migration to Supabase
- Deploy `synthesize-vision` edge function
- End-to-end testing of full vision flow
- Redeploy updated shared `prompts.ts` (used by synthesize-vision)

---

## Session: 2026-03-02 (Session 16 — Deploy & Test GitHub Repo + Cost Logging)

**Summary:** Deployed Connect GitHub Repo feature end-to-end, fixed deep indexing bug (session_id NOT NULL), tested all 3 modes (summary/deep/auto), added estimated_cost to usage logging.

### What was done

**Deployment (4 steps)**
1. Set `GITHUB_TOKEN` secret (classic PAT with `public_repo` scope)
2. Set `FHE_SUPABASE_URL` + `FHE_SUPABASE_KEY` secrets for cross-project index
3. Pushed migration `20260306000000_add_repo_source.sql` — `source_type` + `repo_name` columns
4. Deployed `fetch-github-repo` edge function with all shared modules

**Bug fix — deep indexing failure**
5. Root cause: `prd_document_chunks.session_id` was `NOT NULL` but repo chunks have no session
6. Created migration `20260306100000_allow_null_session_id.sql` — `ALTER COLUMN session_id DROP NOT NULL`
7. Deep indexing works after fix: 9 files → 58 chunks with voyage-code-3 embeddings

**Testing (3 modes verified)**
8. **Summary mode** (`sindresorhus/is`): AI-generated summary of tech stack/architecture, 0 chunks, 15-file tree
9. **Deep indexing** (`sindresorhus/is`): 9 files processed, 58 chunks with embeddings, all stored with `source_type: "github_repo"` and `repo_name`
10. **Auto-classification** (`tj/commander.js` + user context "build a CLI tool"): AI classified as "deep", 189 files processed, 282 chunks created
11. Test data cleaned up after verification

**Cost estimation**
12. Added `MODEL_PRICING` map + `estimateCost()` to `_shared/usage.ts` covering Gemini Pro, Flash Lite, Voyage 3 Large, voyage-code-3, rerank-2
13. Wired into `logOpenRouterUsage()` and `logVoyageUsage()`
14. Verified: usage log now shows `estimated_cost: $0.000203` for Flash Lite call (was null before)
15. Redeployed all 5 edge functions that use the shared usage module

### Build verification
- `tsc --noEmit` — 0 errors
- All 5 edge functions deployed clean

### What remains (all require mic input)
- Test text chat during voice session
- Test pause/resume flow
- Test auto-save (60s interval)
- Full E2E: voice → PRD card → zip export
- Remix voice session

---

## Session: 2026-03-02 (Session 15 — Connect GitHub Repo Feature)

**Summary:** Implemented full "Connect GitHub Repo" feature — edge function, shared modules, frontend components, and database migration. Users can now connect a GitHub repo during brainstorming for AI-aware codebase context.

### What was done

**Backend (5 new files)**
1. **Database migration** (`20260306000000_add_repo_source.sql`): Added `source_type` (file|github_repo) and `repo_name` columns to `prd_document_chunks` + `prd_project_documents`, with partial index on `repo_name`
2. **Voyage code module** (`_shared/voyage-code.ts`): Deno-adapted `voyage-code-3` embeddings (1024-dim) with `embedCode()`, `embedQuery()`, `rerankDocuments()` — separate from existing `voyage-3-large` document embeddings
3. **Code chunker** (`_shared/code-chunker.ts`): File-level + function/class extraction for TS/JS (regex + brace-depth), Python (indentation), Rust, Go. Filters out node_modules, lock files, .d.ts, etc.
4. **Repo prompts** (added to `_shared/prompts.ts`): `REPO_DEPTH_CLASSIFICATION_PROMPT` (summary vs deep) and `REPO_SUMMARY_PROMPT` (voice-friendly codebase overview)
5. **Edge function** (`fetch-github-repo/index.ts`): Parses owner/repo from shorthand or URL, checks FHE Supabase for pre-indexed repos, fetches tree via GitHub API, auto-classifies depth via Gemini Flash, generates summary or does full deep indexing (chunk + embed + store in `prd_document_chunks`)

**Frontend (4 modified + 1 new)**
6. **Types** (`project.ts`): Added `ConnectedRepo`, `RepoDepth`, `RepoFetchResult` types; extended `ConversationMessage` with `connectedRepo` field
7. **RepoConnectButton** (new component): Dialog with repo URL input, depth selector (Auto/Summary/Deep), optional context textarea, progress states (fetching→analyzing→indexing→ready)
8. **Hook** (`useElevenLabsConversation.ts`): Added `sendRepoContext()` — adds message + injects summary via `sendContextualUpdate`; also updated `getTranscript()` to include repo info
9. **SessionView**: Integrated `RepoConnectButton` next to `FileUploadButton` with `handleRepoConnected` handler
10. **ConversationView**: Added GitHub icon + repo name badge + depth tag + file count rendering for repo messages

### Architecture: Hybrid Query + Index
- If a repo is already indexed in FHE's Supabase → query `match_code_embeddings` directly (zero re-indexing)
- If not → index fresh using adapted FHE pipeline (voyage-code-3 embeddings stored in Idealist's `prd_document_chunks`)
- Auto-classifies depth (summary vs deep) using Gemini Flash based on README + tree + user context

### Build verification
- `tsc --noEmit` — 0 errors
- `vite build` — clean (2191 modules, 4.58s)

### What remains for deployment
- Set Supabase secrets: `GITHUB_TOKEN`, `FHE_SUPABASE_URL`, `FHE_SUPABASE_KEY`
- Run `supabase db push` for new migration
- Deploy edge function: `supabase functions deploy fetch-github-repo`
- Test with public repo (e.g. `facebook/react`) in summary mode
- Test deep indexing with a small repo
- Test cross-project query with a repo already indexed in FHE

---

## Session: 2026-03-02 (Session 14 — E2E Testing)

**Summary:** Ran comprehensive E2E test suite for Session 12/13 features — sparse transcript handling, scoring rubric calibration, usage logging, and browser UI verification. All tests pass.

### What was done

**API Tests (4/4 PASS)**
1. **Sparse transcript**: 22-word todo app transcript → `[Needs Discussion]` in 5/9 PRD fields (vision, targetUser, techStack, architecture, successMetrics). Scores appropriately low: C=1 I=3 U=2 Cf=4.
2. **Scoring rubric — rich transcript**: Complex B2B SaaS (supply chain, ML, beta customers) → C=7 I=9 U=8 Cf=9. All within expected 7-10 range per rubric anchors.
3. **Scoring rubric — medium transcript**: Recipe sharing app → C=3 I=5 U=2 Cf=6. Moderate scores, no sparse markers.
4. **Rubric alignment check**: Sparse ≤ Medium ≤ Rich confirmed across all 4 dimensions (complexity, impact, urgency, confidence).

**Usage Logging (PASS with minor gap)**
5. **prd_usage_logs**: 5 rows recorded from test API calls — function_name, model (`google/gemini-2.5-pro-preview-06-05`), input_tokens (988-1539), output_tokens (1880-2793) all captured.
6. **Minor gap**: `estimated_cost` is null — `logOpenRouterUsage` extracts tokens but never computes cost. Tokens are the important part; cost calculation is a polish item.

**Browser/UI Tests (6/6 PASS)**
7. **Home page**: Loads with "3 projects in your library", CTA works.
8. **Library view**: 3 projects with tags, scores, search, grid/list toggle.
9. **Draft Sessions**: Correctly absent when `prd_sessions` table is empty.
10. **Session view (pre-connect)**: Cancel, Start Talking, Mute visible. ChatInput and Pause correctly hidden (gated on `status === 'connected'` in SessionView.tsx lines 381, 451).
11. **Project detail**: Full PRD renders — scores grid, Document/Video Preview tabs, all 8 action buttons, user stories.
12. **Console**: Zero errors on production.

### What remains (all require mic input)
- Text chat during voice session
- Pause/resume flow
- Auto-save (60s interval)
- Full E2E: voice → PRD card → zip export
- Remix voice session

---

## Session: 2026-03-02 (Session 13 — Full Deployment)

**Summary:** Deployed all Session 12 work (AI improvements, text chat, pause/resume) to production — migrations, edge functions, secrets, GitHub push, Vercel redeploy, smoke test passed.

### What was done

1. **Pushed 3 migrations** via `supabase db push`: `prd_usage_logs`, `update_match_threshold`, `prd_sessions`
2. **Fixed `_shared/prompts.ts`** — 22 escaped backticks (`\``) and 22 escaped dollar signs in template literals were corrupting the file. Fixed with byte-level replacement before deploying.
3. **Deployed all 6 edge functions** with `_shared/` imports (cors, auth, prompts, usage modules)
4. **Set `IDEALIST_API_SECRET`** in Supabase secrets (`eefb7d180f6f607e1a532bfad023080cee465dc724597104050f17658365331a`)
5. **Committed and pushed** 27 files (+1494/-430 lines) to GitHub main branch
6. **Set `VITE_IDEALIST_API_SECRET`** in Vercel for production + preview environments
7. **Triggered production redeploy** to pick up new env var (build: 2187 modules, 8.22s)
8. **Added `.vercel/` to `.gitignore`**
9. **Smoke tested** at https://idealist-prd.vercel.app:
   - Home page loads with "3 projects in your library"
   - Library shows all 3 project cards with tags and scores
   - Project detail view renders full PRD (scores grid, Document/Video tabs, all sections)
   - No console errors
10. **Verified auth enforcement**: requests without `x-api-key` return 401

### What remains
- Manual voice tests (text chat, pause/resume, sparse transcript) — require mic input
- Check `prd_usage_logs` table after running voice sessions
- Full E2E: voice → PRD card → zip export

---

## Session: 2026-03-02 (Session 12 — AI Improvements + Text Chat + Pause/Resume)

**Summary:** Implemented 10 AI improvements (security, quality, robustness, polish) and 2 new features (text chat input, pause/resume sessions) across 5 phases. 19 files created/modified, 3 new migrations.

### What was done

**Phase 1 — Foundation (A9 + A1)**
- Created `supabase/functions/_shared/cors.ts` — shared CORS headers + `jsonResponse`/`errorResponse`/`corsResponse` helpers
- Created `supabase/functions/_shared/auth.ts` — `validateApiKey()` checking `x-api-key` header against `IDEALIST_API_SECRET` env var (fails open in dev)
- Created `supabase/functions/_shared/prompts.ts` — all 10 centralized prompts (voice agent, remix, synthesis with rubric, keyword extraction, query keywords, image parsing, PDF parsing, generic file parsing, query expansion, sparse transcript warning)
- Created `src/lib/supabaseHelpers.ts` — `invokeFunction()` wrapper attaching API key header from `VITE_IDEALIST_API_SECRET`
- Updated all 6 edge functions to use shared imports (`cors.ts`, `auth.ts`, `prompts.ts`) + auth check at top of handler
- Replaced all frontend `supabase.functions.invoke()` calls with `invokeFunction()` wrapper (in `useElevenLabsConversation.ts`, `SessionView.tsx`, `FileUploadButton.tsx`, `ProjectCardFull.tsx`)
- Added `VITE_IDEALIST_API_SECRET` to `.env`
- Fixed stale `@/types/idea` imports → `@/types/project` in `ConversationView.tsx` and `FileUploadButton.tsx`

**Phase 2 — AI Quality (A2 + A3 + A4 + A7)**
- A2: Enhanced voice agent prompt with 8-section tracking, wrap-up signal after 6+ sections, vague-answer handling, expertise calibration
- A2: `elevenlabs-token` now ALWAYS passes `overrideConfig` with prompt (not just remix mode) — prompts are version-controlled in code
- A3: Added calibrated scoring rubric to synthesis prompt with concrete anchors (Complexity: 1-2 static site → 9-10 novel research; Impact: 1-2 narrow → 9-10 industry-transforming; Urgency: 1-2 evergreen → 9-10 window closing; Confidence: 1-2 assumptions → 9-10 proven traction)
- A4: Set `temperature: 0.4` on OpenRouter synthesis API call
- A7: Server-side transcript validation (word count + message count) — appends sparse warning instructing "[Needs Discussion]" for sparse sections instead of hallucinating
- A7: Improved client-side check in `SessionView` — warns about short conversations while still allowing generation

**Phase 3 — Robustness & RAG (A5 + A6 + A8 + A10)**
- A5: Created `20260304000000_add_usage_logs.sql` migration with `prd_usage_logs` table (function_name, model, provider, tokens, estimated_cost, session_id, metadata)
- A5: Created `supabase/functions/_shared/usage.ts` — fire-and-forget `logUsage()`, `logOpenRouterUsage()`, `logVoyageUsage()` helpers
- A5: Added logging calls to `synthesize-project`, `parse-file-context`, `chunk-and-index`, `retrieve-context`
- A6: Reduced chunk size 500→300 words, increased overlap 50→75 words
- A6: Added chunk metadata enrichment: `[Source: {fileName} | Section {i}/{total}]` prepended to each chunk
- A6: Raised similarity threshold 0.3→0.4 (in edge function + migration `20260304100000_update_match_threshold.sql`)
- A8: Enriched image parsing prompt (7 categories: text, diagrams, UI, charts, wireframes, architecture, other)
- A8: Enriched PDF parsing prompt (6 categories: structure, content, tables, figures, metadata, actionable items)
- A10: Added `expandQuery()` to `retrieve-context` — uses Gemini Flash Lite to generate 2-3 alternative phrasings, embeds all variants, deduplicates by chunk ID (keeps highest similarity), reranks merged set

**Phase 4 — Text Chat Input (B1)**
- Added `source?: 'voice' | 'text'` field to `ConversationMessage` type
- Created `src/components/ChatInput.tsx` — input field + send button, Enter to send, monospace font, "Type a message, URL, or code snippet..." placeholder
- Added `sendTextMessage()` to `useElevenLabsConversation` — injects via `sendContextualUpdate()` with acknowledgment framing, triggers RAG for substantial text
- Updated `ConversationView.tsx` — "typed" badge with keyboard icon on text-sourced messages
- Updated `getTranscript()` — tags typed messages as `User (typed): ...`
- `ChatInput` visible only when `status === 'connected'`

**Phase 5 — Pause/Resume Sessions (B2)**
- Created `20260305000000_add_prd_sessions.sql` migration — `prd_sessions` table (id, status, messages JSONB, transcript, metadata JSONB, timestamps, project_id FK, RLS, realtime, auto-updating trigger)
- Created `src/hooks/useSessionPersistence.ts` — `saveSession()`, `loadSession()`, `fetchPausedSessions()`, `deleteSession()`, `startAutoSave()` (every 60s), `stopAutoSave()`
- Added `resumeConversation()` to `useElevenLabsConversation` — restores messages, reconnects to ElevenLabs, injects prior transcript via `sendContextualUpdate` with resume framing
- Updated `SessionView.tsx` — Pause button (next to End & Generate), auto-save lifecycle, resume-on-mount with `resumeSessionId` prop, loading indicator for resume
- Updated `LibraryView.tsx` — "Draft Sessions" section above projects grid with `DraftCard` component (draft badge, message/word count, relative time, resume + delete buttons, remix source name)
- Updated `Index.tsx` — `resumeSessionId` state, `handleResumeDraft()`, `handleSessionPause()`, `handleDeleteDraft()`, fetches paused sessions on library navigation

### Build verification
- `tsc --noEmit` — 0 errors
- `vite build` — clean (2187 modules, 4.20s)

### New files created (9)
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/prompts.ts`
- `supabase/functions/_shared/usage.ts`
- `src/lib/supabaseHelpers.ts`
- `src/components/ChatInput.tsx`
- `src/hooks/useSessionPersistence.ts`
- `supabase/migrations/20260304000000_add_usage_logs.sql`
- `supabase/migrations/20260304100000_update_match_threshold.sql`
- `supabase/migrations/20260305000000_add_prd_sessions.sql`

### What remains
- Deploy edge functions: `supabase functions deploy`
- Push new migrations: `supabase db push`
- Set `IDEALIST_API_SECRET` in Supabase secrets and `VITE_IDEALIST_API_SECRET` in Vercel env vars
- Deploy frontend to Vercel (auto on push)
- Manual testing: voice session with text chat, pause/resume flow, scoring rubric alignment, sparse transcript handling

---

## Session: 2026-03-02 (Session 11 — Transcript Recovery & Draft Safety Net)

**Summary:** Built transcript recovery edge function and implemented draft-save safety net to prevent future transcript loss when synthesis fails.

### What was done

**Part 1 — Recovery Edge Function**
- **Created** `supabase/functions/recover-transcript/index.ts` — temporary edge function that lists recent ElevenLabs conversations for the agent, fetches full transcript for the most recent (or specified) conversation, and returns formatted transcript matching `getTranscript()` format (`User: ...\n\nAI: ...`)
- **Updated** `supabase/config.toml` with `[functions.recover-transcript]` entry
- Supports optional `{ conversationId }` body param to target a specific conversation; defaults to most recent

**Part 2 — Prevent Future Transcript Loss (5 files modified)**
- **`useProjectsStorage.ts`**: Added `saveDraftProject(id, transcript)` — inserts a minimal DB row (`project_name: 'Generating...'`, transcript, default scores) before synthesis. Non-fatal: logs warning on failure, never throws.
- **`SessionView.tsx`**: Moved `projectId = crypto.randomUUID()` before synthesis call. Now calls `saveDraftProject(projectId, transcript)` before `synthesize-project`. On failure: shows "Your transcript has been saved. You can retry from your library." toast and navigates to draft project view via `onDraftSaved` prop.
- **`Index.tsx`**: Wired `saveDraftProject` and new `handleDraftSaved` handler (navigates to project detail view) to `<SessionView>`.
- **`ProjectCardFull.tsx`**: Added yellow "Draft — Generation incomplete" banner with **Retry Generation** button for draft projects (`projectName === 'Generating...'` && `transcript` exists). Calls `synthesize-project` with saved transcript, updates project on success via `onSave()`.
- **`ProjectCardPreview.tsx`**: Shows "Draft" badge and "Draft Project" title on preview cards for incomplete projects.

### Build verification
- `tsc --noEmit` — 0 errors
- `vite build` — clean (2184 modules, 3.96s)

**Part 3 — Recovery Execution**
- Deployed `recover-transcript` edge function, invoked it — retrieved full 22-message transcript from ElevenLabs
- Called `synthesize-project` with recovered transcript — generated **"YouTube Content Analyzer"** PRD card (scores: complexity 4, impact 8, urgency 6, confidence 9)
- Inserted project into `prd_projects` (id: `44f80edd-a22b-41e5-8509-966e3e7516cc`)
- Cleaned up: removed `recover-transcript/` directory, config.toml entry, and deleted function from Supabase remote

### What remains
- Deploy frontend changes to Vercel (auto on push)
- Test safety net: start voice session, interrupt synthesis, confirm draft row + retry button works

---

## Session: 2026-03-02 (Session 10 — Realtime Bug Fix)

**Summary:** Fixed Supabase realtime subscriptions not delivering events. Root cause: missing `REPLICA IDENTITY FULL` on `prd_projects` table.

### What was done
- **Diagnosed root cause**: Table was in `supabase_realtime` publication but lacked `REPLICA IDENTITY FULL`, preventing the realtime service from broadcasting change events.
- **Migration created**: `20260303100000_fix_realtime_replication.sql` — sets `REPLICA IDENTITY FULL` and idempotently re-adds table to publication.
- **Pushed to Supabase**: `supabase db push` applied successfully.
- **Verified fix**: Node.js test script subscribed to realtime channel, inserted a row, and confirmed INSERT event received in <1s. Test row cleaned up.

### Bug resolution
- `REPLICA IDENTITY FULL` was the missing piece — without it, PostgreSQL's logical replication doesn't emit the WAL records that Supabase Realtime needs to broadcast `postgres_changes` events.

---

## Session: 2026-03-02 (Session 9 — E2E Integration Testing)

**Summary:** Ran comprehensive integration test suite across all APIs and UI flows. 10/11 tests passed. Found one bug: Supabase realtime subscriptions not delivering events to browser.

### What was done

**Phase 1 — API Tests (4/4 PASS)**
- **1A. synthesize-project**: POST with multi-turn transcript → full ProjectCard returned ("AI Inventory Manager", 5 tags, 4 user stories, scores 4/9/7/8). HTTP 200.
- **1B. parse-file-context (PDF)**: POST base64-encoded PDF → `success: true`, Gemini extracted "Business Plan: AI-powered SaaS for team productivity". HTTP 200.
- **1C. parse-file-context (Image)**: POST base64-encoded 1x1 PNG → `success: true`, Gemini described image content with creative interpretations. HTTP 200.
- **1D. RAG round-trip**: chunk-and-index stored 1 chunk with 12 keywords + 1024-dim Voyage embedding → retrieve-context returned match via `retrievalMethod: "vector"` → cleanup successful. All HTTP 200/204.

**Phase 2 — Browser Tests (2.5/3 — 1 bug found)**
- **2A. Realtime sync**: FAIL. INSERT (201), PATCH (200), DELETE (204) all confirmed at API level. But neither tab received realtime events — required page refresh to see changes. Subscription code in `useProjectsStorage.ts` is correct; likely needs Supabase Dashboard > Database > Replication enablement for `prd_projects`.
- **2B. Export buttons**: PASS. All 4 export buttons work: Copy ("Copied!" toast), Download .md ("Downloaded!" toast), PDF ("PDF Downloaded!" toast), Zip ("Project Kit Downloaded!" toast). Zip generates CONTEXT.md, TASKS.md, PLAN.md, CLAUDE.md as specified.
- **2C. Remix UI flow**: PASS. Sparkles button present, SessionView loads with "Remixing: Satori to PRD Automation Pipeline" badge, button says "Start Remixing", Cancel returns to home. `elevenlabs-token` with `projectContext` returns signed wss:// URL + `overrideConfig` with remix prompt.

**Phase 3 — Voyage Fallback (PASS)**
- Unset `VOYAGE_API_KEY` → chunk-and-index: `embedding=null`, 10 keywords populated → retrieve-context: `retrievalMethod: "keyword"` confirmed → Key restored.

### Bug found
- **Supabase Realtime**: Events not delivered to browser. All CRUD operations work at REST API level, but `postgres_changes` subscription in `useProjectsStorage.ts` doesn't receive INSERT/UPDATE/DELETE events. Root cause likely: table not enabled in Supabase Dashboard Replication settings (publication SQL exists but Dashboard toggle may be needed).

### What remains (manual, requires mic)
- Full E2E: voice → PRD card → zip export
- Remix voice session: existing project → Remix → speak → new card with `remixedFromId`

---

## Session: 2026-03-02 (Session 8 — Markdown Stripping, Remotion Studio & Mobile Testing)

**Summary:** Fixed raw markdown rendering in video scenes, verified Remotion Studio standalone, tested mobile responsiveness on production. Deployed and pushed.

### What was done
- **Strip markdown from video scenes**: Created `src/remotion/lib/text.ts` with `stripMarkdown()` helper (removes `**bold**`, `*italic*`, `## headings`, list prefixes, `` `code` ``). Applied to all 4 parsers (`parseFeatures`, `parseMetrics`, `parseTechItems`, `parseSprintItems`) and 2 raw-text renders (`VisionScene` vision/problemStatement, `TechStackScene` architecture). Build: 2184 modules, 0 errors.
- **Remotion Studio standalone**: `npm run remotion:studio` starts and builds in 2.3s. Scrubbed through all 9 scenes frame-by-frame via browser automation — all render correctly with sample data at 01:21.00 / 30fps. Warnings: zod 3.x vs required 4.x, duplicate lockfiles (non-blocking).
- **Mobile responsiveness** (390x844 iPhone 14 Pro viewport on https://idealist-prd.vercel.app):
  - Home page: hero wraps, CTA centered, 3-step cards stack vertically
  - Library: search bar, grid/list toggle, project card with tags all fit
  - Project detail: 2x2 scores grid, Document/Video Preview tabs tappable
  - Video Preview: Remotion Player scales to container width, controls visible (play, volume, 0:00/1:21, fullscreen, scrub bar)
- **Deployed** to Vercel production, committed and pushed to GitHub

### Known issues (non-blocking)
- Remotion zod version mismatch (installed 3.25.76, wants 4.3.6) — no runtime impact
- Duplicate lockfiles (package-lock.json + bun.lockb)

### Where we left off
Remaining tasks in TASKS.md To Do section:
- Test remix flow with ElevenLabs engine
- Test realtime sync on prd_projects table
- Test file upload (PDF/image) with parse-file-context
- Test Voyage fallback (keyword-only mode)
- Full E2E: voice session → PRD card → zip export

---

## Session: 2026-03-02 (Session 7 — Vercel Deploy & E2E Testing)

**Summary:** Deployed to Vercel and verified Remotion video preview end-to-end in production with real project data. All 9 scenes render, theme toggle works, no regressions.

### What was done
- **Vercel deployment**: Created `idealist-prd` project on Vercel (enzo-hoyos-projects scope). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` env vars for production + preview. Added `vercel.json` with Vite framework config and SPA rewrites. Deployed to https://idealist-prd.vercel.app
- **E2E browser testing** (via Chrome automation on production URL):
  - Home page loads, shows "1 project in your library"
  - Library view shows "Satori to PRD Automation Pipeline" project card
  - Project detail view opens with header, scores grid, Document/Video Preview tabs
  - **Document tab**: All PRD sections render correctly — no regressions from tab addition
  - **Video Preview tab**: Remotion Player loads with controls (play, volume, scrub, fullscreen)
  - **Duration**: 81.0s (1:21) at 30fps — dynamic calculation working with real data
  - **Scenes verified**: UserStories (3 animated cards with real personas/goals/benefits), VisionScene (two-column typewriter with divider), TechStackScene (pills + architecture), MetricsScene (5 colored animated bars with real KPIs), ScoreRadar (SVG diamond chart)
  - **Dark mode**: Black background, white text, colored chart accents
  - **Light mode**: White background, black text, light chart palette — confirmed theme toggle re-renders video
  - **Tab switching**: Document ↔ Video Preview tabs switch cleanly

### Known issues (cosmetic, non-blocking)
- Raw markdown `**bold**` markers visible in TechStack and Metrics scenes — text parsers don't strip markdown formatting. Polish item for future pass.

---

## Session: 2026-03-02 (Session 6 — Remotion Video Preview)

**Summary:** Implemented Remotion video preview — 17 new files, 1 modified. Animated motion-graphic explainer of ProjectCards embedded as a "Video Preview" tab in ProjectCardFull.

### What was done
- **Packages installed**: `remotion`, `@remotion/player`, `@remotion/cli`, `@remotion/google-fonts` (v4.0.431, exact versions)
- **Shared utilities** (`src/remotion/lib/`): theme tokens (light/dark from index.css HSL vars), font loading via `@remotion/google-fonts` (Space Grotesk + Space Mono), reusable animation hooks (fadeIn, slideUp, stagger, typewriter, scaleSpring), duration calculator (dynamic per-scene frame counts based on content length)
- **Type definitions** (`src/remotion/types.ts`): Props interfaces for all 9 scenes + PRDExplainer composition
- **9 scene components** (`src/remotion/scenes/`): TitleScene (name + tagline + tags), ScoreRadarScene (SVG radar chart), VisionScene (two-column typewriter), UserStoriesScene (card entrance), FeatureScene (animated checklist with SVG checkmarks), TechStackScene (pill pop-in + architecture), RoadmapScene (timeline with sequential nodes), MetricsScene (staggered bar growth), OutroScene (branding fade-in)
- **PRDExplainer composition**: `<Series>` sequences all 9 scenes with calculated durations
- **Remotion Studio entry**: Root.tsx with sample ProjectCard data, index.ts with registerRoot
- **VideoPreviewWrapper**: Embeds `@remotion/player` with controls, passes theme and project data
- **ProjectCardFull modified**: Added `<Tabs>` (Document / Video Preview) below scores grid. Video tab lazy-loads via `React.lazy()`. Theme passed from `useTheme()`. Scores grid stays above both tabs.
- **Build verified**: `tsc --noEmit` 0 errors, `vite build` clean. VideoPreviewWrapper code-split into 196KB chunk (only loads on tab click)

---

## Session: 2026-03-02 (Session 5 — E2E Verification & Lovable Migration Fix)

**Summary:** Fixed retrieve-context Lovable gateway dependency, verified all 3 core edge functions work end-to-end via API calls, confirmed Voyage AI vector search returns semantic matches.

### What was done
- **Bug fix — retrieve-context**: Still referenced `LOVABLE_API_KEY` and `ai.gateway.lovable.dev` for keyword extraction, causing 500 errors. Migrated to `OPENROUTER_API_KEY` and `openrouter.ai/api/v1/chat/completions` with `google/gemini-2.0-flash-lite-001`. Redeployed.
- **Verified chunk-and-index**: Called with sample business doc ("monetization strategy..."). Confirmed 11 keywords extracted and 1024-dim embedding stored (12,483 char vector string).
- **Verified retrieve-context (vector search)**: Query "What is the revenue model?" matched doc containing "monetization strategy" — `retrievalMethod: "vector"`. Semantic match confirmed.
- **Verified synthesize-project**: Called with sample transcript. Full ProjectCard returned with all PRD fields (vision, userStories, techStack, architecture, scores, etc.) from Gemini 2.5 Pro via OpenRouter.
- **Confirmed zero Lovable references**: Grep across entire `supabase/functions/` and `src/` — clean.
- **Build verified**: `tsc --noEmit` 0 errors, `vite build` clean (2160 modules).

### Key details
- All 3 core edge functions (chunk-and-index, retrieve-context, synthesize-project) verified working via direct API calls
- Test data cleaned up after verification

### Not yet tested
- Full UI flow: voice session → card generation → zip export (APIs all work individually)
- File upload (PDF/image) via parse-file-context
- Remix flow with ElevenLabs engine
- Realtime sync on prd_projects table
- Voyage fallback with VOYAGE_API_KEY unset

---

## Session: 2026-03-02 (Session 4 — Voyage AI Embeddings + Reranking)

**Summary:** Integrated Voyage AI vector embeddings and reranking into the RAG pipeline for semantic search, with graceful keyword fallback.

### What was done
- **SQL migration**: Created `20260303000000_add_vector_embeddings.sql` — enabled pgvector extension, added `embedding vector(1024)` column to `prd_document_chunks`, HNSW index with cosine distance, `match_document_chunks` RPC function. Pushed via `supabase db push` (after repairing migration history for old remote-only migrations).
- **chunk-and-index updated**: Added `generateEmbeddings()` helper calling Voyage AI `voyage-3-large` (`input_type: "document"`, batch size 128). Embeddings stored alongside keywords; null if `VOYAGE_API_KEY` missing or API fails.
- **retrieve-context updated**: New 4-stage pipeline: (1) embed query via Voyage (`input_type: "query"`), (2) vector similarity search via `match_document_chunks` RPC (10 candidates), (3) keyword fallback if vector returns nothing, (4) rerank via Voyage `rerank-2` model. Response shape unchanged + new `retrievalMethod` field for observability.
- **Secret set**: `VOYAGE_API_KEY` configured in Supabase
- **Functions deployed**: Both `chunk-and-index` and `retrieve-context` redeployed
- **Types regenerated**: `npx supabase gen types typescript` — confirms `embedding` column and `match_document_chunks` function in types

### Key details
- Voyage models: `voyage-3-large` (embeddings, 1024 dims), `rerank-2` (reranking)
- Vector search threshold: 0.3 cosine similarity, returns top 10 candidates before rerank
- Every failure gracefully degrades to existing keyword + full-text search — never errors to user
- Migration required `extensions.vector(1024)` schema-qualified types for Supabase hosted pgvector
- Cost: ~$0.004 per 100 chunks indexed, ~$0.001 per retrieval+rerank query

### Not yet tested
- End-to-end vector search with real document upload
- Reranking quality comparison vs keyword-only
- Fallback behavior with VOYAGE_API_KEY unset

---

## Session: 2026-03-02 (Session 3 — Deploy, Debug & E2E Testing)

**Summary:** Deployed all 6 edge functions, fixed ElevenLabs connection bugs (signedUrl + override), migrated 3 edge functions from Lovable/OpenAI to OpenRouter/Gemini, ran first successful voice session with context injection.

### What was done
- **Edge function deployment**: All 6 functions deployed to Supabase (`cbeurhcgvqptclggkbhb`), smoke test passed (elevenlabs-token returned 200)
- **Bug fix — signedUrl**: `useElevenLabsConversation` was passing `agentId` to `startSession` but ignoring the signed URL from the token endpoint. Fixed to use `signedUrl` for authenticated sessions.
- **Bug fix — override blocked**: ElevenLabs agent config blocks client-side prompt overrides. Removed `overrides` from `startSession`; remix context now injected via `sendContextualUpdate` post-connection.
- **Provider migration**: Switched `synthesize-project`, `chunk-and-index`, and `parse-file-context` from Lovable AI gateway / OpenAI to **OpenRouter** (single API key):
  - `synthesize-project` → Gemini 2.5 Pro (tool calling for structured PRD output)
  - `chunk-and-index` → Gemini 2.0 Flash Lite (keyword extraction — cheap/fast)
  - `parse-file-context` → Gemini 2.5 Pro (multimodal — images, PDFs)
- **Secret set**: `OPENROUTER_API_KEY` configured in Supabase
- **Voice session test**: Successfully connected, AI responded, conversation transcript populated correctly
- **Context injection**: Continued a prior brainstorming session by injecting previous transcript + 2 files (Satori Business Analysis, Operators Academy Strategy) via `sendContextualUpdate`. AI acknowledged all context and continued seamlessly.

### Key details
- OpenRouter key set as `OPENROUTER_API_KEY` in Supabase secrets
- Models used: `google/gemini-2.5-pro-preview-06-05` (synthesis, file parsing), `google/gemini-2.0-flash-lite-001` (keywords)
- Dev server runs on dynamic port (5178 this session) since 5173-5177 were occupied

### Not yet tested
- Card generation end-to-end (voice → synthesize-project → ProjectCard render)
- File upload via Attach button (PDF/image processing with new Gemini backend)
- Remix flow
- Realtime sync on prd_projects table

---

## Session: 2026-03-02 (Session 2 — Repo & Infra Setup)

**Summary:** Separated Idealist PRD into its own GitHub repo and Supabase project, ran migration, created ElevenLabs agent, set secrets.

### What was done
- **New GitHub repo**: Created `ehoyos007/idealist-prd` with fresh git history (no Lovable baggage)
- **Supabase project**: Linked to existing Satori project (`cbeurhcgvqptclggkbhb`), prefixed all tables with `prd_` to avoid conflicts
- **Migration**: Consolidated 3 old migrations into single clean `20260302000000_initial_schema.sql`, ran via SQL Editor — created `prd_projects`, `prd_document_chunks`, `prd_project_documents` with RLS, indexes, triggers, realtime
- **Table prefixing**: Updated all frontend hooks (`useProjectsStorage`, `useProjectDocuments`), edge functions (`chunk-and-index`, `retrieve-context`, `link-documents-to-project`), and Supabase types to use `prd_` prefixed table names
- **ElevenLabs agent**: Created "Idealist PRD Coach" agent via API (`agent_3001kjps0ge9etwase73jzv5dzv3`) with voice `3sfGn775ryaDXhFWHwBg`
- **Secrets set**: `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` configured in Supabase
- **Config cleanup**: Updated `config.toml` with correct project ref and function names, added `.env` and `supabase/.temp/` to `.gitignore`

### Key details
- GitHub: https://github.com/ehoyos007/idealist-prd
- Supabase project ref: `cbeurhcgvqptclggkbhb`
- ElevenLabs agent ID: `agent_3001kjps0ge9etwase73jzv5dzv3`
- Voice ID: `3sfGn775ryaDXhFWHwBg`
- Original Lovable project (`gdlwvchfkyqihpqgmwhl`) is untouched

### Not yet done
- Deploy edge functions (`supabase functions deploy`)
- End-to-end testing

---

## Session: 2026-03-02 (Session 1 — Voice-to-PRD Transformation)

**Summary:** Complete Voice-to-PRD transformation — replaced OpenAI Realtime with ElevenLabs, IdeaCard with ProjectCard, and added .zip starter kit export.

### What was done
- **Phase 1 — Foundation**: Created `ProjectCard` type system, DB migration (`ideas` -> `projects`), transformers, storage/document hooks, updated Supabase generated types
- **Phase 2 — Voice Engine**: Replaced OpenAI Realtime API with ElevenLabs Conversational AI. New `useElevenLabsConversation` hook with PRD brainstorming coach prompt, RAG context injection via `sendContextualUpdate`
- **Phase 3 — Synthesis**: New `synthesize-project` edge function using Gemini 2.5 Pro with `create_project_card` tool schema (PRD fields: vision, userStories, techStack, architecture, etc.)
- **Phase 4 — UI**: Created `ProjectCardFull`, `ProjectCardPreview`, `ProjectDetailView`. Updated `SessionView`, `LibraryView`, `HomeView`, `Header`, `Index.tsx` for Project naming
- **Phase 5 — Export**: Created `generateProjectZip.ts` (CONTEXT.md, TASKS.md, PLAN.md, CLAUDE.md in .zip). Updated `generatePdf.ts` for PRD sections
- **Phase 6 — Cleanup**: Deleted all old Idea* files (8 client files, 3 edge function dirs). Zero dead imports. Build passes clean.

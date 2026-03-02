# Idealist PRD - Progress Log

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

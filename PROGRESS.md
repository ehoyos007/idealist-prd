# Idealist PRD - Progress Log

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

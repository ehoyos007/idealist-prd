# Idealist PRD - Tasks

## Completed
- [x] Create ProjectCard type system and all UI components
- [x] Replace OpenAI Realtime with ElevenLabs Conversational AI
- [x] Create all edge functions (elevenlabs-token, synthesize-project, link-documents-to-project, chunk-and-index, retrieve-context, parse-file-context)
- [x] Create generateProjectZip.ts and update generatePdf.ts
- [x] Verify build passes (zero errors)
- [x] Create new GitHub repo (ehoyos007/idealist-prd)
- [x] Link to Supabase project (cbeurhcgvqptclggkbhb)
- [x] Prefix all tables with `prd_` (prd_projects, prd_document_chunks, prd_project_documents)
- [x] Run migration via SQL Editor — tables created successfully
- [x] Create ElevenLabs agent (agent_3001kjps0ge9etwase73jzv5dzv3)
- [x] Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID secrets
- [x] Deploy all 6 edge functions to Supabase
- [x] Fix ElevenLabs connection — use signedUrl instead of bare agentId
- [x] Fix ElevenLabs override error — remove client-side prompt overrides
- [x] Switch synthesize-project, chunk-and-index, parse-file-context from Lovable/OpenAI to OpenRouter (Gemini 2.5 Pro + Flash Lite)
- [x] Set OPENROUTER_API_KEY secret in Supabase
- [x] Voice session connects and works end-to-end
- [x] Add Voyage AI vector embeddings + reranking to RAG pipeline (migration, chunk-and-index, retrieve-context, types)
- [x] Fix retrieve-context: migrate from Lovable gateway to OpenRouter (was causing 500 errors)
- [x] Verify Voyage AI vector search end-to-end (chunk-and-index stores embeddings, retrieve-context returns semantic matches with retrievalMethod: "vector")
- [x] Verify synthesize-project card generation with OpenRouter/Gemini backend (returns full ProjectCard)
- [x] Verify zero Lovable gateway references remain in codebase
- [x] Build passes clean (0 TS errors, 2160 modules)

## In Progress
- [ ] End-to-end test: voice session -> PRD card -> zip export (voice works; card generation works via API; need user mic input for full UI flow)

## Completed (Testing)
- [x] Deploy to Vercel (https://idealist-prd.vercel.app)
- [x] Test Remotion video preview in app — all 9 scenes play with real project data (81s / 1:21 duration)
- [x] Test theme toggle reactivity in video player — dark & light modes both render correctly
- [x] Verify Document tab has no regressions after tabs addition
- [x] Strip markdown `**bold**` markers in video scene text parsers — created `stripMarkdown()` helper in `src/remotion/lib/text.ts`, applied to all 4 parsers + VisionScene + TechStackScene architecture
- [x] Test Remotion Studio standalone — all 9 scenes render with sample data (01:21.00 duration, 30fps)
- [x] Test mobile responsiveness — home, library, project detail, video player all render correctly on 390x844 (iPhone 14 Pro) viewport. Player scales to container width, tabs are usable.
- [x] Test synthesize-project API — full ProjectCard returned with all PRD fields, scores 1-10, 4 user stories, 5 tags (HTTP 200)
- [x] Test parse-file-context PDF — success, Gemini extracted "Business Plan: AI-powered SaaS for team productivity" (HTTP 200)
- [x] Test parse-file-context Image — success, Gemini described image content (HTTP 200)
- [x] Test RAG round-trip — chunk-and-index stored 1 chunk with 12 keywords + 1024-dim embedding, retrieve-context returned match via vector search (retrievalMethod: "vector") (HTTP 200)
- [x] Test Voyage fallback — with VOYAGE_API_KEY unset: embedding=null, 10 keywords populated, retrievalMethod="keyword" confirmed. Key restored.
- [x] Test export buttons — Copy (toast: "Copied!"), Download .md (toast: "Downloaded!"), PDF (toast: "PDF Downloaded!"), Zip (toast: "Project Kit Downloaded!"). Zip generates CONTEXT.md, TASKS.md, PLAN.md, CLAUDE.md.
- [x] Test remix UI flow (non-voice) — Sparkles button exists, SessionView loads with "Remixing: Satori..." badge, button says "Start Remixing", Cancel returns to home, elevenlabs-token returns signed URL + overrideConfig with projectContext.

## Bugs Fixed
- [x] **Realtime sync not working** — Fixed by setting `REPLICA IDENTITY FULL` on `prd_projects` table. Migration `20260303100000_fix_realtime_replication.sql` pushed. Verified working via test script (INSERT events delivered in <1s).

## Manual Tests Needed (require mic input)
- [ ] Full E2E: voice session → PRD card → zip export (speak 2-3 min → End & Generate Card → verify all PRD fields → export zip)
- [ ] Remix voice session: open existing project → Remix → speak about changes → generate new card → verify new project with `remixedFromId`

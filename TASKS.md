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
(none)

## To Do
- [ ] Test text chat input during voice session (type message → appears with "typed" badge → AI acknowledges)
- [ ] Test pause/resume flow (start → speak → Pause → verify draft in library → Resume → continue → End & Generate)
- [ ] Test auto-save (start session, wait 60s, verify prd_sessions row created)
- [ ] Test sparse transcript handling (short conversation → verify "[Needs Discussion]" in generated PRD)
- [ ] Test scoring rubric alignment (3 different transcripts → verify scores match rubric anchors)
- [ ] Check prd_usage_logs table for entries after running sessions
- [ ] End-to-end test: voice session → PRD card → zip export (requires mic input)

## Completed (Deployment — Session 13)
- [x] Push 3 new migrations: prd_usage_logs, update_match_threshold, prd_sessions
- [x] Fix `_shared/prompts.ts` escaped backticks (22 occurrences)
- [x] Deploy all 6 edge functions with `_shared/` imports
- [x] Set `IDEALIST_API_SECRET` in Supabase secrets
- [x] Commit and push 27 files to GitHub main
- [x] Set `VITE_IDEALIST_API_SECRET` in Vercel (prod + preview)
- [x] Redeploy to Vercel with new env vars
- [x] Smoke test: home, library, project detail — all pass, no console errors
- [x] Verify API key auth enforcement (401 without key)

## Completed (AI Improvements + Features — Session 12)
- [x] A9: Centralize prompts into `_shared/prompts.ts` (10 prompts), CORS into `_shared/cors.ts`, all 6 edge functions updated
- [x] A1: API key auth — `_shared/auth.ts` + `src/lib/supabaseHelpers.ts` wrapper, all frontend calls migrated
- [x] A2: Enhanced voice agent prompt with 8-section tracking, wrap-up signal, vague-answer handling
- [x] A2: `elevenlabs-token` always passes `overrideConfig` (prompts version-controlled in code)
- [x] A3: Calibrated scoring rubric with concrete anchors (complexity, impact, urgency, confidence)
- [x] A4: Set `temperature: 0.4` on synthesis API call
- [x] A7: Transcript length validation (server-side sparse warning + client-side descriptive toast)
- [x] A5: Usage/cost logging table + `_shared/usage.ts` + logging in 4 edge functions
- [x] A6: Chunk size 500→300, overlap 50→75, metadata enrichment `[Source: fileName | Section i/n]`, threshold 0.3→0.4
- [x] A8: Enriched image parsing (7 categories) + PDF parsing (6 categories) prompts
- [x] A10: Query expansion — `expandQuery()` generates 2-3 alternative phrasings, embed all, deduplicate, rerank
- [x] B1: Text chat input — `ChatInput` component, `sendTextMessage()`, "typed" badge, tagged transcript
- [x] B2: Pause/resume — `prd_sessions` table, `useSessionPersistence` hook, auto-save, DraftCard in library, resume routing
- [x] Fixed stale `@/types/idea` imports in `ConversationView.tsx` and `FileUploadButton.tsx`
- [x] Build passes clean (0 TS errors, 2187 modules, 4.20s)

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

## Completed (Transcript Safety)
- [x] Create `recover-transcript` edge function for ElevenLabs conversation history retrieval
- [x] Add `saveDraftProject()` to `useProjectsStorage` — persists transcript before synthesis
- [x] Refactor `SessionView.handleEnd()` — draft save before synthesis, navigate to draft on failure
- [x] Wire `saveDraftProject` and `onDraftSaved` in `Index.tsx`
- [x] Add "Retry Generation" banner + button in `ProjectCardFull` for draft projects
- [x] Add "Draft" badge on `ProjectCardPreview` for incomplete projects
- [x] Fix `.trim()` on Supabase env vars in `client.ts` (trailing `%0A` was breaking API calls)

## Completed (Transcript Recovery)
- [x] Deploy `recover-transcript` edge function
- [x] Invoke and recover lost transcript from ElevenLabs API
- [x] Generate ProjectCard via `synthesize-project` — "YouTube Content Analyzer" (id: 44f80edd-a22b-41e5-8509-966e3e7516cc)
- [x] Insert recovered project into `prd_projects` DB
- [x] Clean up: removed `recover-transcript` function directory, config entry, and deleted from Supabase remote

## Bugs Fixed
- [x] **Realtime sync not working** — Fixed by setting `REPLICA IDENTITY FULL` on `prd_projects` table. Migration `20260303100000_fix_realtime_replication.sql` pushed. Verified working via test script (INSERT events delivered in <1s).

## Manual Tests Needed (require mic input)
- [ ] Full E2E: voice session → PRD card → zip export (speak 2-3 min → End & Generate Card → verify all PRD fields → export zip)
- [ ] Remix voice session: open existing project → Remix → speak about changes → generate new card → verify new project with `remixedFromId`

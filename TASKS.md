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
- [ ] End-to-end test: voice session -> PRD card -> zip export (voice works; card generation works via API; need to test full UI flow)

## Completed (Testing)
- [x] Deploy to Vercel (https://idealist-prd.vercel.app)
- [x] Test Remotion video preview in app — all 9 scenes play with real project data (81s / 1:21 duration)
- [x] Test theme toggle reactivity in video player — dark & light modes both render correctly
- [x] Verify Document tab has no regressions after tabs addition
- [x] Strip markdown `**bold**` markers in video scene text parsers — created `stripMarkdown()` helper in `src/remotion/lib/text.ts`, applied to all 4 parsers + VisionScene + TechStackScene architecture
- [x] Test Remotion Studio standalone — all 9 scenes render with sample data (01:21.00 duration, 30fps)
- [x] Test mobile responsiveness — home, library, project detail, video player all render correctly on 390x844 (iPhone 14 Pro) viewport. Player scales to container width, tabs are usable.

## To Do
- [ ] Test remix flow with ElevenLabs engine
- [ ] Test realtime sync on prd_projects table
- [ ] Test file upload (PDF/image) with OpenRouter/Gemini backend (parse-file-context)
- [ ] Test Voyage fallback (unset VOYAGE_API_KEY → confirm keyword-only mode still works)

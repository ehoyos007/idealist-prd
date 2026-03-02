# Idealist PRD - Progress Log

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

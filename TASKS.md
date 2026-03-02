# Idealist - Tasks

## Completed
- [x] Install @elevenlabs/react and jszip
- [x] Create ProjectCard type system (src/types/project.ts)
- [x] Create DB migration (ideas -> projects)
- [x] Create projectTransformers.ts + update Supabase types
- [x] Create useProjectsStorage and useProjectDocuments hooks
- [x] Create elevenlabs-token edge function
- [x] Create synthesize-project edge function
- [x] Create link-documents-to-project edge function
- [x] Create useElevenLabsConversation hook
- [x] Create ProjectCardFull, ProjectCardPreview, ProjectDetailView
- [x] Create generateProjectZip.ts
- [x] Update generatePdf.ts for ProjectCard
- [x] Update SessionView, LibraryView, HomeView, Header, Index.tsx
- [x] Delete old Idea* files and edge functions
- [x] Verify build passes (zero errors)

## To Do (Manual)
- [ ] Run `supabase db push` to apply migration
- [ ] Set ElevenLabs secrets in Supabase
- [ ] Create ElevenLabs Conversational AI agent in dashboard
- [ ] Deploy edge functions: `supabase functions deploy`
- [ ] End-to-end test: voice session -> PRD card -> zip export
- [ ] Test remix flow with new ElevenLabs engine
- [ ] Test file upload + RAG retrieval during session
- [ ] Test realtime sync on projects table

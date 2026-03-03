export interface UserStory {
  persona: string;
  goal: string;
  benefit: string;
}

export interface Scores {
  complexity: number;
  impact: number;
  urgency: number;
  confidence: number;
}

export interface ProjectDocument {
  id: string;
  fileName: string;
  fileType: string | null;
  chunkCount: number;
  createdAt: string;
}

export interface ProjectCard {
  id: string;
  projectName: string;
  tagline: string;
  tags: string[];
  vision: string;
  problemStatement: string;
  targetUser: string;
  userStories: UserStory[];
  coreFeatures: string;
  techStack: string;
  architecture: string;
  successMetrics: string;
  risksAndOpenQuestions: string;
  firstSprintPlan: string;
  scores: Scores;
  transcript?: string;
  remixedFromId?: string;
  remixedFromTitle?: string;
  documents?: ProjectDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  uploadedAt: Date;
}

export interface DocumentChunk {
  id: string;
  fileName: string;
  chunkIndex: number;
  text: string;
}

export interface RetrievedContext {
  chunks: DocumentChunk[];
  queryKeywords: string[];
  timestamp: Date;
}

export type RepoDepth = 'auto' | 'summary' | 'deep';

export interface ConnectedRepo {
  repoName: string;        // "owner/repo"
  repoUrl: string;         // full GitHub URL
  status: 'fetching' | 'analyzing' | 'indexing' | 'ready' | 'error';
  depth: RepoDepth;
  resolvedDepth?: 'summary' | 'deep';
  summary?: string;
  filesProcessed?: number;
  chunksCreated?: number;
  tree?: string[];          // file paths
  error?: string;
}

export interface RepoFetchResult {
  success: boolean;
  summary: string;
  filesProcessed: number;
  chunksCreated: number;
  tree: string[];
  resolvedDepth: 'summary' | 'deep';
  error?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'context';
  content: string;
  timestamp: Date;
  source?: 'voice' | 'text';
  attachedFile?: UploadedFile;
  retrievedContext?: RetrievedContext;
  connectedRepo?: ConnectedRepo;
}

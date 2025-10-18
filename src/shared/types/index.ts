export interface Job {
  id: string;
  jobTitle: string;
  cvDocumentId: string;
  projectReportId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: EvaluationResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string; // Added for SQLite integration
}

export interface EvaluationResult {
  cvEvaluation: CVEvaluation;
  projectEvaluation: ProjectEvaluation;
  overallSummary: string;
  finalScore: {
    cvScore: number;
    projectScore: number;
    overallScore: number;
  };
}

export interface CVEvaluation {
  technicalSkillsMatch: {
    score: number;
    details: string;
  };
  experienceLevel: {
    score: number;
    details: string;
  };
  relevantAchievements: {
    score: number;
    details: string;
  };
  culturalFit: {
    score: number;
    details: string;
  };
}

export interface ProjectEvaluation {
  correctness: {
    score: number;
    details: string;
  };
  codeQuality: {
    score: number;
    details: string;
  };
  resilience: {
    score: number;
    details: string;
  };
  documentation: {
    score: number;
    details: string;
  };
  creativity: {
    score: number;
    details: string;
  };
}

export interface DocumentMetadata {
  id: string;
  type: 'cv' | 'project_report' | 'job_description' | 'case_study' | 'scoring_rubric';
  filename: string;
  uploadedAt: Date;
  processed: boolean;
  userId?: string; // Added for SQLite integration
  filePath?: string; // Added for SQLite integration
  fileSize?: number; // Added for SQLite integration
  mimeType?: string; // Added for SQLite integration
  chromaCollectionId?: string; // Added for SQLite integration
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Session {
  token: string;
  user: User;
}
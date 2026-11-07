export type FileType = "pdf" | "docx";

export type TargetPosition = "fullstack" | "frontend" | "mobile" | "general";

export type AnalysisMode = "fast" | "smart";

export type RequirementStatus = "confirmed" | "partial" | "missing";

export type RequirementCategory =
  | "technical_skill"
  | "framework_tool"
  | "experience_seniority"
  | "soft_skill"
  | "education_degree"
  | "language"
  | "responsibility"
  | "methodology"
  | "other";

export interface ResumeSection {
  title: string;
  category: "contact" | "experience" | "education" | "skills" | "summary" | "languages" | "projects" | "other";
  content: string;
  confidence: number;
}

export interface ExperienceItem {
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
  description: string;
  technologies: string[];
}

export interface EducationItem {
  institution?: string;
  degree?: string;
  field?: string;
  year?: string;
}

export interface ExtractionWarning {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  recommendation?: string;
}

export interface ParsedResume {
  rawText: string;
  fileName: string;
  fileType: FileType;
  fileSizeBytes: number;
  pageCount?: number;
  sections: ResumeSection[];
  detectedSkills: string[];
  contactInfo: {
    hasEmail: boolean;
    hasPhone: boolean;
    hasLocation: boolean;
    hasLinkedIn: boolean;
    hasGitHub: boolean;
  };
  extractionWarnings: ExtractionWarning[];
  isScannedOrEmpty: boolean;
}

export interface JobRequirement {
  id: string;
  label: string;
  normalizedName: string;
  category: RequirementCategory;
  required: boolean; // Obligatoire vs Souhaité / Bonus
  sourceText: string;
  importance: number; // 1 to 5
}

export interface AnalyzedJob {
  rawText: string;
  title?: string;
  targetPosition: TargetPosition;
  requirements: JobRequirement[];
  seniorityRequired?: string;
  yearsOfExperienceRequired?: number;
  languages: string[];
  remotePolicy?: string;
}

export interface RequirementMatch {
  requirementId: string;
  requirementLabel: string;
  category: RequirementCategory;
  required: boolean;
  status: RequirementStatus;
  proofInResume?: string;
  comment: string;
  confidence: "high" | "medium" | "low";
}

export interface ATSDiagnostic {
  id: string;
  title: string;
  category: "extraction" | "structure" | "contact" | "format" | "reading_order";
  severity: "low" | "medium" | "high";
  explanation: string;
  remediation: string;
}

export interface ATSScoreBreakdown {
  extractionQuality: number; // Max 35
  structureSections: number; // Max 25
  readingOrder: number;      // Max 20
  essentialContact: number;  // Max 20
  total: number;             // Max 100
  ratingLabel: string;
}

export interface MatchingScoreBreakdown {
  technicalSkillsScore: number; // Max 35
  experienceSeniorityScore: number; // Max 25
  responsibilitiesScore: number; // Max 20
  methodologyContextScore: number; // Max 10
  otherRequirementsScore: number; // Max 10
  total: number; // Max 100
  confidenceScore: number; // 0 to 100
  ratingLabel: string;
  blockingRequirementsFailed: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  issue: string;
  relevanceToJob: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
  category: "mandatory_gap" | "clarification" | "ats_fix" | "valorization";
}

export interface ExecutiveSummary {
  strengths: string[];
  majorGaps: string[];
  blockingAlerts: string[];
  priorityActions: string[];
  verificationsBeforeApplying: string[];
}

export interface SingleAnalysisResult {
  id: string;
  createdAt: string;
  mode: AnalysisMode;
  targetPosition: TargetPosition;
  resume: ParsedResume;
  job: AnalyzedJob;
  atsScore: ATSScoreBreakdown;
  atsDiagnostics: ATSDiagnostic[];
  matchingScore: MatchingScoreBreakdown;
  requirementsMatches: RequirementMatch[];
  confirmedSkills: Array<{ name: string; proof?: string }>;
  partialSkills: Array<{ name: string; comment: string; proof?: string }>;
  missingSkills: Array<{ name: string; required: boolean }>;
  recommendations: Recommendation[];
  summary: ExecutiveSummary;
  aiEnriched: boolean;
  aiProviderUsed?: string;
  aiErrorMessage?: string;
}

export interface ComparisonCandidate {
  id: string;
  label: string; // e.g. "CV Full-Stack", "CV Mobile"
  fileName: string;
  result: SingleAnalysisResult;
}

export interface ComparisonReport {
  jobTitle: string;
  targetPosition: TargetPosition;
  candidates: ComparisonCandidate[];
  recommendedCandidateId: string;
  recommendationReason: string;
  comparisonHighlights: Array<{
    candidateId: string;
    pros: string[];
    cons: string[];
    blockingIssuesCount: number;
  }>;
}


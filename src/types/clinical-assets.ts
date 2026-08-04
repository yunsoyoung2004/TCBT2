export type AssetType =
  | "session_video"
  | "session_audio"
  | "therapist_manual"
  | "patient_manual"
  | "ai_only_manual"
  | "claude_prompt"
  | "transcript"
  | "supporting_document";

export type AssetStatus =
  | "uploading"
  | "processing"
  | "ready"
  | "needs_metadata"
  | "needs_review"
  | "failed"
  | "archived";

export type ExtractionStatus =
  | "not_started"
  | "queued"
  | "extracting"
  | "completed"
  | "partial"
  | "ocr_required"
  | "failed"
  | "cancelled"
  | "interrupted";

export type AssetRelationshipType = "translation_of" | "transcript_of" | "revision_of" | "supports";

export type TbctMappingType =
  | "session_goal"
  | "clinical_intent"
  | "basic_question"
  | "expected_response"
  | "follow_up_branch"
  | "therapeutic_activity"
  | "homework"
  | "visualization"
  | "completion_condition"
  | "safety_rule"
  | "clinician_intervention_condition";

export type ReviewStatus =
  | "unstructured"
  | "in_progress"
  | "needs_clinical_review"
  | "changes_requested"
  | "approved"
  | "rejected";

export interface LocalClinicalAsset {
  id: string;
  projectId: string;
  title: string;
  originalFileName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  checksumSha256: string;
  assetType: AssetType;
  country: "BR" | "FR" | "KR" | "OTHER";
  sourceLocale: string;
  translationLocale?: string;
  sessionIds: string[];
  protocolId?: string;
  authorName?: string;
  organization?: string;
  version: string;
  currentVersionId?: string;
  sourceAssetId?: string;
  translationAssetId?: string;
  transcriptAssetId?: string;
  status: AssetStatus;
  extractionStatus: ExtractionStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
  tags: string[];
  permissionLevel: "project" | "clinical-team" | "restricted";
  extractionDraftId?: string;
  pageCount?: number;
  durationSeconds?: number;
  characterCount?: number;
  warningCount?: number;
}

export interface StoredFileRecord {
  id: string;
  assetId: string;
  versionId?: string;
  blob: Blob;
  objectUrl?: string;
}

export interface ExtractedBlock {
  id: string;
  assetId: string;
  assetVersionId?: string;
  blockIndex: number;
  type: "heading" | "paragraph" | "table" | "prompt" | "transcript";
  text: string;
  pageNumber?: number;
  paragraphNumber?: number;
  startSeconds?: number;
  endSeconds?: number;
  speaker?: "therapist" | "patient" | "unknown";
  sourceLocator: string;
}

export interface SourceBlock extends ExtractedBlock {
  sessionId?: string;
  sessionLabel?: string;
  sessionHeading?: string;
  sectionLabel?: string;
  isSessionStart?: boolean;
}

export interface DetectedSession {
  id: string;
  label: string;
  title: string;
  sourceLocator: string;
  startBlockIndex: number;
  endBlockIndex: number;
  blockCount: number;
}

export interface ExtractedDocument {
  id: string;
  assetId: string;
  assetVersionId?: string;
  extractionVersion: string;
  pageCount?: number;
  durationSeconds?: number;
  characterCount: number;
  extractedAt: string;
  blocks: SourceBlock[];
  sourceBlocks?: SourceBlock[];
  sessions?: DetectedSession[];
  warnings: string[];
}

export interface ExtractionJob {
  id: string;
  assetId: string;
  assetVersionId?: string;
  status: ExtractionStatus;
  progress: number;
  stage: "queued" | "reading_file" | "loading_pdf_parser" | "extracting_pages" | "creating_blocks" | "saving_results" | "completed" | "failed";
  error?: string;
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
  errorStage?: string;
  failedAt?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AssetVersion {
  id: string;
  assetId: string;
  version: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  extractionStatus: ExtractionStatus;
  extractedDocumentId?: string;
  changeSummary: string;
  createdAt: string;
  createdBy: string;
  isCurrent: boolean;
}

export interface AssetRelationship {
  id: string;
  projectId: string;
  sourceAssetId: string;
  targetAssetId: string;
  relationType: AssetRelationshipType;
  sourceVersionId?: string;
  targetVersionId?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface SourceEvidence {
  id: string;
  assetId: string;
  assetVersionId?: string;
  extractedDocumentId: string;
  blockId: string;
  sessionId?: string;
  sessionLabel?: string;
  pageNumber?: number;
  paragraphNumber?: number;
  startSeconds?: number;
  endSeconds?: number;
  sourceLocator: string;
  quotedText: string;
}

export interface FollowUpBranchData {
  conditionLabel: string;
  conditionExpression?: string;
  expectedResponseCategory?: string;
  nextActionType:
    | "question"
    | "activity"
    | "homework"
    | "safety_check"
    | "clinician_escalation"
    | "session_complete";
  targetItemId?: string;
  fallback?: boolean;
  priority: number;
}

export interface StructuredTbctItem {
  id: string;
  draftId: string;
  sessionId?: string;
  mappingType: TbctMappingType;
  title: string;
  content: string;
  clinicalRationale?: string;
  status: ReviewStatus;
  sourceEvidenceIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  changeReason?: string;
  branchData?: FollowUpBranchData;
}

export interface ReviewDecision {
  id: string;
  draftId: string;
  structuredItemId?: string;
  decision: "request_review" | "approve" | "changes_requested" | "reject";
  comment?: string;
  createdAt: string;
  createdBy: string;
}

export interface ExtractionReviewDraft {
  id: string;
  projectId: string;
  assetIds: string[];
  sessionId?: string;
  title: string;
  status: ReviewStatus;
  sourceBlocks?: SourceBlock[];
  sourceEvidence: SourceEvidence[];
  detectedSessions?: DetectedSession[];
  structuredItems: StructuredTbctItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DraftValidationIssue {
  id: string;
  severity: "critical" | "warning" | "information";
  itemId?: string;
  message: string;
}

export interface ProtocolDraftItem {
  id: string;
  structuredItemId: string;
  proposedNodeType:
    | "session_start"
    | "dialogue"
    | "question"
    | "condition"
    | "activity"
    | "homework"
    | "visualization"
    | "safety_check"
    | "clinician_escalation"
    | "session_complete";
  title: string;
  content: string;
  sourceEvidenceIds: string[];
  linkedItemIds: string[];
}

export interface ProtocolDraftCandidate {
  id: string;
  projectId: string;
  protocolId?: string;
  sessionId: string;
  sourceDraftId: string;
  items: ProtocolDraftItem[];
  validationSummary: {
    critical: number;
    warning: number;
    information: number;
  };
  createdAt: string;
  createdBy: string;
}

export interface SourceManifest {
  schemaVersion: "1.0";
  exportedAt: string;
  projectId: string;
  assets: LocalClinicalAsset[];
  relationships: AssetRelationship[];
}

export interface AssetFilters {
  query?: string;
  country?: string;
  locale?: string;
  assetType?: AssetType | "all";
  sessionId?: string;
  status?: AssetStatus | "all";
  extractionStatus?: ExtractionStatus | "all";
  sortBy?: "updatedAt" | "createdAt" | "title" | "sizeBytes";
}

export interface CreateClinicalAssetInput {
  file: File;
  title: string;
  assetType: AssetType;
  country: LocalClinicalAsset["country"];
  sourceLocale: string;
  translationLocale?: string;
  sessionIds: string[];
  protocolId?: string;
  authorName?: string;
  organization?: string;
  version: string;
  notes?: string;
  tags: string[];
  permissionLevel: LocalClinicalAsset["permissionLevel"];
  createdBy: string;
  allowForceDuplicate?: boolean;
  duplicateReason?: string;
}

export interface CreateAssetVersionInput {
  file: File;
  version: string;
  changeSummary: string;
  createdBy: string;
  rerunExtraction?: boolean;
}

export interface CreateAssetRelationshipInput {
  projectId: string;
  sourceAssetId: string;
  targetAssetId: string;
  relationType: AssetRelationshipType;
  sourceVersionId?: string;
  targetVersionId?: string;
  notes?: string;
  createdBy: string;
}

export interface CreateStructuredItemInput {
  draftId: string;
  sessionId?: string;
  mappingType: TbctMappingType;
  title: string;
  content: string;
  clinicalRationale?: string;
  sourceEvidenceIds: string[];
  createdBy: string;
  branchData?: FollowUpBranchData;
}

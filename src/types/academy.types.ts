import type { PaginationMeta } from '@/types/catalog.types';

// SMART ACADEMY — tipe untuk modul belajar/ujian/monitoring (mobile).
// Mengikuti kontrak resmi `/academy/*` (dikonfirmasi backend 2026-09-09). Hanya field yang
// benar-benar ada di response yang dimodelkan — tidak ada field spekulatif.

// Backend kadang mengirim nilai numerik sebagai string ("46.67", "89.00"). `formatScore` /
// `formatPercent` di `utils/academy.ts` sudah meng-koersi — tipe ini merefleksikannya.
export type AcademyNumeric = number | string | null;

export type AcademyProgramPov = 'my' | 'instructor' | 'commander';
export type AcademyProgramStatus = 'draft' | 'published' | 'ongoing' | 'completed' | string;
export type AcademyParticipantStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'passed'
  | 'failed'
  | string;
export type AcademyComponentType = 'material' | 'assessment' | 'practical' | string;
export type AcademyAssessmentType = 'knowledge' | 'psychology' | 'accuracy' | string;
export type AcademyQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'boolean'
  | 'essay'
  | 'short_text'
  | 'numeric'
  | string;
export type AcademyMaterialContentType =
  | 'text'
  | 'pdf'
  | 'video'
  | 'image'
  | 'document'
  | 'external_link'
  | string;

// --- GET /academy/me/summary ---
export interface AcademySummaryMember {
  active_programs: number;
  not_started_programs: number;
  completed_programs: number;
  pending_verifications: number;
}
// Blok komandan pada /me/summary — dipakai untuk kartu "Perlu Perhatian".
export interface AcademySummaryCommander {
  active_programs: number;
  completion_rate: number;
  pass_rate: number;
  not_completed: number;
  failed: number;
  pending_verifications: number;
}
export interface AcademySummary {
  member?: AcademySummaryMember | null;
  instructor_pending_verifications?: number | null;
  commander_overview?: AcademySummaryCommander | null;
}

// --- GET /academy/programs ---
export interface AcademyProgramListItem {
  id: number;
  code: string;
  title: string;
  program_type: string;
  status: AcademyProgramStatus;
  is_mandatory: boolean;
  start_date: string | null;
  end_date: string | null;
  completion_deadline: string | null;
  participant_status: AcademyParticipantStatus | null;
  final_score: AcademyNumeric;
  final_status: string | null;
}
export interface AcademyProgramListResult {
  items: AcademyProgramListItem[];
  meta: PaginationMeta;
}

// --- GET /academy/programs/{id} ---
export interface AcademyInstructorRef {
  id: number;
  name: string;
  role?: string | null;
  is_primary?: boolean;
}
export interface AcademyComponent {
  id: number;
  type: AcademyComponentType;
  title: string;
  description?: string | null;
  is_required: boolean;
  sort_order: number;
  is_completed?: boolean | null;
  // Status kaya untuk badge (mis. "pending_verification" / "passed" / "failed" / "in_progress").
  status?: string | null;
  material_id?: number | null;
  material_type?: AcademyMaterialContentType | null;
  assessment_id?: number | null;
  assessment_type?: AcademyAssessmentType | null;
  practical_id?: number | null;
}
export interface AcademyParticipantProgress {
  status: AcademyParticipantStatus;
  theory_score: AcademyNumeric;
  practical_score: AcademyNumeric;
  final_score: AcademyNumeric;
  final_status: string | null;
}
export interface AcademyProgramDetail {
  id: number;
  title: string;
  code: string;
  category_name?: string | null;
  short_description?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  program_type: string;
  is_mandatory?: boolean;
  pass_grade: number;
  start_date?: string | null;
  end_date?: string | null;
  completion_deadline?: string | null;
  instructors?: AcademyInstructorRef[];
  participant?: AcademyParticipantProgress | null;
  components: AcademyComponent[];
}

// --- POST /academy/materials/{id}/complete ---
export interface AcademyMaterialCompleteResult {
  id?: number;
  component_id: number;
  material_id?: number;
  status: string;
  progress_percentage: number;
  completed_at?: string | null;
}

// --- GET /academy/materials/{id} ---
export interface AcademyMaterial {
  id: number;
  component_id: number;
  program_id: number;
  program_title?: string | null;
  title: string;
  material_type: AcademyMaterialContentType;
  content?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  estimated_minutes?: number | null;
  is_completed?: boolean;
  progress_percentage?: number | null;
  completed_at?: string | null;
}

// --- GET /academy/assessments/{id} ---
export interface AcademyAssessment {
  id: number;
  title: string;
  assessment_type: AcademyAssessmentType;
  time_limit_seconds: number | null;
  maximum_attempts: number | null;
  passing_score: number | null;
  attempts_used: number;
  can_start: boolean;
  sections_count?: number | null;
}

// --- POST /academy/assessments/{id}/attempts + GET /academy/attempts/{attempt} ---
export interface AcademyQuestionOption {
  id: number;
  label: string;
  option_text: string;
}
export interface AcademyQuestion {
  id: number;
  question_type: AcademyQuestionType;
  question_text: string;
  section_id?: number | null;
  options?: AcademyQuestionOption[];
}
export interface AcademyResponse {
  question_id: number;
  selected_options?: number[];
  text_answer?: string | null;
  numeric_answer?: number | null;
  answered_at?: string | null;
}
// POST /academy/assessments/{id}/attempts
export interface AcademyAttemptStart {
  attempt_id: number;
  started_at: string;
  expires_at: string;
  questions: AcademyQuestion[];
}
// GET /academy/attempts/{attempt}
export interface AcademyAttempt {
  id: number;
  status: 'in_progress' | 'submitted' | 'expired' | string;
  started_at: string;
  expires_at: string;
  server_time?: string;
  questions: AcademyQuestion[];
  responses?: Record<string, AcademyResponse>;
}

// --- PUT /academy/attempts/{attempt}/responses/{question} ---
export interface AcademyResponsePayload {
  selected_options?: number[];
  text_answer?: string;
  numeric_answer?: number;
}

// --- POST /academy/attempts/{id}/submit + GET /academy/attempts/{attempt}/result ---
export interface AcademyAttemptResult {
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  score: number;
  passing_score: number;
  passing_status: string;
}

// --- GET /academy/me/results ---
export interface AcademyResultItem {
  id: number;
  program_id: number;
  program_title: string;
  category_name?: string | null;
  theory_score?: AcademyNumeric;
  practical_score?: AcademyNumeric;
  final_score: AcademyNumeric;
  final_status: string | null;
  completed_at: string | null;
}

// --- GET /academy/me/competencies ---
export interface AcademyCompetency {
  id: number;
  competency_name: string;
  category: string;
  score: AcademyNumeric;
  status: 'active' | 'expiring' | 'expired' | string;
  achieved_at: string | null;
  expires_at: string | null;
  program_title: string | null;
}

// --- GET /academy/practical-assessments/{id} ---
export interface AcademyMetric {
  id: number;
  code: string;
  name: string;
  input_type: 'number' | 'text' | 'time' | string;
  unit?: string | null;
  minimum?: number | null;
  maximum?: number | null;
  weight?: number | null;
  is_required?: boolean;
}
export interface AcademyPracticalResult {
  id: number;
  entry_method?: 'self' | 'instructor' | string;
  metric_values: Record<string, number>;
  score?: AcademyNumeric;
  verification_status: string;
  notes?: string | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
}
export interface AcademyPracticalAssessment {
  id: number;
  component_id?: number;
  program_id?: number;
  program_title?: string | null;
  title: string;
  description?: string | null;
  allow_self_entry?: boolean;
  passing_score?: number | null;
  metrics: AcademyMetric[];
  my_result?: AcademyPracticalResult | null;
}
// --- POST /academy/practical-assessments/{id}/results ---
export interface AcademyPracticalResultPayload {
  metric_values: Record<string, number>;
  notes?: string;
}

// --- GET /academy/instructor/pending-verifications ---
export interface AcademyVerificationPersonnel {
  id: number;
  name: string;
  nrp?: string | null;
  rank?: string | null;
}
export interface AcademyVerificationItem {
  id: number;
  practical_assessment_id: number;
  assessment_title: string;
  program_title: string;
  personnel: AcademyVerificationPersonnel;
  metric_values: Record<string, number | string>;
  notes?: string | null;
  submitted_at: string | null;
}
export interface AcademyVerificationListResult {
  items: AcademyVerificationItem[];
  meta: PaginationMeta;
}
// --- POST /academy/instructor/verify-result/{id} ---
export interface AcademyVerifyPayload {
  action: 'verify' | 'reject';
  score?: number;
  rejection_reason?: string;
  notes?: string;
}
// --- POST /academy/instructor/practical-results ---
export interface AcademyInstructorScorePayload {
  practical_assessment_id: number;
  personnel_id: number;
  score: number;
  metric_values?: Record<string, number>;
  notes?: string;
}

// --- GET /academy/commander/overview ---
export interface AcademyCommanderTopCompetency {
  competency_name: string;
  total_achieved: number;
}
export interface AcademyCommanderOverview {
  total_programs: number;
  active_programs: number;
  total_participants: number;
  completed_count: number;
  passed_count: number;
  failed_count: number;
  in_progress_count: number;
  pass_rate_percentage: number;
  completion_rate_percentage: number;
  average_final_score: number;
  top_competencies: AcademyCommanderTopCompetency[];
}

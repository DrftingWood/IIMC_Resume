/*
 * Mirrors the Phase 1 SQL schema (supabase/migrations/). Field names match the
 * database columns so the mock can be swapped for real Supabase calls without
 * reshaping anything above this layer.
 */

export type ReviewScope = 'resume' | 'selection';
export type ReviewAudience = 'invited' | 'university';
export type ReviewStatus = 'open' | 'answered' | 'closed';
export type CommentStatus = 'open' | 'accepted' | 'rejected' | 'outdated';

export interface Person {
  id: string;
  display_name: string;
  email: string;
  /** "PGP 2025 · ex-Bain" — the context that makes a reviewer's opinion land. */
  headline?: string;
}

export interface ReviewRequest {
  id: string;
  resume_id: string;
  requester_id: string;
  /** The pinned snapshot. Reviewers read this, never the live draft. */
  version_id: string;
  scope: ReviewScope;
  entity_ids: string[];
  question: string;
  audience: ReviewAudience;
  status: ReviewStatus;
  created_at: string;
  invitee_ids: string[];
}

export interface Comment {
  id: string;
  resume_id: string;
  request_id: string | null;
  entity_id: string | null;
  /** Which snapshot the author was reading when they wrote this. */
  version_id: string;
  author_id: string;
  body: string;
  /** Suggestion mode: a proposed replacement the owner can accept outright. */
  suggested_text: string | null;
  status: CommentStatus;
  created_at: string;
}

/**
 * An entity reduced to its scalar fields.
 *
 * Nested arrays and objects are dropped, which is a security control rather
 * than tidiness: returning a bullet *group* wholesale would ship every sibling
 * bullet inside it. See public.jsonb_collect_entities in
 * supabase/migrations/0002_access_functions.sql — this is its client twin.
 */
export type ScalarEntity = Record<string, string | number | boolean | null> & {
  id: string;
};

/** Return shape of public.get_review_payload(). */
export interface ReviewPayload {
  request_id: string;
  scope: ReviewScope;
  question: string;
  status: ReviewStatus;
  version_id: string;
  template_id: string;
  requester: { display_name: string; headline?: string };
  /** Populated for scope='selection' — only the bullets that were asked about. */
  entities: ScalarEntity[];
  /** Populated only for scope='resume', when the whole document was shared. */
  resume: unknown | null;
}

export interface CreateRequestInput {
  resume_id: string;
  template_id: string;
  scope: ReviewScope;
  entity_ids: string[];
  question: string;
  audience: ReviewAudience;
  invitee_ids: string[];
  /** Snapshotted at request time — this is what becomes the pinned version. */
  data: unknown;
}

export interface AddCommentInput {
  request_id: string;
  entity_id: string | null;
  body: string;
  suggested_text?: string | null;
}

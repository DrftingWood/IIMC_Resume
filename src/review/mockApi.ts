import { uid } from '@/lib/uid';
import { collectEntities } from './projection';
import { ReviewAccessError, type ReviewApi } from './api';
import type {
  AddCommentInput,
  Comment,
  CommentStatus,
  CreateRequestInput,
  Person,
  ReviewPayload,
  ReviewRequest,
} from './types';

/*
 * In-memory + localStorage stand-in for the Phase 1 backend, so the review UI
 * can be built and used before a Supabase project exists.
 *
 * IMPORTANT — what this does and does not prove.
 *
 * The permission checks below mirror the RLS policies and get_review_payload()
 * exactly, which is what makes the UI correct: components can only ever obtain
 * the data a real reviewer would obtain. But this runs in the browser, on data
 * the browser already holds, so it enforces nothing against a determined user.
 * The real guarantee is the RLS policies plus the SECURITY DEFINER RPC — see
 * docs/phase-1-data-model.md. Do not read a passing demo as a security result.
 */

const STORE_KEY = 'iimc-resume-builder:review:v1';
const PERSONA_KEY = 'iimc-resume-builder:review-persona:v1';

/** Fictional reviewers, so both sides of the loop can be demonstrated. */
export const DEMO_PEOPLE: Person[] = [
  {
    id: 'u-self',
    display_name: 'You',
    email: 'you@email.iimcal.ac.in',
    headline: 'PGP 2026',
  },
  {
    id: 'u-senior',
    display_name: 'Ananya Rao',
    email: 'ananya.rao@iimcal.ac.in',
    headline: 'PGP 2025 · ex-Bain',
  },
  {
    id: 'u-mentor',
    display_name: 'Vikram Nair',
    email: 'vikram.nair@iimcal.ac.in',
    headline: 'Alumnus 2019 · McKinsey',
  },
];

interface VersionRow {
  id: string;
  resume_id: string;
  data: unknown;
  created_at: string;
}

interface Store {
  requests: ReviewRequest[];
  versions: VersionRow[];
  comments: Comment[];
}

function emptyStore(): Store {
  return { requests: [], versions: [], comments: [] };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    return emptyStore();
  }
}

function save(store: Store): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('review store save failed', e);
  }
}

class MockReviewApi implements ReviewApi {
  private store: Store = load();
  private userId: string = this.loadPersona();
  private listeners = new Set<() => void>();

  private loadPersona(): string {
    try {
      const raw = localStorage.getItem(PERSONA_KEY);
      if (raw && DEMO_PEOPLE.some((p) => p.id === raw)) return raw;
    } catch {
      /* ignore */
    }
    return DEMO_PEOPLE[0].id;
  }

  private commit(): void {
    save(this.store);
    this.listeners.forEach((fn) => fn());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  currentUser(): Person {
    return DEMO_PEOPLE.find((p) => p.id === this.userId) ?? DEMO_PEOPLE[0];
  }

  listPeople(): Person[] {
    return DEMO_PEOPLE;
  }

  setCurrentUser(userId: string): void {
    if (!DEMO_PEOPLE.some((p) => p.id === userId)) return;
    this.userId = userId;
    try {
      localStorage.setItem(PERSONA_KEY, userId);
    } catch {
      /* ignore */
    }
    this.listeners.forEach((fn) => fn());
  }

  listRequestsByMe(resumeId: string): ReviewRequest[] {
    return this.store.requests
      .filter((r) => r.resume_id === resumeId && r.requester_id === this.userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  listRequestsForMe(): ReviewRequest[] {
    return this.store.requests
      .filter((r) => r.requester_id !== this.userId && r.invitee_ids.includes(this.userId))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  createRequest(input: CreateRequestInput): ReviewRequest {
    if (input.scope === 'selection' && input.entity_ids.length === 0) {
      throw new Error('a selection review needs at least one bullet');
    }

    // Snapshot now. This is the resume_versions row the review pins to, and is
    // why later edits cannot change what a reviewer was looking at.
    const version: VersionRow = {
      id: uid('ver'),
      resume_id: input.resume_id,
      data: JSON.parse(JSON.stringify(input.data)),
      created_at: new Date().toISOString(),
    };

    const request: ReviewRequest = {
      id: uid('req'),
      resume_id: input.resume_id,
      requester_id: this.userId,
      version_id: version.id,
      scope: input.scope,
      entity_ids: [...input.entity_ids],
      question: input.question,
      audience: input.audience,
      status: 'open',
      created_at: new Date().toISOString(),
      invitee_ids: [...input.invitee_ids],
    };

    this.store.versions.push(version);
    this.store.requests.push(request);
    this.commit();
    return request;
  }

  private requireRequest(requestId: string): ReviewRequest {
    const req = this.store.requests.find((r) => r.id === requestId);
    if (!req) throw new ReviewAccessError('review request not found');
    return req;
  }

  private isParticipant(req: ReviewRequest): boolean {
    return req.requester_id === this.userId || req.invitee_ids.includes(this.userId);
  }

  getReviewPayload(requestId: string): ReviewPayload {
    const req = this.requireRequest(requestId);
    if (!this.isParticipant(req)) {
      throw new ReviewAccessError('not a participant in this review');
    }

    const version = this.store.versions.find((v) => v.id === req.version_id);
    const data = version?.data ?? null;
    const requester = DEMO_PEOPLE.find((p) => p.id === req.requester_id);

    return {
      request_id: req.id,
      scope: req.scope,
      question: req.question,
      status: req.status,
      version_id: req.version_id,
      template_id: 'iimc',
      requester: {
        display_name: requester?.display_name ?? '',
        headline: requester?.headline,
      },
      // The projection: only what was asked about, scalar fields only.
      entities: req.scope === 'selection' ? collectEntities(data, req.entity_ids) : [],
      resume: req.scope === 'resume' ? data : null,
    };
  }

  getVersionData(versionId: string): unknown | null {
    return this.store.versions.find((v) => v.id === versionId)?.data ?? null;
  }

  listComments(requestId: string): Comment[] {
    const req = this.requireRequest(requestId);
    if (!this.isParticipant(req)) {
      throw new ReviewAccessError('not a participant in this review');
    }
    return this.store.comments
      .filter((c) => c.request_id === requestId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  listCommentsForResume(resumeId: string): Comment[] {
    const mine = new Set(
      this.store.requests
        .filter((r) => r.resume_id === resumeId && this.isParticipant(r))
        .map((r) => r.id)
    );
    return this.store.comments
      .filter((c) => c.resume_id === resumeId && c.request_id && mine.has(c.request_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  addComment(input: AddCommentInput): Comment {
    const req = this.requireRequest(input.request_id);
    if (!this.isParticipant(req)) {
      throw new ReviewAccessError('not a participant in this review');
    }
    if (req.status !== 'open') {
      throw new ReviewAccessError('this review is closed');
    }
    if (!input.body.trim() && !input.suggested_text?.trim()) {
      throw new Error('a comment needs a note or a suggestion');
    }

    const comment: Comment = {
      id: uid('cmt'),
      resume_id: req.resume_id,
      request_id: req.id,
      entity_id: input.entity_id,
      version_id: req.version_id,
      author_id: this.userId,
      body: input.body.trim(),
      suggested_text: input.suggested_text?.trim() || null,
      status: 'open',
      created_at: new Date().toISOString(),
    };

    this.store.comments.push(comment);
    if (req.requester_id !== this.userId) req.status = 'answered';
    this.commit();
    return comment;
  }

  setCommentStatus(commentId: string, status: CommentStatus): Comment {
    const comment = this.store.comments.find((c) => c.id === commentId);
    if (!comment) throw new ReviewAccessError('comment not found');

    const req = this.store.requests.find((r) => r.id === comment.request_id);
    // Only the person who asked for the review resolves suggestions on it —
    // this stands in for the comments_resolve_owner policy.
    if (!req || req.requester_id !== this.userId) {
      throw new ReviewAccessError('only the resume owner can resolve a comment');
    }

    comment.status = status;
    this.commit();
    return comment;
  }

  reset(): void {
    this.store = emptyStore();
    this.commit();
  }
}

export const mockReviewApi = new MockReviewApi();

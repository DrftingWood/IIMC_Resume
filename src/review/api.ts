import type {
  AddCommentInput,
  Comment,
  CommentStatus,
  CreateRequestInput,
  Person,
  ReviewPayload,
  ReviewRequest,
} from './types';

/**
 * What the review feature needs from a backend.
 *
 * The mock in mockApi.ts implements this today; a Supabase implementation will
 * implement the same interface, mapping each method onto a table query or the
 * get_review_payload RPC. Nothing above this line should know which is in use.
 */
export interface ReviewApi {
  /** The signed-in person. In the mock this is switchable for demoing. */
  currentUser(): Person;
  listPeople(): Person[];

  /** Requests this user has made, for one resume. */
  listRequestsByMe(resumeId: string): ReviewRequest[];
  /** Requests where this user is an invited reviewer. */
  listRequestsForMe(): ReviewRequest[];

  createRequest(input: CreateRequestInput): ReviewRequest;

  /**
   * Mirrors public.get_review_payload(). Throws if the caller is not a
   * participant. Returns only the entities the request named.
   */
  getReviewPayload(requestId: string): ReviewPayload;

  /** The pinned snapshot, for the owner's own outdated-detection. */
  getVersionData(versionId: string): unknown | null;

  listComments(requestId: string): Comment[];
  /** All comments across a resume, for the owner's inbox. */
  listCommentsForResume(resumeId: string): Comment[];
  addComment(input: AddCommentInput): Comment;
  setCommentStatus(commentId: string, status: CommentStatus): Comment;

  /** Mock-only: change persona. Absent from the Supabase implementation. */
  setCurrentUser?(userId: string): void;
  reset?(): void;
}

export class ReviewAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewAccessError';
  }
}

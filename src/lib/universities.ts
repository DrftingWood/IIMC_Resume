export interface University {
  id: string;
  /** Full legal name, as it appears in the resume footer. */
  name: string;
  /** Short name for UI chrome. */
  shortName: string;
  /**
   * Verified email domains for this university.
   *
   * A Google account on one of these domains is proof of membership — that is
   * what will grant access to the university's group without anyone having to
   * issue an invite. Invites are reserved for people who cannot self-verify
   * (alumni who lost their institute address, external mentors).
   */
  emailDomains: string[];
  country: string;
}

export const UNIVERSITIES: University[] = [
  {
    id: 'iimc',
    name: 'Indian Institute of Management Calcutta',
    shortName: 'IIM Calcutta',
    emailDomains: ['iimcal.ac.in'],
    country: 'IN',
  },
];

export function getUniversity(id: string | null | undefined): University | undefined {
  if (!id) return undefined;
  return UNIVERSITIES.find((u) => u.id === id);
}

/**
 * Resolve the university that owns an email address' domain.
 *
 * Subdomains count (`a@students.iimcal.ac.in` matches `iimcal.ac.in`), so a
 * university that hands out departmental subdomains needs only its apex domain
 * listed. Comparison is case-insensitive.
 *
 * NOTE: this is a client-side convenience for pre-filling and UI hints only.
 * When accounts land, membership must be derived from the verified email in
 * the auth token server-side — never from a domain string the client asserts.
 */
export function universityForEmail(email: string): University | undefined {
  const at = email.lastIndexOf('@');
  if (at === -1) return undefined;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return undefined;
  return UNIVERSITIES.find((u) =>
    u.emailDomains.some((d) => domain === d || domain.endsWith(`.${d}`))
  );
}

export interface ContactItem {
  id: string;
  icon: string;          // FontAwesome 5 logical name e.g. "MapMarker", "Github"
  text: string;
  href?: string;
}

export interface EntryRow {
  id: string;
  dates: string;
  heading: string;
  qualifier: string;
  description: string;
}

export interface BarItem {
  id: string;
  label: string;
  pct: number;           // 0–100
}

export interface BubbleItem {
  id: string;
  label: string;
  size: number;          // 1–10
}

export interface ColumnItem {
  id: string;
  title: string;
  body: string;
}

export type DevCvSection =
  | {
      id: string;
      kind: 'intro-skills';
      title: string;
      intro: string;
      bars: BarItem[];
      bubbles: BubbleItem[];
    }
  | {
      id: string;
      kind: 'entry-list';
      title: string;
      entries: EntryRow[];
    }
  | {
      id: string;
      kind: 'columns';
      title: string;        // optional grouping title (rendered if non-empty)
      columns: ColumnItem[];
    }
  | {
      id: string;
      kind: 'text';
      title: string;
      body: string;
    };

export type DevCvSectionKind = DevCvSection['kind'];

export interface DevCvData {
  firstName: string;
  lastName: string;
  title: string;
  contacts: ContactItem[];
  sections: DevCvSection[];
}

export function emptyDevCv(): DevCvData {
  return {
    firstName: '',
    lastName: '',
    title: '',
    contacts: [],
    sections: [],
  };
}

// Re-exported for the devcv Form, which imports it from here. The single
// implementation lives in @/lib/uid and is shared with the IIMC template.
export { uid } from '@/lib/uid';

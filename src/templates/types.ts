import type { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react';
import type { PdfLine } from '@/lib/pdfExtract';

export type TemplateKey = 'superset' | 'skynet' | 'devcv';

export interface ParseResult<TData> {
  data: Partial<TData>;
  failedSections: string[];
}

export type PreviewComponent<TData> = ForwardRefExoticComponent<
  { data: TData } & RefAttributes<HTMLDivElement>
>;

export interface TemplateConfig<TData> {
  id: TemplateKey;
  label: string;
  description: string;
  /** Batch codename shown as card subtext, e.g. "Superset". */
  codename: string;
  thumbnail: string;
  emptyData: () => TData;
  sampleData: TData;
  Preview: PreviewComponent<TData>;
  Form: ComponentType<{
    data: TData;
    onChange: (patch: Partial<TData>) => void;
  }>;
  SectionsPanel?: ComponentType<{
    data: TData;
    onChange: (patch: Partial<TData>) => void;
  }>;
  parse?: (lines: PdfLine[]) => ParseResult<TData>;
  detect?: (lines: PdfLine[]) => boolean;
  /** Layout-only detection, ignoring the MBA id. Used to cross-check an
   *  id-derived choice; `detect` may consult the id and would be circular. */
  detectLayout?: (lines: PdfLine[]) => boolean;
  /** Repair a loaded draft (e.g. supply defaults for new fields, fix bad arrays). */
  hydrate?: (data: Partial<TData>) => TData;
  supportsPdfUpload: boolean;
}

export type AnyTemplateConfig = TemplateConfig<any>;

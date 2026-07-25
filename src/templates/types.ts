import type { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react';
import type { PdfLine } from '@/lib/pdfExtract';

/**
 * Template identifier.
 *
 * Deliberately a plain string rather than a union of known ids: templates are
 * data, not code, and the set grows per university. Validate at the boundary
 * with `isTemplateKey` (registry.ts) instead of relying on the type.
 */
export type TemplateKey = string;

export interface ParseResult<TData> {
  data: Partial<TData>;
  failedSections: string[];
}

export type PreviewComponent<TData> = ForwardRefExoticComponent<
  { data: TData } & RefAttributes<HTMLDivElement>
>;

/**
 * @typeParam TData  - the canonical, fully-populated resume shape.
 * @typeParam TInput - the tolerant shape `hydrate` accepts. Defaults to a
 *                     shallow partial; templates that must migrate older
 *                     persisted drafts declare a looser type of their own.
 */
export interface TemplateConfig<TData, TInput = Partial<TData>> {
  id: TemplateKey;
  label: string;
  description: string;
  thumbnail: string;
  /**
   * University that owns this template, or null for university-agnostic ones
   * (Developer CV etc.). Groups the gallery today; scopes group membership and
   * sharing permissions once accounts land.
   */
  universityId: string | null;
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
  /** Repair a loaded draft (supply defaults for new fields, migrate old shapes). */
  hydrate?: (data: TInput) => TData;
  supportsPdfUpload: boolean;
}

export type AnyTemplateConfig = TemplateConfig<any, any>;

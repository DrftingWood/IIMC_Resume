import type { TemplateConfig } from '../types';
import type { DevCvData } from './types';
import { emptyDevCv } from './types';
import { SAMPLE } from './sample';
import Preview from './Preview';
import Form from './Form';
import SectionsPanel from './SectionsPanel';

const thumbnail =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210" height="297">
      <rect width="210" height="297" fill="#fff" stroke="#cbd5e1"/>
      <rect x="14" y="20" width="50" height="14" fill="#000"/>
      <rect x="14" y="36" width="60" height="14" fill="#000"/>
      <rect x="14" y="58" width="36" height="4" fill="#475569"/>
      <rect x="80" y="22" width="60" height="3" fill="#94a3b8"/>
      <rect x="80" y="28" width="60" height="3" fill="#94a3b8"/>
      <rect x="80" y="34" width="60" height="3" fill="#94a3b8"/>
      <rect x="148" y="22" width="50" height="3" fill="#94a3b8"/>
      <rect x="148" y="28" width="50" height="3" fill="#94a3b8"/>
      <rect x="148" y="34" width="50" height="3" fill="#94a3b8"/>
      <rect x="14" y="80" width="44" height="6" fill="#000"/>
      <rect x="14" y="92" width="180" height="3" fill="#e2e8f0"/>
      <rect x="14" y="98" width="180" height="3" fill="#e2e8f0"/>
      <rect x="14" y="104" width="180" height="3" fill="#e2e8f0"/>
      <rect x="14" y="124" width="44" height="6" fill="#000"/>
      <rect x="14" y="136" width="180" height="50" fill="#f8fafc"/>
      <rect x="14" y="198" width="44" height="6" fill="#000"/>
      <rect x="14" y="210" width="180" height="50" fill="#f8fafc"/>
    </svg>`
  );

export const devcvTemplate: TemplateConfig<DevCvData> = {
  id: 'devcv',
  label: 'Developer CV',
  description: 'Single-page Developer CV with skill bars and entry list — based on the LaTeX template by Jan Vorisek.',
  thumbnail,
  emptyData: emptyDevCv,
  sampleData: SAMPLE,
  Preview,
  Form,
  SectionsPanel,
  supportsPdfUpload: false,
};

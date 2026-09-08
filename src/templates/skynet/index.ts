import type { TemplateConfig } from '../types';
import type { SkynetResumeData } from './types';
import { emptySkynetResume } from './types';
import { SAMPLE } from './sample';
import { parseResume } from './parser';
import { detectSkynet } from './detect';
import { hydrateSkynet } from './hydrate';
import Preview from './Preview';
import Form from './Form';
import SectionsPanel from './SectionsPanel';

const thumbnail =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210" height="297">
      <rect width="210" height="297" fill="#fff" stroke="#cbd5e1"/>
      <rect x="0" y="0" width="210" height="42" fill="#1e293b"/>
      <text x="14" y="20" font-family="serif" font-size="9" fill="#fff">IIM CALCUTTA</text>
      <text x="14" y="32" font-family="serif" font-size="6" fill="#cbd5e1">Placement Resume</text>
      <rect x="10" y="52" width="190" height="6" fill="#383838"/>
      <rect x="10" y="64" width="190" height="34" fill="#f1f5f9"/>
      <rect x="10" y="104" width="190" height="6" fill="#383838"/>
      <rect x="10" y="116" width="190" height="50" fill="#f8fafc"/>
      <rect x="10" y="172" width="190" height="6" fill="#383838"/>
      <rect x="10" y="184" width="190" height="70" fill="#f8fafc"/>
    </svg>`
  );

export const skynetTemplate: TemplateConfig<SkynetResumeData> = {
  id: 'skynet',
  label: '62nd batch and later',
  description: 'Skynet — the IIM Calcutta placement resume used from the 62nd batch onward.',
  codename: 'Skynet',
  thumbnail,
  emptyData: emptySkynetResume,
  sampleData: SAMPLE,
  Preview,
  Form,
  SectionsPanel,
  parse: parseResume,
  detect: detectSkynet,
  hydrate: hydrateSkynet,
  supportsPdfUpload: true,
};

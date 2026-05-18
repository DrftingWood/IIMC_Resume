import React from 'react';

function applyOrdinals(text: string, baseKey: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\d+)(st|nd|rd|th)\b/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    out.push(
      <React.Fragment key={`${baseKey}-ord-${i++}`}>
        {match[1]}
        <sup>{match[2]}</sup>
      </React.Fragment>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

export function renderInline(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      parts.push(
        <React.Fragment key={`p-${i}`}>{applyOrdinals(plain, `p-${i}`)}</React.Fragment>
      );
    }
    parts.push(
      <strong key={`b-${i}`}>{applyOrdinals(match[1], `b-${i}`)}</strong>
    );
    i++;
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={`p-tail`}>{applyOrdinals(text.slice(lastIndex), 'p-tail')}</React.Fragment>
    );
  }
  return parts;
}

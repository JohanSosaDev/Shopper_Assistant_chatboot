import { createHash } from 'node:crypto';
import type { RedactedText } from '../models/shared.js';
import { asRedactedText } from '../models/shared.js';

export interface PiiToken {
  original: string;
  token: string;
  hash: string;
}

export interface AnonymizeResult {
  text: RedactedText;
  tokens: PiiToken[];
}

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_CO_RE = /\b(?:\+57\s?)?(?:3\d{2}|6\d{2})\s?\d{3}\s?\d{4}\b/g;
const ORDER_RE = /\b(?:PP|SS|OS|AT)-\d{4}-\d{4,6}\b/g;
const CARD_RE = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;

export function anonymizePII(
  text: string,
  piiSalt: string,
): AnonymizeResult {
  const tokens: PiiToken[] = [];
  let counters = { email: 0, phone: 0, order: 0, card: 0 };

  let result = text;

  result = result.replace(EMAIL_RE, (match) => {
    counters.email++;
    const n = counters.email;
    const hash = hashToken(match, piiSalt);
    tokens.push({ original: match, token: `<EMAIL_${n}>`, hash });
    return `<EMAIL_${n}>`;
  });

  result = result.replace(PHONE_CO_RE, (match) => {
    counters.phone++;
    const n = counters.phone;
    const hash = hashToken(match, piiSalt);
    tokens.push({ original: match, token: `<PHONE_${n}>`, hash });
    return `<PHONE_${n}>`;
  });

  result = result.replace(ORDER_RE, (match) => {
    counters.order++;
    const n = counters.order;
    const hash = hashToken(match, piiSalt);
    tokens.push({ original: match, token: `<ORDER_${n}>`, hash });
    return `<ORDER_${n}>`;
  });

  result = result.replace(CARD_RE, (match) => {
    counters.card++;
    const n = counters.card;
    const hash = hashToken(match, piiSalt);
    tokens.push({ original: match, token: `<CARD_${n}>`, hash });
    return `<CARD_${n}>`;
  });

  return { text: asRedactedText(result), tokens };
}

function hashToken(value: string, salt: string): string {
  return createHash('sha256')
    .update(value.toLowerCase() + salt)
    .digest('hex');
}

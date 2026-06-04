import { createHash } from 'node:crypto';
import type { CustomerIdHash } from '../models/shared.js';

export function hashCustomerId(customerId: string, salt: string): CustomerIdHash {
  const hash = createHash('sha256')
    .update(customerId + salt)
    .digest('hex');
  return hash as CustomerIdHash;
}

export function hashEmail(email: string, salt: string): string {
  return createHash('sha256')
    .update(email.toLowerCase().trim() + salt)
    .digest('hex');
}

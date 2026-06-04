import { randomUUID } from 'node:crypto';

export function generateRequestId(): string {
  return randomUUID();
}

export function generateTurnId(): string {
  return randomUUID();
}

export function generateConversationId(): string {
  return randomUUID();
}

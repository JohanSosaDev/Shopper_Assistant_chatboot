import type { ConversationRepo } from '../repositories/conversation.repo.js';

export function createSessionCleanupJob(conversationRepo: ConversationRepo) {
  const STALE_AFTER_MS = 30 * 60 * 1000;

  return {
    name: 'session-cleanup',
    schedule: '*/30 * * * *',
    async execute(): Promise<{ closedCount: number }> {
      const olderThan = new Date(Date.now() - STALE_AFTER_MS);
      const closedCount = await conversationRepo.closeStale(olderThan);
      return { closedCount };
    },
  };
}

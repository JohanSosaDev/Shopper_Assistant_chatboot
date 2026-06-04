import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ConversationService } from '../services/conversation.service.js';
import { ChatRequestSchema } from '../models/chat.js';

export function createChatController(conversationService: ConversationService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = ChatRequestSchema.parse(request.body);

    const result = await conversationService.handleTurn({
      ...parsed,
      request_id: request.requestId,
      arrived_at: new Date().toISOString(),
    });

    reply.send(result);
  };
}

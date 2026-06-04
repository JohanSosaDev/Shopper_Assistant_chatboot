import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { ConversationService } from '../services/conversation.service.js';
import { createChatController } from '../controllers/chat.controller.js';

declare module 'fastify' {
  interface FastifyInstance {
    conversationService: ConversationService;
  }
}

export default fp<{ conversationService: ConversationService }>(
  async (fastify: FastifyInstance, opts) => {
    fastify.decorate('conversationService', opts.conversationService);

    const chatHandler = createChatController(opts.conversationService);

    fastify.post('/chat', chatHandler);
  },
  { name: 'm1-conversation' },
);

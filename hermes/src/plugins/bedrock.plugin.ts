import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export interface BedrockConfig {
  region: string;
  modelId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    bedrock: import('@anthropic-ai/bedrock-sdk').AnthropicBedrock;
  }
}

export default fp<BedrockConfig>(async (fastify: FastifyInstance, opts) => {
  const { AnthropicBedrock } = await import('@anthropic-ai/bedrock-sdk');

  const client = new AnthropicBedrock({
    awsRegion: opts.region,
    awsAccessKey: opts.accessKeyId,
    awsSecretKey: opts.secretAccessKey,
  });

  fastify.decorate('bedrock', client);
}, {
  name: 'bedrock',
});

import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';

export interface Job {
  name: string;
  schedule: string;
  execute(): Promise<Record<string, unknown>>;
}

export function registerJobs(fastify: FastifyInstance, jobs: Job[]): void {
  for (const job of jobs) {
    if (!cron.validate(job.schedule)) {
      fastify.log.warn({ job: job.name, schedule: job.schedule }, 'Invalid cron schedule');
      continue;
    }

    cron.schedule(job.schedule, async () => {
      try {
        const result = await job.execute();
        fastify.log.info({ job: job.name, result }, 'Job completed');
      } catch (err) {
        fastify.log.error({ job: job.name, err }, 'Job failed');
      }
    });

    fastify.log.info({ job: job.name, schedule: job.schedule }, 'Job registered');
  }
}

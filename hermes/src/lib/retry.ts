export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  factor: number;
  retryableErrors: (err: unknown) => boolean;
}

export class RetryExhaustedError extends Error {
  public readonly code = 'RETRY_EXHAUSTED';
  public readonly attempts: number;
  public override readonly cause: unknown;

  constructor(message: string, attempts: number, cause: unknown) {
    super(message);
    this.name = 'RetryExhaustedError';
    this.attempts = attempts;
    this.cause = cause;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs, factor, retryableErrors } = opts;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !retryableErrors(err)) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(factor, attempt - 1);
      await sleep(delay);
    }
  }

  throw new RetryExhaustedError(
    `All ${maxAttempts} attempts failed`,
    maxAttempts,
    lastError,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

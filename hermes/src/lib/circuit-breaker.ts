export interface BreakerOptions {
  failureThreshold: number;
  openMs: number;
  halfOpenMaxAttempts: number;
}

type BreakerState =
  | { status: 'closed'; failureCount: number }
  | { status: 'open'; openedAt: number }
  | { status: 'half-open'; probeAttempts: number };

const breakers = new Map<string, BreakerState>();

export class CircuitBreakerOpenError extends Error {
  public readonly code = 'CIRCUIT_BREAKER_OPEN';
  public readonly breakerName: string;

  constructor(breakerName: string) {
    super(`Circuit breaker "${breakerName}" is open`);
    this.name = 'CircuitBreakerOpenError';
    this.breakerName = breakerName;
  }
}

export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  opts: BreakerOptions,
): Promise<T> {
  const state = breakers.get(name) ?? { status: 'closed', failureCount: 0 };

  if (state.status === 'open') {
    if (Date.now() - state.openedAt >= opts.openMs) {
      breakers.set(name, { status: 'half-open', probeAttempts: 0 });
    } else {
      throw new CircuitBreakerOpenError(name);
    }
  }

  const halfOpen = state.status === 'half-open';
  if (halfOpen && state.probeAttempts >= opts.halfOpenMaxAttempts) {
    breakers.set(name, { status: 'open', openedAt: Date.now() });
    throw new CircuitBreakerOpenError(name);
  }

  try {
    const result = await fn();
    breakers.set(name, { status: 'closed', failureCount: 0 });
    return result;
  } catch (err) {
    const current = breakers.get(name);
    if (current?.status === 'half-open') {
      breakers.set(name, {
        status: 'half-open',
        probeAttempts: current.probeAttempts + 1,
      });
    } else {
      const count = (current?.status === 'closed' ? current.failureCount : 0) + 1;
      if (count >= opts.failureThreshold) {
        breakers.set(name, { status: 'open', openedAt: Date.now() });
      } else {
        breakers.set(name, { status: 'closed', failureCount: count });
      }
    }
    throw err;
  }
}

export function resetBreaker(name: string): void {
  breakers.delete(name);
}

export function resetAllBreakers(): void {
  breakers.clear();
}

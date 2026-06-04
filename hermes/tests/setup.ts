import { resetAllBreakers } from '../src/lib/circuit-breaker.js';

beforeEach(() => {
  resetAllBreakers();
});

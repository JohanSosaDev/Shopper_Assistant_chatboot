// errors.ts
// HermesError hierarchy + Result type helper.
// nfr-design-patterns.md §6.2 (error hierarchy) + §6.4 (Result pattern).
// SECURITY-15 fail-closed: errores no categorizados → InternalError → fail-closed.

// ===========================================================================
// Result type (para errores recuperables)
// ===========================================================================

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = HermesError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

// ===========================================================================
// Base error
// ===========================================================================

export interface HermesErrorOptions {
  /** Causa subyacente cuando wrap'd. */
  cause?: unknown;
  /** Si el error es retryable por la lib retry. Default per subclass. */
  retryable?: boolean;
  /** Contexto adicional para logging. NUNCA incluir PII raw aquí. */
  context?: Record<string, unknown>;
}

export abstract class HermesError extends Error {
  /** Código discriminator para narrowing por discriminated union. */
  public abstract readonly code: string;
  /** HTTP status code apropiado (mapeado por CC-2 global error handler). */
  public abstract readonly httpStatus: number;
  /** Mensaje user-facing genérico (NUNCA incluir details internos). */
  public abstract readonly userFacingMessage: string;
  /** Si la operación puede reintentarse (R-TOOL-1). */
  public readonly retryable: boolean;
  /** Contexto estructurado para logging. */
  public readonly context: Record<string, unknown>;
  /** Causa subyacente cuando wrap'd. */
  public override readonly cause?: unknown;

  constructor(message: string, options: HermesErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.cause = options.cause;
    this.retryable = options.retryable ?? false;
    this.context = options.context ?? {};
  }
}

// ===========================================================================
// Validation errors (4xx — cliente puede corregir)
// ===========================================================================

export class ValidationError extends HermesError {
  public readonly code = 'VALIDATION_ERROR';
  public readonly httpStatus = 400;
  public readonly userFacingMessage = 'Datos inválidos en la solicitud.';
}

// ===========================================================================
// Identity errors
// ===========================================================================

export class IdentityError extends HermesError {
  public readonly code = 'IDENTITY_ERROR';
  public readonly httpStatus = 401;
  public readonly userFacingMessage =
    'No pudimos verificar su identidad. Intente con otro número de pedido o correo.';
}

// ===========================================================================
// Consent flow errors (no son HTTP errors típicos; el flow continúa con respuesta)
// ===========================================================================

export class ConsentDeniedError extends HermesError {
  public readonly code = 'CONSENT_DENIED';
  public readonly httpStatus = 200; // No es error HTTP; flow continúa con texto
  public readonly userFacingMessage =
    'Sin su autorización no podemos continuar. Puede contactarnos por correo.';
}

// ===========================================================================
// Guardrail blocks
// ===========================================================================

export class GuardrailBlockedError extends HermesError {
  public readonly code = 'GUARDRAIL_BLOCKED';
  public readonly httpStatus = 200; // Respuesta neutral al cliente
  public readonly userFacingMessage = 'No puedo ayudarle con eso. ¿Hay algo más?';
}

// ===========================================================================
// Rate limit
// ===========================================================================

export class RateLimitError extends HermesError {
  public readonly code = 'RATE_LIMIT';
  public readonly httpStatus = 429;
  public readonly userFacingMessage =
    'Está escribiendo muy rápido. Por favor, espere un momento.';

  constructor(public readonly retryAfterSeconds: number, message = 'Rate limit exceeded') {
    super(message, { context: { retryAfterSeconds } });
  }
}

// ===========================================================================
// External service errors (retryable)
// ===========================================================================

export class BedrockError extends HermesError {
  public readonly code = 'BEDROCK_ERROR';
  public readonly httpStatus = 503;
  public readonly userFacingMessage =
    'Estamos teniendo un problema técnico. Intente en unos minutos.';

  constructor(message: string, options: HermesErrorOptions = {}) {
    super(message, { ...options, retryable: options.retryable ?? true });
  }
}

export class SfccError extends HermesError {
  public readonly code = 'SFCC_ERROR';
  public readonly httpStatus = 503;
  public readonly userFacingMessage =
    'Estamos teniendo un problema técnico. Intente en unos minutos.';

  constructor(
    message: string,
    public readonly errorClass: 'timeout' | '5xx' | '4xx' | 'network' | 'circuit_breaker_open',
    options: HermesErrorOptions = {},
  ) {
    super(message, {
      ...options,
      retryable: options.retryable ?? (errorClass === 'timeout' || errorClass === '5xx' || errorClass === 'network'),
      context: { ...(options.context ?? {}), errorClass },
    });
  }
}

export class ToolUnavailableError extends HermesError {
  public readonly code = 'TOOL_UNAVAILABLE';
  public readonly httpStatus = 200; // Pipeline early-exit con neutral fallback
  public readonly userFacingMessage =
    'Estamos teniendo un problema técnico. Intente en unos minutos.';

  constructor(
    public readonly toolName: string,
    public readonly underlyingErrorClass: string,
  ) {
    super(`Tool ${toolName} unavailable: ${underlyingErrorClass}`, {
      context: { toolName, underlyingErrorClass },
    });
  }
}

// ===========================================================================
// Config / startup errors (fail-fast)
// ===========================================================================

export class ConfigError extends HermesError {
  public readonly code = 'CONFIG_ERROR';
  public readonly httpStatus = 500;
  public readonly userFacingMessage = 'Error de configuración del servidor.';
}

// ===========================================================================
// Catch-all internal (SECURITY-15 fail-closed)
// ===========================================================================

export class InternalError extends HermesError {
  public readonly code = 'INTERNAL_ERROR';
  public readonly httpStatus = 500;
  public readonly userFacingMessage =
    'Estamos teniendo un problema técnico. Intente en unos minutos.';
}

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Wrap un error desconocido como HermesError. Usado en catch blocks para
 * normalizar cualquier excepción a la jerarquía.
 *
 * @example
 *   try { await externalCall(); }
 *   catch (e) { throw normalizeError(e, 'Bedrock invoke failed'); }
 */
export function normalizeError(cause: unknown, message: string): HermesError {
  if (cause instanceof HermesError) {
    return cause;
  }
  return new InternalError(message, { cause });
}

/** Type guard para discriminated narrowing. */
export function isHermesError(value: unknown): value is HermesError {
  return value instanceof HermesError;
}

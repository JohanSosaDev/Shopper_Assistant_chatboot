export interface InputGuardrailResult {
  blocked: boolean;
  violations: InputViolation[];
}

export interface InputViolation {
  category: 'role_redefinition' | 'prompt_extraction' | 'persona_injection' | 'token_stuffing' | 'markdown_html_escape';
  pattern_matched: string;
  severity: 'low' | 'medium' | 'high';
}

const ROLE_REDEFINITION = /\b(ignore|forget|disregard)\s+(all\s+)?(your\s+)?(previous\s+)?(instructions|prompts|rules)\b/i;
const PROMPT_EXTRACTION = /\b(show|reveal|print|tell\s+me)\s+(your\s+)?(system|initial|hidden)\s+(prompt|instructions)\b/i;
const PERSONA_INJECTION = /\bact\s+as\s+(an?\s+)?(developer|admin|root|system)\b/i;
const MARKDOWN_HTML_ESCAPE = /<script|<iframe|javascript:/i;

function checkPatterns(text: string): InputViolation[] {
  const violations: InputViolation[] = [];

  if (ROLE_REDEFINITION.test(text)) {
    violations.push({
      category: 'role_redefinition',
      pattern_matched: 'role_redefinition',
      severity: 'high',
    });
  }

  if (PROMPT_EXTRACTION.test(text)) {
    violations.push({
      category: 'prompt_extraction',
      pattern_matched: 'prompt_extraction',
      severity: 'high',
    });
  }

  if (PERSONA_INJECTION.test(text)) {
    violations.push({
      category: 'persona_injection',
      pattern_matched: 'persona_injection',
      severity: 'high',
    });
  }

  if (MARKDOWN_HTML_ESCAPE.test(text)) {
    violations.push({
      category: 'markdown_html_escape',
      pattern_matched: 'markdown_html_escape',
      severity: 'high',
    });
  }

  if (text.length > 4000) {
    violations.push({
      category: 'token_stuffing',
      pattern_matched: 'token_stuffing_max_length',
      severity: 'medium',
    });
  }

  return violations;
}

export function checkInputGuardrails(input: string): InputGuardrailResult {
  const violations = checkPatterns(input);

  return {
    blocked: violations.length > 0,
    violations,
  };
}

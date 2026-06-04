export interface ToolSpec<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  execute(input: TInput): Promise<TOutput>;
}

export function createToolRegistry() {
  const tools = new Map<string, ToolSpec>();

  function register(spec: ToolSpec): void {
    if (tools.has(spec.name)) {
      throw new Error(`Tool "${spec.name}" already registered`);
    }
    tools.set(spec.name, spec);
  }

  function get(name: string): ToolSpec | undefined {
    return tools.get(name);
  }

  function getAll(): ToolSpec[] {
    return Array.from(tools.values());
  }

  function toBedrockTools(): Array<{ name: string; description: string; input_schema: Record<string, unknown> }> {
    return getAll().map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: { type: 'object', properties: {} },
    }));
  }

  return { register, get, getAll, toBedrockTools };
}

export type ToolRegistry = ReturnType<typeof createToolRegistry>;

export interface KnowledgeService {
  search(query: string, brand: string): Promise<unknown[]>;
}

export function createKnowledgeService(): KnowledgeService {
  return {
    async search(_query: string, _brand: string): Promise<unknown[]> {
      return [];
    },
  };
}

export const windoDefinitionQueryKeys = {
  all: () => ["windo-definition"] as const,
  catalog: () => [...windoDefinitionQueryKeys.all(), "catalog"] as const,
};

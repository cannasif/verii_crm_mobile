export interface WindoDefinitionDto {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive?: boolean;
  profilDefinitionId?: number | null;
  profilDefinitionName?: string | null;
}

export interface WindoDefinitionOption {
  id: number;
  name: string;
  code?: string;
  profilDefinitionId?: number | null;
  profilDefinitionName?: string | null;
}

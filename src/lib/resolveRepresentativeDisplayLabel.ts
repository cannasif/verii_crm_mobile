export interface RepresentativeLookupUser {
  userId: number;
  firstName?: string | null;
  lastName?: string | null;
}

export function resolveRepresentativeDisplayLabel(params: {
  representativeId?: number | null;
  representativeName?: string | null;
  relatedUsers?: RepresentativeLookupUser[] | null;
  emptyLabel: string;
}): string {
  const { representativeId, representativeName, relatedUsers, emptyLabel } = params;

  if (representativeId == null || representativeId <= 0) {
    return emptyLabel;
  }

  const fromRelated = relatedUsers?.find((user) => user.userId === representativeId);
  if (fromRelated) {
    const name = `${fromRelated.firstName ?? ""} ${fromRelated.lastName ?? ""}`.trim();
    if (name) return name;
  }

  const fromHeader = representativeName?.trim();
  if (fromHeader) return fromHeader;

  return String(representativeId);
}

export interface DocumentDetailReadOnlyState {
  status: number | null;
  isApprovalWaiting: boolean;
  isReadOnlyByStatus: boolean;
  isApprovalLockedForCurrentUser: boolean;
  isReadOnly: boolean;
  showApprovalLockBanner: boolean;
}

const READ_ONLY_STATUSES = [2, 3, 4, 5, 6, 7] as const;

export function computeDocumentDetailReadOnly(
  status: number | null | undefined,
  canEditWhileWaiting: boolean | undefined
): DocumentDetailReadOnlyState {
  const resolvedStatus = status ?? null;
  const isApprovalWaiting = resolvedStatus === 1;
  const isReadOnlyByStatus =
    resolvedStatus != null &&
    (READ_ONLY_STATUSES as readonly number[]).includes(resolvedStatus);
  const isApprovalLockedForCurrentUser =
    isApprovalWaiting && canEditWhileWaiting === false;
  const isReadOnly = isReadOnlyByStatus || isApprovalLockedForCurrentUser;

  return {
    status: resolvedStatus,
    isApprovalWaiting,
    isReadOnlyByStatus,
    isApprovalLockedForCurrentUser,
    isReadOnly,
    showApprovalLockBanner: isApprovalLockedForCurrentUser,
  };
}

export function isDocumentDetailReadOnlyWhileLoading(
  state: DocumentDetailReadOnlyState,
  canEditLoading: boolean
): boolean {
  return state.isReadOnly || (state.isApprovalWaiting && canEditLoading);
}

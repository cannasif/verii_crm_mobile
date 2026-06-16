import type { TFunction } from "i18next";

export type DocumentApprovalModule = "quotation" | "demand" | "order";

export interface DocumentApprovalStatusMeta {
  label: string;
  shortLabel: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

export function hasExpandableDocumentApprovalStatusLabel(meta: DocumentApprovalStatusMeta): boolean {
  return meta.label.trim().toLocaleUpperCase("tr-TR") !== meta.shortLabel.trim().toLocaleUpperCase("tr-TR");
}

export function resolveDocumentApprovalStatusMeta(
  status: number | null | undefined,
  isDark: boolean,
  t: TFunction,
  module: DocumentApprovalModule
): DocumentApprovalStatusMeta {
  const palettes = {
    draft: {
      color: isDark ? "#94A3B8" : "#64748B",
      backgroundColor: isDark ? "rgba(148,163,184,0.14)" : "#F8FAFC",
    },
    pending: {
      color: isDark ? "#fbbf24" : "#D97706",
      backgroundColor: isDark ? "rgba(251,191,36,0.16)" : "rgba(245,158,11,0.12)",
    },
    approved: {
      color: isDark ? "#34d399" : "#059669",
      backgroundColor: isDark ? "rgba(52,211,153,0.16)" : "rgba(16,185,129,0.12)",
    },
    rejected: {
      color: isDark ? "#f472b6" : "#DB2777",
      backgroundColor: isDark ? "rgba(244,114,182,0.16)" : "rgba(219,39,119,0.10)",
    },
    closed: {
      color: isDark ? "#94A3B8" : "#475569",
      backgroundColor: isDark ? "rgba(148,163,184,0.14)" : "#F1F5F9",
    },
    customerCancelled: {
      color: isDark ? "#f472b6" : "#be123c",
      backgroundColor: isDark ? "rgba(244,114,182,0.16)" : "rgba(244,63,94,0.10)",
    },
    salespersonClosedForRevision: {
      color: isDark ? "#fb923c" : "#c2410c",
      backgroundColor: isDark ? "rgba(251,146,60,0.16)" : "rgba(249,115,22,0.10)",
    },
    supersededByApprovedRevision: {
      color: isDark ? "#818cf8" : "#4f46e5",
      backgroundColor: isDark ? "rgba(129,140,248,0.16)" : "rgba(99,102,241,0.10)",
    },
    unknown: {
      color: isDark ? "#94A3B8" : "#64748B",
      backgroundColor: isDark ? "rgba(255,255,255,0.035)" : "#F8FAFC",
    },
  } as const;

  const pick = (
    palette: (typeof palettes)[keyof typeof palettes],
    label: string,
    shortLabel: string = label
  ): DocumentApprovalStatusMeta => ({
    label,
    shortLabel,
    color: palette.color,
    backgroundColor: palette.backgroundColor,
    borderColor: `${palette.color}35`,
  });

  switch (status) {
    case 0:
      return pick(palettes.draft, t(`${module}.status.notStarted`, "Taslak"));
    case 1:
      return pick(palettes.pending, t(`${module}.status.pending`, "Onayda"));
    case 2:
      return pick(palettes.approved, t(`${module}.status.approved`, "Onaylandı"));
    case 3:
      return pick(palettes.rejected, t(`${module}.status.rejected`, "Reddedildi"));
    case 4:
      return pick(palettes.closed, t("common.statusClosed", "Kapatıldı"));
    case 5:
      return pick(palettes.customerCancelled, t("common.customerCancelled", "İptal edildi"));
    case 6:
      return pick(
        palettes.salespersonClosedForRevision,
        t("common.salespersonClosedForRevision", "ERP kaydı revizyon için plasiyer tarafından kapatıldı"),
        t("common.salespersonClosedForRevisionShort", "ERP REV. KAPAT.")
      );
    case 7:
      return pick(
        palettes.supersededByApprovedRevision,
        t("common.supersededByApprovedRevision", "Onaylanan revizyon nedeniyle kapatıldı"),
        t("common.supersededByApprovedRevisionShort", "ON. REV. KAPAT.")
      );
    default:
      return pick(palettes.unknown, "-");
  }
}

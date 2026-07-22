import { StyleSheet } from "react-native";
import type { WarehouseBalanceTone } from "../types";

export function getWarehouseBalanceToneColors(
  tone: WarehouseBalanceTone,
  isDark: boolean
): {
  border: string;
  background: string;
  text: string;
  headerBackground: string;
} {
  if (tone === "negative") {
    return isDark
      ? {
          border: "rgba(239, 68, 68, 0.45)",
          background: "rgba(127, 29, 29, 0.35)",
          text: "#FECACA",
          headerBackground: "rgba(127, 29, 29, 0.42)",
        }
      : {
          border: "rgba(252, 165, 165, 0.8)",
          background: "#FEF2F2",
          text: "#991B1B",
          headerBackground: "#FEE2E2",
        };
  }

  return isDark
    ? {
        border: "rgba(16, 185, 129, 0.45)",
        background: "rgba(6, 78, 59, 0.35)",
        text: "#A7F3D0",
        headerBackground: "rgba(6, 78, 59, 0.42)",
      }
    : {
        border: "rgba(110, 231, 183, 0.8)",
        background: "#ECFDF5",
        text: "#065F46",
        headerBackground: "#D1FAE5",
      };
}

export const warehouseBalanceBadgeStyles = StyleSheet.create({
  skeleton: {
    width: 88,
    height: 24,
    borderRadius: 999,
  },
  pill: {
    alignSelf: "flex-start",
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pillCompact: {
    height: 22,
    paddingHorizontal: 7,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  requestButton: {
    alignSelf: "flex-start",
    minWidth: 64,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  requestButtonText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
  },
});

export const warehouseBalanceSheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: "72%",
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  headerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerValue: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginBottom: 2,
  },
  headerMeta: {
    fontSize: 11,
    fontWeight: "500",
  },
  listScroll: {
    maxHeight: 220,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  rowWarehouse: {
    fontSize: 13,
    fontWeight: "600",
  },
  rowBranch: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  rowBalance: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  closeArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  closeButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

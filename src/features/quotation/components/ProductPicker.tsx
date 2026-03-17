import React, {
  useCallback,
  useState,
  useMemo,
  useEffect,
  memo,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { VoiceSearchButton } from "./VoiceSearchButton";
import { PickerModal } from "./PickerModal";
import {
  useStocks,
  useStock,
  useStockRelations,
  useStockRelationsAsRelated,
} from "../../stocks/hooks";
import { buildAdvancedStockFilters } from "../../stocks/utils/buildAdvancedStockFilters";
import type { StockGetDto, StockRelationDto } from "../../stocks/types";

const STOCK_FILTER_COLUMNS = [
  { value: "Id", type: "number", labelKey: "filterId" },
  { value: "ErpStockCode", type: "string", labelKey: "filterCode" },
  { value: "StockName", type: "string", labelKey: "filterName" },
  { value: "GrupKodu", type: "string", labelKey: "filterGroupCode" },
  { value: "GrupAdi", type: "string", labelKey: "filterGroupName" },
  { value: "Kod1", type: "string", labelKey: "filterCode1" },
  { value: "Kod1Adi", type: "string", labelKey: "filterCode1Name" },
  { value: "Kod2", type: "string", labelKey: "filterCode2" },
  { value: "Kod2Adi", type: "string", labelKey: "filterCode2Name" },
  { value: "Kod3", type: "string", labelKey: "filterCode3" },
  { value: "Kod3Adi", type: "string", labelKey: "filterCode3Name" },
  { value: "Kod4", type: "string", labelKey: "filterCode4" },
  { value: "Kod4Adi", type: "string", labelKey: "filterCode4Name" },
  { value: "Kod5", type: "string", labelKey: "filterCode5" },
  { value: "Kod5Adi", type: "string", labelKey: "filterCode5Name" },
  { value: "UreticiKodu", type: "string", labelKey: "filterManufacturerCode" },
  { value: "unit", type: "string", labelKey: "filterUnit" },
  { value: "BranchCode", type: "number", labelKey: "filterBranchCode" },
] as const;

const STRING_OPERATORS = ["contains", "startsWith", "endsWith", "eq"] as const;
const NUMBER_OPERATORS = ["eq", "gt", "gte", "lt", "lte"] as const;

type StockFilterColumnValue = (typeof STOCK_FILTER_COLUMNS)[number]["value"];
type AdvancedFilterOperator = (typeof STRING_OPERATORS)[number] | (typeof NUMBER_OPERATORS)[number];

type AdvancedFilterRow = {
  id: string;
  column: StockFilterColumnValue;
  operator: AdvancedFilterOperator;
  value: string;
};

function generateFilterRowId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getColumnConfig(column: StockFilterColumnValue) {
  return STOCK_FILTER_COLUMNS.find((item) => item.value === column) ?? STOCK_FILTER_COLUMNS[0];
}

function getOperatorsForColumn(column: StockFilterColumnValue): readonly AdvancedFilterOperator[] {
  return getColumnConfig(column).type === "number" ? NUMBER_OPERATORS : STRING_OPERATORS;
}

function getDefaultOperatorForColumn(column: StockFilterColumnValue): AdvancedFilterOperator {
  return getColumnConfig(column).type === "number" ? "eq" : "contains";
}

function createFilterRow(column: StockFilterColumnValue = "StockName"): AdvancedFilterRow {
  return {
    id: generateFilterRowId(),
    column,
    operator: getDefaultOperatorForColumn(column),
    value: "",
  };
}

export interface ProductPickerRef {
  close: () => void;
}

export interface RelatedStocksSelectionProps {
  stock: StockGetDto & { parentRelations: StockRelationDto[] };
  onCancel: () => void;
  onApply: (selectedIds: number[]) => void;
}

interface ProductPickerProps {
  value?: string;
  productName?: string;
  onChange: (stock: StockGetDto | undefined) => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  parentVisible?: boolean;
  relatedStocksSelection?: RelatedStocksSelectionProps | null;
}

function normalizeSearchText(value: string): string {
  return (value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function compact(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function sortTokens(value: string): string {
  return tokenize(value)
    .sort((a, b) => a.localeCompare(b, "tr"))
    .join(" ");
}

function damerauLevenshtein(a: string, b: string): number {
  const alen = a.length;
  const blen = b.length;

  if (alen === 0) return blen;
  if (blen === 0) return alen;

  const dp: number[][] = Array.from({ length: alen + 1 }, () =>
    Array(blen + 1).fill(0)
  );

  for (let i = 0; i <= alen; i++) dp[i][0] = i;
  for (let j = 0; j <= blen; j++) dp[0][j] = j;

  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }

  return dp[alen][blen];
}

function isSubsequence(query: string, target: string): boolean {
  if (!query) return true;

  let qi = 0;
  let ti = 0;

  while (qi < query.length && ti < target.length) {
    if (query[qi] === target[ti]) qi++;
    ti++;
  }

  return qi === query.length;
}

function charFrequencySimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const fa = new Map<string, number>();
  const fb = new Map<string, number>();

  for (const ch of a) fa.set(ch, (fa.get(ch) || 0) + 1);
  for (const ch of b) fb.set(ch, (fb.get(ch) || 0) + 1);

  let intersection = 0;
  let total = 0;

  const keys = new Set([...fa.keys(), ...fb.keys()]);
  for (const key of keys) {
    const av = fa.get(key) || 0;
    const bv = fb.get(key) || 0;
    intersection += Math.min(av, bv);
    total += Math.max(av, bv);
  }

  if (total === 0) return 0;
  return intersection / total;
}

function tokenSetCoverage(queryTokens: string[], fieldTokens: string[]): number {
  if (queryTokens.length === 0 || fieldTokens.length === 0) return 0;

  let matched = 0;

  for (const q of queryTokens) {
    const hasMatch = fieldTokens.some((f) => {
      if (f === q) return true;
      if (f.startsWith(q) || f.includes(q)) return true;
      if (q.length >= 3 && isSubsequence(q, f)) return true;
      const dist = damerauLevenshtein(q, f);
      return dist <= (q.length <= 4 ? 1 : 2);
    });

    if (hasMatch) matched++;
  }

  return matched / queryTokens.length;
}

function scoreWordAgainstField(word: string, field: string): number {
  if (!word || !field) return 0;

  if (field === word) return 280;
  if (field.startsWith(word)) return 220;
  if (field.includes(word)) return 180;

  const compactField = compact(field);
  const compactWord = compact(word);

  if (!compactWord || !compactField) return 0;

  if (compactField === compactWord) return 270;
  if (compactField.startsWith(compactWord)) return 210;
  if (compactField.includes(compactWord)) return 170;

  if (word.length >= 3 && isSubsequence(compactWord, compactField)) return 120;

  const compareSlice = compactField.slice(
    0,
    Math.min(compactField.length, compactWord.length + 2)
  );
  const distance = damerauLevenshtein(compactWord, compareSlice);

  if (distance === 1) return 150;
  if (distance === 2) return 105;
  if (distance === 3 && compactWord.length >= 7) return 70;

  const freqSim = charFrequencySimilarity(compactWord, compareSlice);
  if (freqSim >= 0.9) return 95;
  if (freqSim >= 0.8) return 70;
  if (freqSim >= 0.7) return 45;

  return 0;
}

function scoreWholeQueryAgainstField(query: string, field: string): number {
  if (!query || !field) return 0;

  const normalizedQuery = normalizeSearchText(query);
  const normalizedField = normalizeSearchText(field);

  if (!normalizedQuery || !normalizedField) return 0;

  if (normalizedField === normalizedQuery) return 380;
  if (normalizedField.startsWith(normalizedQuery)) return 300;
  if (normalizedField.includes(normalizedQuery)) return 250;

  const compactQuery = compact(normalizedQuery);
  const compactField = compact(normalizedField);

  if (compactField === compactQuery) return 360;
  if (compactField.startsWith(compactQuery)) return 290;
  if (compactField.includes(compactQuery)) return 235;

  const sortedQuery = sortTokens(normalizedQuery);
  const sortedField = sortTokens(normalizedField);

  if (sortedQuery && sortedField && sortedField === sortedQuery) return 325;
  if (sortedQuery && sortedField && sortedField.includes(sortedQuery)) return 250;

  if (compactQuery.length >= 3 && isSubsequence(compactQuery, compactField)) return 160;

  const distance = damerauLevenshtein(
    compactQuery,
    compactField.slice(0, Math.min(compactField.length, compactQuery.length + 3))
  );

  if (distance === 1) return 210;
  if (distance === 2) return 160;
  if (distance === 3 && compactQuery.length >= 8) return 110;

  const freqSim = charFrequencySimilarity(
    compactQuery,
    compactField.slice(0, compactQuery.length + 3)
  );
  if (freqSim >= 0.9) return 140;
  if (freqSim >= 0.8) return 100;
  if (freqSim >= 0.7) return 65;

  return 0;
}

function scoreFieldWithTokens(field: string, query: string): number {
  const queryTokens = tokenize(query);
  const fieldTokens = tokenize(field);

  if (queryTokens.length === 0 || fieldTokens.length === 0) return 0;

  let total = 0;
  let matchedCount = 0;

  for (const q of queryTokens) {
    let best = 0;
    for (const f of fieldTokens) {
      const score = scoreWordAgainstField(q, f);
      if (score > best) best = score;
    }
    if (best > 0) {
      matchedCount++;
      total += best;
    }
  }

  const coverage = tokenSetCoverage(queryTokens, fieldTokens);
  if (coverage >= 1) total += 120;
  else if (coverage >= 0.8) total += 80;
  else if (coverage >= 0.6) total += 45;

  if (matchedCount === 0) return 0;
  return total;
}

function scoreStock(stock: StockGetDto, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 1;

  const name = stock.stockName || "";
  const code = stock.erpStockCode || "";
  const groupCode = stock.grupKodu || "";
  const groupName = stock.grupAdi || "";
  const code1 = [stock.kod1, stock.kod1Adi].filter(Boolean).join(" ");
  const code2 = [stock.kod2, stock.kod2Adi].filter(Boolean).join(" ");
  const code3 = stock.kod3 || "";
  const code4 = stock.kod4 || "";
  const code5 = stock.kod5 || "";
  const manufacturerCode = stock.ureticiKodu || "";

  const wholeName = scoreWholeQueryAgainstField(normalizedQuery, name) + 35;
  const wholeCode = scoreWholeQueryAgainstField(normalizedQuery, code) + 20;
  const wholeGroupCode = scoreWholeQueryAgainstField(normalizedQuery, groupCode) + 12;
  const wholeGroupName = scoreWholeQueryAgainstField(normalizedQuery, groupName) + 10;
  const wholeCode1 = scoreWholeQueryAgainstField(normalizedQuery, code1) + 16;
  const wholeCode2 = scoreWholeQueryAgainstField(normalizedQuery, code2) + 16;
  const wholeCode3 = scoreWholeQueryAgainstField(normalizedQuery, code3) + 12;
  const wholeCode4 = scoreWholeQueryAgainstField(normalizedQuery, code4) + 10;
  const wholeCode5 = scoreWholeQueryAgainstField(normalizedQuery, code5) + 10;
  const wholeManufacturerCode =
    scoreWholeQueryAgainstField(normalizedQuery, manufacturerCode) + 8;

  const tokenName = scoreFieldWithTokens(name, normalizedQuery) + 25;
  const tokenCode = scoreFieldWithTokens(code, normalizedQuery) + 15;
  const tokenGroupCode = scoreFieldWithTokens(groupCode, normalizedQuery) + 10;
  const tokenGroupName = scoreFieldWithTokens(groupName, normalizedQuery) + 8;
  const tokenCode1 = scoreFieldWithTokens(code1, normalizedQuery) + 12;
  const tokenCode2 = scoreFieldWithTokens(code2, normalizedQuery) + 12;
  const tokenCode3 = scoreFieldWithTokens(code3, normalizedQuery) + 10;
  const tokenCode4 = scoreFieldWithTokens(code4, normalizedQuery) + 8;
  const tokenCode5 = scoreFieldWithTokens(code5, normalizedQuery) + 8;
  const tokenManufacturerCode =
    scoreFieldWithTokens(manufacturerCode, normalizedQuery) + 6;

  let score = Math.max(
    wholeName,
    wholeCode,
    wholeGroupCode,
    wholeGroupName,
    wholeCode1,
    wholeCode2,
    wholeCode3,
    wholeCode4,
    wholeCode5,
    wholeManufacturerCode,
    tokenName,
    tokenCode,
    tokenGroupCode,
    tokenGroupName,
    tokenCode1,
    tokenCode2,
    tokenCode3,
    tokenCode4,
    tokenCode5,
    tokenManufacturerCode
  );

  const combinedField = [
    name,
    code,
    groupCode,
    groupName,
    code1,
    code2,
    code3,
    code4,
    code5,
    manufacturerCode,
  ]
    .filter(Boolean)
    .join(" ");

  const combinedWhole = scoreWholeQueryAgainstField(normalizedQuery, combinedField);
  const combinedToken = scoreFieldWithTokens(combinedField, normalizedQuery);
  score = Math.max(score, combinedWhole + 18, combinedToken + 12);

  const queryTokens = tokenize(normalizedQuery);
  const fullTextTokens = tokenize(combinedField);
  const coverage = tokenSetCoverage(queryTokens, fullTextTokens);

  if (coverage >= 1) score += 65;
  else if (coverage >= 0.8) score += 40;
  else if (coverage >= 0.6) score += 20;

  return score;
}

function filterAndRankStocksLocal(stocks: StockGetDto[], query: string): StockGetDto[] {
  const uniqueStocks = stocks.filter((stock, index, array) => {
    return array.findIndex((candidate) => candidate.id === stock.id) === index;
  });

  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [...uniqueStocks].sort((a, b) =>
      (a.stockName || "").localeCompare(b.stockName || "", "tr")
    );
  }

  return uniqueStocks
    .map((stock) => ({
      stock,
      score: scoreStock(stock, normalizedQuery),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aName = a.stock.stockName || "";
      const bName = b.stock.stockName || "";
      return aName.localeCompare(bName, "tr");
    })
    .map((item) => item.stock);
}

function getRelationDisplayName(relation: StockRelationDto, currentStockId?: number): string {
  if (relation.relatedStockName) return relation.relatedStockName;
  if (relation.relatedStockCode) return relation.relatedStockCode;

  if (currentStockId && relation.relatedStockId === currentStockId) {
    return `#${relation.stockId}`;
  }

  return `#${relation.relatedStockId}`;
}

function formatStockBalance(item: StockGetDto): string | null {
  if (item.balanceText?.trim()) return item.balanceText.trim();
  if (typeof item.balance === "number" && Number.isFinite(item.balance)) {
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(item.balance);
  }
  return null;
}

function getStockMetaRows(
  item: StockGetDto,
  t: (key: string) => string
): Array<{ label: string; value: string }> {
  return [
    item.grupKodu || item.grupAdi
      ? { label: t("stockPicker.group"), value: [item.grupKodu, item.grupAdi].filter(Boolean).join(" · ") }
      : null,
    item.kod1 || item.kod1Adi
      ? { label: t("stockPicker.code1"), value: [item.kod1, item.kod1Adi].filter(Boolean).join(" · ") }
      : null,
    item.kod2 || item.kod2Adi
      ? { label: t("stockPicker.code2"), value: [item.kod2, item.kod2Adi].filter(Boolean).join(" · ") }
      : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
}

function StockListItem({
  item,
  isSelected,
  onSelect,
  onShowRelationDetail,
  modalOpen,
}: {
  item: StockGetDto;
  isSelected: boolean;
  onSelect: () => void;
  onShowRelationDetail: (stock: StockGetDto, relations: StockRelationDto[]) => void;
  modalOpen: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const metaRows = useMemo(() => getStockMetaRows(item, t), [item, t]);
  const balance = formatStockBalance(item);

  const { data: stockDetail } = useStock(modalOpen ? item.id : undefined);
  const { data: relationsData } = useStockRelations({
    stockId: modalOpen ? item.id : undefined,
  });
  const { data: relationsAsRelatedData } = useStockRelationsAsRelated(modalOpen ? item.id : undefined);

  const relationsList = useMemo((): StockRelationDto[] => {
    if (stockDetail?.parentRelations && stockDetail.parentRelations.length > 0) {
      return stockDetail.parentRelations;
    }

    const asParent = relationsData?.pages?.[0]?.items;
    if (Array.isArray(asParent) && asParent.length > 0) return asParent;

    const asRelated = relationsAsRelatedData?.items;
    return Array.isArray(asRelated) ? asRelated : [];
  }, [stockDetail?.parentRelations, relationsData?.pages, relationsAsRelatedData?.items]);

  const relationCount = relationsList.length;
  const showBadge = relationCount > 0;

  return (
    <View
      style={[
        styles.stockItem,
        { borderBottomColor: borderColor },
        isSelected && {
          backgroundColor: isDark ? "rgba(236,72,153,0.08)" : "rgba(219,39,119,0.06)",
        },
      ]}
    >
      <TouchableOpacity style={styles.stockItemTouchable} onPress={onSelect} activeOpacity={0.75}>
        <View style={styles.stockInfoRow}>
          <View
            style={[
              styles.stockIconWrap,
              {
                backgroundColor: isDark ? "rgba(236,72,153,0.14)" : "rgba(219,39,119,0.10)",
                borderColor: isDark ? "rgba(236,72,153,0.24)" : "rgba(219,39,119,0.16)",
              },
            ]}
          >
            <MaterialCommunityIcons name="package-variant-closed" size={18} color={brandColor} />
          </View>

          <View style={styles.stockInfo}>
            <Text style={[styles.stockName, { color: textColor }]} numberOfLines={1}>
              {item.stockName}
            </Text>
            <Text style={[styles.stockCode, { color: mutedColor }]} numberOfLines={1}>
              {item.erpStockCode}
            </Text>
            {metaRows.map((row) => (
              <Text key={row.label} style={[styles.stockMeta, { color: mutedColor }]} numberOfLines={1}>
                {row.label}: {row.value}
              </Text>
            ))}
            {balance ? (
              <Text style={[styles.stockMeta, { color: brandColor }]} numberOfLines={1}>
                {t("stockPicker.balance")}: {balance}
              </Text>
            ) : null}
          </View>
        </View>

        {isSelected ? (
          <View style={[styles.checkmark, { backgroundColor: brandColor }]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={mutedColor} />
        )}
      </TouchableOpacity>

      {showBadge && (
        <TouchableOpacity
          style={[
            styles.relatedStockBadge,
            {
              backgroundColor: isDark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.08)",
              borderColor: isDark ? "rgba(236,72,153,0.24)" : "rgba(219,39,119,0.16)",
            },
          ]}
          onPress={() => onShowRelationDetail(item, relationsList)}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="source-branch" size={14} color={brandColor} />
          <Text style={[styles.relatedStockBadgeText, { color: brandColor }]}>
            {relationCount} {t("quotation.relatedStocks")}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={brandColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const MemoizedStockListItem = memo(StockListItem);

function ProductPickerInner(
  {
    value,
    productName,
    onChange,
    disabled = false,
    label,
    required = false,
    parentVisible = true,
    relatedStocksSelection = null,
  }: ProductPickerProps,
  ref: React.Ref<ProductPickerRef>
): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#161224" : "#FFFFFF";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.98)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const dashedBorderColor = isDark ? "rgba(236,72,153,0.42)" : "rgba(219,39,119,0.34)";
  const dashedBgColor = isDark ? "rgba(236,72,153,0.05)" : "rgba(219,39,119,0.03)";

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [relationDetailStock, setRelationDetailStock] = useState<StockGetDto | null>(null);
  const [relationDetailVisible, setRelationDetailVisible] = useState(false);
  const [relationDetailData, setRelationDetailData] = useState<StockRelationDto[]>([]);
  const [relatedSelectedIds, setRelatedSelectedIds] = useState<Set<number>>(new Set());

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<AdvancedFilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<AdvancedFilterRow[]>([]);
  const [columnPickerRowId, setColumnPickerRowId] = useState<string | null>(null);
  const [operatorPickerRowId, setOperatorPickerRowId] = useState<string | null>(null);

  const relatedMandatory = useMemo(
    () => (relatedStocksSelection?.stock.parentRelations ?? []).filter((r) => r.isMandatory),
    [relatedStocksSelection]
  );

  const relatedOptional = useMemo(
    () => (relatedStocksSelection?.stock.parentRelations ?? []).filter((r) => !r.isMandatory),
    [relatedStocksSelection]
  );

  useEffect(() => {
    if (!relatedStocksSelection?.stock?.id) return;
    setRelatedSelectedIds(new Set(relatedMandatory.map((r) => r.relatedStockId)));
  }, [relatedStocksSelection?.stock?.id, relatedMandatory]);

  useEffect(() => {
    if (!parentVisible) {
      setIsOpen(false);
      setSearchText("");
      setRelationDetailVisible(false);
      setRelationDetailStock(null);
      setRelationDetailData([]);
    }
  }, [parentVisible]);

  const normalizedQuery = useMemo(() => normalizeSearchText(searchText), [searchText]);

  const { filters: apiFilters, filterLogic: advancedFilterLogic } = useMemo(() => {
    const entries = appliedFilterRows
      .map((row) => ({
        column: row.column,
        operator: row.operator,
        value: row.value.trim(),
      }))
      .filter((row) => row.value.length > 0);

    return buildAdvancedStockFilters(entries);
  }, [appliedFilterRows]);

  const hasAdvancedFilters = apiFilters.length > 0;

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useStocks(
    { filters: apiFilters, filterLogic: advancedFilterLogic },
    hasAdvancedFilters ? undefined : searchText
  );

  const shouldHideStaleResults = useMemo(() => {
    const trimmedSearch = searchText.trim();
    if (trimmedSearch.length < 2) return false;
    return isFetching && !isFetchingNextPage;
  }, [isFetching, isFetchingNextPage, searchText]);

  const stocks = useMemo(() => {
    if (shouldHideStaleResults) {
      return [];
    }

    const rawStocks = data?.pages.flatMap((page) => page.items) || [];
    if (searchText.trim().length >= 2) {
      return filterAndRankStocksLocal(rawStocks, searchText);
    }

    return hasAdvancedFilters ? filterAndRankStocksLocal(rawStocks, searchText) : rawStocks;
  }, [data, hasAdvancedFilters, searchText, shouldHideStaleResults]);

  const handleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      setSearchText("");
    }
  }, [disabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchText("");
    setIsFilterModalVisible(false);
  }, []);

  useImperativeHandle(ref, () => ({ close: handleClose }), [handleClose]);

  const handleSelect = useCallback(
    async (stock: StockGetDto) => {
      const result = await Promise.resolve(onChange(stock));
      if (result !== false) {
        handleClose();
      }
    },
    [onChange, handleClose]
  );

  const handleClear = useCallback(async () => {
    await Promise.resolve(onChange(undefined));
  }, [onChange]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleShowRelationDetail = useCallback((stock: StockGetDto, relations: StockRelationDto[]) => {
    setRelationDetailStock(stock);
    setRelationDetailData(relations);
    setRelationDetailVisible(true);
  }, []);

  const handleCloseRelationDetail = useCallback(() => {
    setRelationDetailVisible(false);
    setRelationDetailStock(null);
    setRelationDetailData([]);
  }, []);

  const handleRelatedApply = useCallback(() => {
    if (!relatedStocksSelection) return;
    const orderedIds: number[] = [];
    relatedMandatory.forEach((r) => orderedIds.push(r.relatedStockId));
    relatedOptional.forEach((r) => {
      if (relatedSelectedIds.has(r.relatedStockId)) orderedIds.push(r.relatedStockId);
    });
    relatedStocksSelection.onApply(orderedIds);
  }, [relatedStocksSelection, relatedMandatory, relatedOptional, relatedSelectedIds]);

  const handleRelatedCancel = useCallback(() => {
    relatedStocksSelection?.onCancel();
  }, [relatedStocksSelection]);

  const handleRequestClose = useCallback(() => {
    if (isFilterModalVisible) {
      setIsFilterModalVisible(false);
      return;
    }
    if (relatedStocksSelection) {
      handleRelatedCancel();
      return;
    }

    if (relationDetailVisible) {
      handleCloseRelationDetail();
      return;
    }

    handleClose();
  }, [
    isFilterModalVisible,
    relatedStocksSelection,
    relationDetailVisible,
    handleRelatedCancel,
    handleCloseRelationDetail,
    handleClose,
  ]);

  const updateDraftRow = useCallback((id: string, patch: Partial<Omit<AdvancedFilterRow, "id">>) => {
    setDraftFilterRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.column) {
          next.operator = getDefaultOperatorForColumn(patch.column);
        }
        return next;
      })
    );
  }, []);

  const addDraftRow = useCallback(() => {
    setDraftFilterRows((prev) => [...prev, createFilterRow()]);
  }, []);

  const removeDraftRow = useCallback((id: string) => {
    setDraftFilterRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const openFilterModal = useCallback(() => {
    setDraftFilterRows(
      appliedFilterRows.length > 0
        ? appliedFilterRows.map((row) => ({ ...row }))
        : [createFilterRow()]
    );
    setIsFilterModalVisible(true);
  }, [appliedFilterRows]);

  const applyFilters = useCallback(() => {
    setAppliedFilterRows(draftFilterRows.map((row) => ({ ...row })));
    setIsFilterModalVisible(false);
  }, [draftFilterRows]);

  const clearFilters = useCallback(() => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
    setColumnPickerRowId(null);
    setOperatorPickerRowId(null);
    setIsFilterModalVisible(false);
  }, []);

  const toggleRelatedOptional = useCallback((relatedStockId: number) => {
    setRelatedSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(relatedStockId)) next.delete(relatedStockId);
      else next.add(relatedStockId);
      return next;
    });
  }, []);

  const renderStockItem = useCallback(
    ({ item }: { item: StockGetDto }) => (
      <MemoizedStockListItem
        item={item}
        isSelected={value === item.erpStockCode}
        onSelect={() => handleSelect(item)}
        onShowRelationDetail={handleShowRelationDetail}
        modalOpen={isOpen}
      />
    ),
    [value, handleSelect, handleShowRelationDetail, isOpen]
  );

  return (
    <>
      <View style={styles.container}>
        {label && (
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
            {required && <Text style={[styles.required, { color: "#ef4444" }]}>*</Text>}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.pickerButton,
            {
              backgroundColor: productName ? cardBg : dashedBgColor,
              borderColor: productName ? borderColor : dashedBorderColor,
              borderWidth: productName ? 1 : 1.5,
              borderStyle: productName ? "solid" : "dashed",
            },
            disabled && styles.pickerButtonDisabled,
          ]}
          onPress={handleOpen}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <View style={styles.pickerButtonContent}>
            <View
              style={[
                styles.pickerLeadIcon,
                {
                  backgroundColor: productName
                    ? isDark
                      ? "rgba(236,72,153,0.12)"
                      : "rgba(219,39,119,0.08)"
                    : isDark
                    ? "rgba(236,72,153,0.16)"
                    : "rgba(219,39,119,0.10)",
                },
              ]}
            >
              <MaterialCommunityIcons name="package-variant-closed" size={18} color={brandColor} />
            </View>

            <Text
              style={[
                styles.pickerText,
                { color: productName ? textColor : brandColor },
                !productName && { fontWeight: "700" },
              ]}
              numberOfLines={1}
            >
              {productName || t("quotation.tapToSelectProduct")}
            </Text>

            {productName ? (
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={16} color={mutedColor} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.chevronWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC" }]}>
                <Ionicons name="chevron-down" size={16} color={brandColor} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleRequestClose}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={handleRequestClose} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: mainBg, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {relatedStocksSelection ? (
              <View style={styles.relatedSelectWrapper}>
                <View style={[styles.modalHeader, styles.relationDetailHeaderRow, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.modalTitle, { color: textColor }, styles.relationDetailTitle]} numberOfLines={1}>
                    {t("quotation.relatedStocksSelectTitle")}
                  </Text>
                </View>

                <Text style={[styles.relatedSelectDesc, { color: mutedColor }]}>
                  {t("quotation.relatedStocksSelectDesc")}
                </Text>

                <FlatListScrollView
                  style={styles.relatedSelectScroll}
                  contentContainerStyle={styles.relatedSelectScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {relatedMandatory.length > 0 && (
                    <View style={styles.relatedSelectBlock}>
                      <Text style={[styles.relatedSelectBlockTitle, { color: mutedColor }]}>
                        {t("quotation.mandatory")}
                      </Text>

                      {relatedMandatory.map((r) => (
                        <View key={r.id} style={[styles.relatedSelectRow, { borderBottomColor: borderColor }]}>
                          <View
                            style={[
                              styles.relatedSelectCheckbox,
                              {
                                borderColor: borderColor,
                                backgroundColor: brandColor + "30",
                              },
                            ]}
                          >
                            <Ionicons name="checkmark" size={14} color={brandColor} />
                          </View>

                          <View style={styles.relatedSelectRowContent}>
                            <Text style={[styles.relatedSelectRowName, { color: textColor }]} numberOfLines={1}>
                              {r.relatedStockName || r.relatedStockCode || `#${r.relatedStockId}`}
                            </Text>
                            <Text style={[styles.relatedSelectRowMeta, { color: mutedColor }]}>
                              {t("quotation.quantity")}: {r.quantity}
                              {r.description ? ` · ${r.description}` : ""}
                            </Text>
                          </View>

                          <View style={[styles.relatedSelectBadge, { backgroundColor: "#10B98118" }]}>
                            <Text style={[styles.relatedSelectBadgeText, { color: "#10B981" }]}>
                              {t("quotation.mandatory")}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {relatedOptional.length > 0 && (
                    <View style={styles.relatedSelectBlock}>
                      <Text style={[styles.relatedSelectBlockTitle, { color: mutedColor }]}>
                        {t("quotation.optional")}
                      </Text>

                      {relatedOptional.map((r) => {
                        const isChecked = relatedSelectedIds.has(r.relatedStockId);

                        return (
                          <TouchableOpacity
                            key={r.id}
                            style={[styles.relatedSelectRow, { borderBottomColor: borderColor }]}
                            onPress={() => toggleRelatedOptional(r.relatedStockId)}
                            activeOpacity={0.8}
                          >
                            <View
                              style={[
                                styles.relatedSelectCheckbox,
                                {
                                  borderColor: isChecked ? brandColor : borderColor,
                                  backgroundColor: isChecked ? brandColor + "30" : "transparent",
                                },
                              ]}
                            >
                              {isChecked && <Ionicons name="checkmark" size={14} color={brandColor} />}
                            </View>

                            <View style={styles.relatedSelectRowContent}>
                              <Text style={[styles.relatedSelectRowName, { color: textColor }]} numberOfLines={1}>
                                {r.relatedStockName || r.relatedStockCode || `#${r.relatedStockId}`}
                              </Text>
                              <Text style={[styles.relatedSelectRowMeta, { color: mutedColor }]}>
                                {t("quotation.quantity")}: {r.quantity}
                                {r.description ? ` · ${r.description}` : ""}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </FlatListScrollView>

                <View
                  style={[
                    styles.relatedSelectFooter,
                    { borderTopColor: borderColor, backgroundColor: mainBg },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.relatedSelectCancelBtn, { borderColor: borderColor }]}
                    onPress={handleRelatedCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.relatedSelectCancelText, { color: textColor }]}>
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.relatedSelectApplyBtn, { backgroundColor: brandColor }]}
                    onPress={handleRelatedApply}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.relatedSelectApplyText}>{t("quotation.apply")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : relationDetailVisible ? (
              <View style={styles.relationDetailWrapper}>
                <View
                  style={[
                    styles.modalHeader,
                    styles.relationDetailHeaderRow,
                    { borderBottomColor: borderColor },
                  ]}
                >
                  <TouchableOpacity onPress={handleCloseRelationDetail} style={styles.backButton} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={20} color={brandColor} />
                  </TouchableOpacity>

                  <Text
                    style={[styles.modalTitle, { color: textColor }, styles.relationDetailTitle]}
                    numberOfLines={1}
                  >
                    {relationDetailStock
                      ? `${relationDetailStock.erpStockCode} · ${t("quotation.relatedStocks")}`
                      : t("quotation.relatedStocks")}
                  </Text>

                  <TouchableOpacity onPress={handleCloseRelationDetail} style={styles.closeButton} activeOpacity={0.8}>
                    <Ionicons name="close" size={22} color={textColor} />
                  </TouchableOpacity>
                </View>

                {relationDetailData.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: mutedColor }]}>
                      {t("quotation.noRelatedStocks")}
                    </Text>
                  </View>
                ) : (
                  <FlatListScrollView
                    style={styles.relationDetailScroll}
                    contentContainerStyle={styles.relationDetailScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={[styles.relationDetailCount, { color: mutedColor }]}>
                      {relationDetailData.length} {t("quotation.relatedStocks").toLocaleLowerCase("tr-TR")}
                    </Text>

                    {relationDetailData.map((r) => (
                      <View key={r.id} style={[styles.relationDetailRow, { borderBottomColor: borderColor }]}>
                        <View
                          style={[
                            styles.relationDetailIconWrap,
                            {
                              backgroundColor: isDark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.08)",
                            },
                          ]}
                        >
                          <MaterialCommunityIcons name="source-branch" size={16} color={brandColor} />
                        </View>

                        <View style={styles.relationDetailRowContent}>
                          <Text style={[styles.relationDetailRowName, { color: textColor }]} numberOfLines={1}>
                            {getRelationDisplayName(r, relationDetailStock?.id)}
                          </Text>
                          <Text style={[styles.relationDetailRowMeta, { color: mutedColor }]}>
                            {t("quotation.quantity")}: {r.quantity}
                            {r.description ? ` · ${r.description}` : ""}
                            {r.isMandatory ? ` · ${t("quotation.mandatory")}` : ""}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </FlatListScrollView>
                )}
              </View>
            ) : (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                  <View style={[styles.handle, { backgroundColor: borderColor }]} />
                  <View style={styles.headerRow}>
                    <View style={[styles.productIcon, { backgroundColor: brandColor + "18" }]}>
                      <MaterialCommunityIcons name="package-variant-closed" size={20} color={brandColor} />
                    </View>

                    <View style={styles.headerTitles}>
                      <Text style={[styles.modalTitle, { color: textColor }]}>
                        {label || t("quotation.product")}
                      </Text>
                      <Text style={[styles.modalSubtitle, { color: mutedColor }]}>
                        {t("quotation.selectProduct")}
                      </Text>
                    </View>

                    <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.8}>
                      <Ionicons name="close" size={22} color={textColor} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  style={[
                    styles.searchRow,
                    { backgroundColor: inputBg, borderBottomColor: borderColor },
                  ]}
                >
                  <View
                    style={[
                      styles.searchInputWrap,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                        borderColor: borderColor,
                      },
                    ]}
                  >
                    <Ionicons name="search" size={18} color={mutedColor} />
                    <TextInput
                      style={[styles.searchInput, { color: textColor }]}
                      placeholder={t("stockPicker.searchPlaceholder")}
                      placeholderTextColor={mutedColor}
                      value={searchText}
                      onChangeText={setSearchText}
                      autoFocus
                      autoCorrect={false}
                      autoCapitalize="none"
                      keyboardType="default"
                    />
                    {searchText.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchText("")} activeOpacity={0.8}>
                        <Ionicons name="close-circle" size={18} color={mutedColor} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <VoiceSearchButton onResult={setSearchText} />
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                        borderColor,
                      },
                    ]}
                    onPress={openFilterModal}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="filter-variant" size={18} color={brandColor} />
                    {hasAdvancedFilters ? (
                      <View style={[styles.filterBadge, { backgroundColor: brandColor }]}>
                        <Text style={styles.filterBadgeText}>{apiFilters.length}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                </View>

                {isLoading && stocks.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={brandColor} />
                  </View>
                ) : stocks.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: mutedColor }]}>
                      {searchText.trim().length >= 2
                        ? t("stockPicker.noSearchResults")
                        : t("stockPicker.minSearchChars")}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={stocks}
                    renderItem={renderStockItem}
                    keyExtractor={(item) => String(item.id)}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    keyboardShouldPersistTaps="handled"
                    ListFooterComponent={
                      isFetchingNextPage ? (
                        <View style={styles.footerLoading}>
                          <ActivityIndicator size="small" color={brandColor} />
                        </View>
                      ) : null
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <Pressable
          style={styles.filterModalOverlay}
          onPress={() => setIsFilterModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 20}
            style={styles.filterKeyboardAvoid}
          >
            <Pressable
              style={[
                styles.filterModalCard,
                { backgroundColor: mainBg, borderColor },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={[styles.filterModalHeader, { borderBottomColor: borderColor }]}>
                <Text style={[styles.filterModalTitle, { color: textColor }]}>
                  {t("stockPicker.advancedFilterTitle")}
                </Text>
                <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={styles.closeButton} activeOpacity={0.8}>
                  <Ionicons name="close" size={20} color={textColor} />
                </TouchableOpacity>
              </View>

              <FlatListScrollView
                style={styles.filterFormScroll}
                contentContainerStyle={styles.filterFormScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TouchableOpacity
                  style={[styles.addFilterRowButton, { borderColor, backgroundColor: inputBg }]}
                  onPress={addDraftRow}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={16} color={brandColor} />
                  <Text style={[styles.addFilterRowButtonText, { color: brandColor }]}>
                    {t("stockPicker.addFilterRow")}
                  </Text>
                </TouchableOpacity>

                <View style={styles.filterFields}>
                  {draftFilterRows.map((row) => {
                    const columnConfig = getColumnConfig(row.column);
                    const operatorOptions = getOperatorsForColumn(row.column);
                    const isNumeric = columnConfig.type === "number";
                    return (
                      <View
                        style={[
                          styles.advancedFilterRowCard,
                          { borderColor, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#FFFFFF" },
                        ]}
                        key={row.id}
                      >
                        <View style={styles.advancedFilterRowHeader}>
                          <Text style={[styles.advancedFilterRowTitle, { color: textColor }]}>
                            {t("stockPicker.filterRowLabel")}
                          </Text>
                          <TouchableOpacity onPress={() => removeDraftRow(row.id)} activeOpacity={0.8}>
                            <Ionicons name="trash-outline" size={18} color={mutedColor} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.filterFieldRow}>
                          <TouchableOpacity
                            style={[styles.filterField, styles.filterSelectField, { borderColor, backgroundColor: inputBg }]}
                            onPress={() => setColumnPickerRowId(row.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                              {t("stockPicker.filterColumn")}
                            </Text>
                            <Text style={[styles.filterSelectValue, { color: textColor }]} numberOfLines={1}>
                              {t(`stockPicker.${columnConfig.labelKey}`)}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.filterField, styles.filterSelectField, { borderColor, backgroundColor: inputBg }]}
                            onPress={() => setOperatorPickerRowId(row.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                              {t("stockPicker.filterOperator")}
                            </Text>
                            <Text style={[styles.filterSelectValue, { color: textColor }]} numberOfLines={1}>
                              {t(`stockPicker.operator.${row.operator}`)}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.filterFieldRow}>
                          <View style={styles.filterField}>
                            <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                              {t("stockPicker.filterValue")}
                            </Text>
                            <TextInput
                              value={row.value}
                              onChangeText={(value) => updateDraftRow(row.id, { value })}
                              placeholder={t("stockPicker.filterValue")}
                              placeholderTextColor={mutedColor}
                              keyboardType={isNumeric ? "number-pad" : "default"}
                              style={[
                                styles.filterFieldInput,
                                { color: textColor, borderColor, backgroundColor: inputBg },
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  {draftFilterRows.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={[styles.emptyText, { color: mutedColor }]}>
                        {t("stockPicker.noAdvancedFilters")}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </FlatListScrollView>

              <View style={[styles.filterModalFooter, { borderTopColor: borderColor }]}>
                <TouchableOpacity
                  style={[styles.filterSecondaryButton, { borderColor }]}
                  onPress={() => setIsFilterModalVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterSecondaryButtonText, { color: textColor }]}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterSecondaryButton, { borderColor }]}
                  onPress={clearFilters}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterSecondaryButtonText, { color: textColor }]}>
                    {t("common.clear")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterPrimaryButton, { backgroundColor: brandColor }]}
                  onPress={applyFilters}
                  activeOpacity={0.85}
                >
                  <Text style={styles.filterPrimaryButtonText}>{t("common.apply")}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <PickerModal
        visible={columnPickerRowId !== null}
        options={STOCK_FILTER_COLUMNS.map((column) => ({
          id: column.value,
          name: t(`stockPicker.${column.labelKey}`),
          code: column.value,
        }))}
        selectedValue={draftFilterRows.find((row) => row.id === columnPickerRowId)?.column}
        onSelect={(option) => {
          if (!columnPickerRowId) return;
          updateDraftRow(columnPickerRowId, { column: option.id as StockFilterColumnValue });
        }}
        onClose={() => setColumnPickerRowId(null)}
        title={t("stockPicker.filterColumn")}
        searchPlaceholder={t("stockPicker.filterColumnSearch")}
      />

      <PickerModal
        visible={operatorPickerRowId !== null}
        options={
          operatorPickerRowId
            ? getOperatorsForColumn(
                draftFilterRows.find((row) => row.id === operatorPickerRowId)?.column ?? "StockName"
              ).map((operator) => ({
                id: operator,
                name: t(`stockPicker.operator.${operator}`),
              }))
            : []
        }
        selectedValue={draftFilterRows.find((row) => row.id === operatorPickerRowId)?.operator}
        onSelect={(option) => {
          if (!operatorPickerRowId) return;
          updateDraftRow(operatorPickerRowId, { operator: option.id as AdvancedFilterOperator });
        }}
        onClose={() => setOperatorPickerRowId(null)}
        title={t("stockPicker.filterOperator")}
        searchPlaceholder={t("stockPicker.filterOperatorSearch")}
      />
    </>
  );
}

export const ProductPicker = forwardRef<ProductPickerRef, ProductPickerProps>(ProductPickerInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  required: {
    fontSize: 14,
    marginLeft: 4,
  },
  pickerButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 56,
    justifyContent: "center",
  },
  pickerButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerLeadIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  pickerButtonDisabled: {
    opacity: 0.6,
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.58)",
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    overflow: "hidden",
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  handle: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: [{ translateX: -22 }],
    width: 44,
    height: 5,
    borderRadius: 3,
    opacity: 0.55,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  productIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  headerTitles: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: "500",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  relationDetailHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  relationDetailTitle: {
    flex: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  filterKeyboardAvoid: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  filterModalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  filterModalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterModalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  filterFormScroll: {
    maxHeight: 420,
  },
  filterFormScrollContent: {
    paddingBottom: 8,
  },
  addFilterRowButton: {
    marginHorizontal: 18,
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addFilterRowButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  filterFields: {
    padding: 18,
    gap: 14,
  },
  advancedFilterRowCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  advancedFilterRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  advancedFilterRowTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  filterFieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterField: {
    gap: 6,
    flex: 1,
  },
  filterSelectField: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
  },
  filterFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterSelectValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterFieldInput: {
    borderWidth: 1,
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  filterModalFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 18,
    flexDirection: "row",
    gap: 10,
  },
  filterSecondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterPrimaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 40,
  },
  stockItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stockItemTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockInfoRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  stockIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
  },
  stockInfo: {
    flex: 1,
  },
  relatedStockBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  relatedStockBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  stockName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 5,
  },
  stockCode: {
    fontSize: 13,
    fontWeight: "500",
  },
  stockMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  relationDetailWrapper: {
    flex: 1,
  },
  relationDetailScroll: {
    flex: 1,
  },
  relationDetailScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  relationDetailCount: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  relationDetailRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  relationDetailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  relationDetailRowContent: {
    flex: 1,
  },
  relationDetailRowName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  relationDetailRowMeta: {
    fontSize: 13,
  },
  relatedSelectWrapper: {
    flex: 1,
  },
  relatedSelectDesc: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 12,
    lineHeight: 20,
  },
  relatedSelectScroll: {
    flex: 1,
  },
  relatedSelectScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  relatedSelectBlock: {
    marginBottom: 20,
  },
  relatedSelectBlockTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  relatedSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  relatedSelectCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  relatedSelectRowContent: {
    flex: 1,
  },
  relatedSelectRowName: {
    fontSize: 15,
    fontWeight: "600",
  },
  relatedSelectRowMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  relatedSelectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  relatedSelectBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  relatedSelectFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  relatedSelectCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  relatedSelectCancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
  relatedSelectApplyBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  relatedSelectApplyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

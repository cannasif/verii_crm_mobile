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
  Platform,
  useWindowDimensions,
  Keyboard,
  type KeyboardEvent,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { CatalogStockPickerModal } from "@/components/shared/CatalogStockPickerModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { VoiceSearchButton } from "./VoiceSearchButton";
import {
  useStocks,
} from "../../stocks/hooks";
import type { StockGetDto, StockRelationDto } from "../../stocks/types";
import {
  getProductSelectionKey,
  type ProductSelectionResult,
} from "../../stocks/types";

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
  multiSelect?: boolean;
  onMultiSelect?: (results: ProductSelectionResult[]) => void | Promise<void>;
  initialSelectedResults?: ProductSelectionResult[];
  /** `getProductSelectionKey` değerleri: satır formunda zaten taslak kuyruğunda olan stoklar (modalı tekrar açınca listede işaret). */
  queuedProductKeys?: readonly string[];
}

const SEARCH_DEBOUNCE_MS = 700;

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
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [...stocks].sort((a, b) =>
      (a.stockName || "").localeCompare(b.stockName || "", "tr")
    );
  }

  return stocks
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

function StockListItem({
  item,
  isSelected,
  priorPickHint,
  onSelect,
  onShowRelationDetail,
}: {
  item: StockGetDto;
  isSelected: boolean;
  /** Taslak kuyruğunda zaten var; bu turda seçili değilken küçük işaret. */
  priorPickHint?: boolean;
  onSelect: () => void;
  onShowRelationDetail: (stock: StockGetDto, relations: StockRelationDto[]) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode, showUnitInStockSelection } = useUIStore();
  const isDark = themeMode === "dark";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const balance = formatStockBalance(item);
  const unitGroupText = useMemo(() => {
    const unit = showUnitInStockSelection && item.unit ? `${t("stockPicker.unit")}: ${item.unit}` : null;
    const group = item.grupKodu || item.grupAdi
      ? `${t("stockPicker.group")}: ${[item.grupKodu, item.grupAdi].filter(Boolean).join(" · ")}`
      : null;
    return [unit, group].filter(Boolean).join("    ");
  }, [item, t, showUnitInStockSelection]);
  const codePairText = useMemo(() => {
    const code1 = item.kod1 || item.kod1Adi
      ? `${t("stockPicker.code1")}: ${[item.kod1, item.kod1Adi].filter(Boolean).join(" · ")}`
      : null;
    const code2 = item.kod2 || item.kod2Adi
      ? `${t("stockPicker.code2")}: ${[item.kod2, item.kod2Adi].filter(Boolean).join(" · ")}`
      : null;
    return [code1, code2].filter(Boolean).join("    ");
  }, [item, t]);
  const metaSingleLineText = useMemo(
    () => [unitGroupText, codePairText].filter(Boolean).join("    "),
    [unitGroupText, codePairText]
  );

  const relationsList = item.parentRelations ?? [];

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
            {priorPickHint ? (
              <View
                style={[
                  styles.priorPickBadge,
                  {
                    borderColor: isDark ? "#0f172a" : "#FFFFFF",
                    backgroundColor: isDark ? "#FBBF24" : "#F59E0B",
                  },
                ]}
                accessibilityLabel="Kuyrukta"
              />
            ) : null}
          </View>

          <View style={styles.stockInfo}>
            <Text
              style={[styles.stockName, { color: textColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              allowFontScaling={false}
              unstyled
            >
              {item.stockName}
            </Text>

            <Text style={[styles.stockCode, { color: mutedColor }]} numberOfLines={1} allowFontScaling={false} unstyled>
              {item.erpStockCode}
            </Text>

            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: isDark ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.09)",
                  opacity: metaSingleLineText ? 1 : 0,
                },
              ]}
            >
              <Text style={[styles.stockMeta, { color: mutedColor }]} numberOfLines={1} allowFontScaling={false} unstyled>
                {metaSingleLineText || "."}
              </Text>
            </View>
            {showBadge ? (
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
                <MaterialCommunityIcons name="source-branch" size={12} color={brandColor} />
                <Text style={[styles.relatedStockBadgeText, { color: brandColor }]} unstyled allowFontScaling={false}>
                  {relationCount} {t("quotation.relatedStocks")}
                </Text>
                <Ionicons name="chevron-forward" size={12} color={brandColor} />
              </TouchableOpacity>
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
    multiSelect = false,
    onMultiSelect,
    initialSelectedResults = [],
    queuedProductKeys = [],
  }: ProductPickerProps,
  ref: React.Ref<ProductPickerRef>
): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#161224" : "#FFFFFF";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.98)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const primaryActionBg = isDark ? "rgba(236,72,153,0.24)" : "#F6C7E2";
  const primaryActionText = isDark ? "#FCE7F3" : "#5B3150";
  const softPinkBorder = isDark ? "rgba(236,72,153,0.26)" : "rgba(219,39,119,0.18)";
  const dashedBorderColor = isDark ? "rgba(236,72,153,0.42)" : "rgba(219,39,119,0.34)";
  const dashedBgColor = isDark ? "rgba(236,72,153,0.05)" : "rgba(219,39,119,0.03)";

  const [isOpen, setIsOpen] = useState(false);
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [relationDetailStock, setRelationDetailStock] = useState<StockGetDto | null>(null);
  const [relationDetailVisible, setRelationDetailVisible] = useState(false);
  const [relationDetailData, setRelationDetailData] = useState<StockRelationDto[]>([]);
  const [relatedSelectedIds, setRelatedSelectedIds] = useState<Set<number>>(new Set());

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterKeyboardInset, setFilterKeyboardInset] = useState(0);

  const [appliedIdFilter, setAppliedIdFilter] = useState("");
  const [appliedCodeFilter, setAppliedCodeFilter] = useState("");
  const [appliedNameFilter, setAppliedNameFilter] = useState("");
  const [appliedUnitFilter, setAppliedUnitFilter] = useState("");

  const [tempIdFilter, setTempIdFilter] = useState("");
  const [tempCodeFilter, setTempCodeFilter] = useState("");
  const [tempNameFilter, setTempNameFilter] = useState("");
  const [tempGroupCodeFilter, setTempGroupCodeFilter] = useState("");
  const [tempGroupNameFilter, setTempGroupNameFilter] = useState("");
  const [tempCode1Filter, setTempCode1Filter] = useState("");
  const [tempCode1NameFilter, setTempCode1NameFilter] = useState("");
  const [tempCode2Filter, setTempCode2Filter] = useState("");
  const [tempCode2NameFilter, setTempCode2NameFilter] = useState("");
  const [tempCode3Filter, setTempCode3Filter] = useState("");
  const [tempCode3NameFilter, setTempCode3NameFilter] = useState("");
  const [tempCode4Filter, setTempCode4Filter] = useState("");
  const [tempCode4NameFilter, setTempCode4NameFilter] = useState("");
  const [tempCode5Filter, setTempCode5Filter] = useState("");
  const [tempCode5NameFilter, setTempCode5NameFilter] = useState("");
  const [tempManufacturerCodeFilter, setTempManufacturerCodeFilter] = useState("");
  const [tempBranchCodeFilter, setTempBranchCodeFilter] = useState("");
  const [tempUnitFilter, setTempUnitFilter] = useState("");

  const [appliedGroupCodeFilter, setAppliedGroupCodeFilter] = useState("");
  const [appliedGroupNameFilter, setAppliedGroupNameFilter] = useState("");
  const [appliedCode1Filter, setAppliedCode1Filter] = useState("");
  const [appliedCode1NameFilter, setAppliedCode1NameFilter] = useState("");
  const [appliedCode2Filter, setAppliedCode2Filter] = useState("");
  const [appliedCode2NameFilter, setAppliedCode2NameFilter] = useState("");
  const [appliedCode3Filter, setAppliedCode3Filter] = useState("");
  const [appliedCode3NameFilter, setAppliedCode3NameFilter] = useState("");
  const [appliedCode4Filter, setAppliedCode4Filter] = useState("");
  const [appliedCode4NameFilter, setAppliedCode4NameFilter] = useState("");
  const [appliedCode5Filter, setAppliedCode5Filter] = useState("");
  const [appliedCode5NameFilter, setAppliedCode5NameFilter] = useState("");
  const [appliedManufacturerCodeFilter, setAppliedManufacturerCodeFilter] = useState("");
  const [appliedBranchCodeFilter, setAppliedBranchCodeFilter] = useState("");
  const [tempFilterLogic, setTempFilterLogic] = useState<"and" | "or">("and");
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<"and" | "or">("and");
  const [selectedResults, setSelectedResults] = useState<ProductSelectionResult[]>([]);

  const queuedKeySet = useMemo(() => new Set(queuedProductKeys ?? []), [queuedProductKeys]);

  const multiChipGap = 6;
  const multiChipCols = 4;
  const selectionChipWidth = useMemo(() => {
    const rowPad = 12 * 2;
    const inner = Math.max(0, windowWidth - rowPad);
    const gaps = multiChipGap * (multiChipCols - 1);
    return Math.max(64, Math.floor((inner - gaps) / multiChipCols));
  }, [windowWidth]);

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
    const timeout = setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    if (!parentVisible) {
      setIsOpen(false);
      setSearchText("");
      setDebouncedSearchText("");
      setRelationDetailVisible(false);
      setRelationDetailStock(null);
      setRelationDetailData([]);
      setTempFilterLogic("and");
      setAppliedFilterLogic("and");
    }
  }, [parentVisible]);

  const apiFilters = useMemo(() => {
    const filters: Array<{ column: string; operator: string; value: string }> = [];

    if (appliedIdFilter.trim()) {
      filters.push({ column: "Id", operator: "eq", value: appliedIdFilter.trim() });
    }
    if (appliedCodeFilter.trim()) {
      filters.push({ column: "ErpStockCode", operator: "contains", value: appliedCodeFilter.trim() });
    }
    if (appliedNameFilter.trim()) {
      filters.push({ column: "StockName", operator: "contains", value: appliedNameFilter.trim() });
    }
    if (appliedGroupCodeFilter.trim()) {
      filters.push({ column: "GrupKodu", operator: "contains", value: appliedGroupCodeFilter.trim() });
    }
    if (appliedGroupNameFilter.trim()) {
      filters.push({ column: "GrupAdi", operator: "contains", value: appliedGroupNameFilter.trim() });
    }
    if (appliedCode1Filter.trim()) {
      filters.push({ column: "Kod1", operator: "contains", value: appliedCode1Filter.trim() });
    }
    if (appliedCode1NameFilter.trim()) {
      filters.push({ column: "Kod1Adi", operator: "contains", value: appliedCode1NameFilter.trim() });
    }
    if (appliedCode2Filter.trim()) {
      filters.push({ column: "Kod2", operator: "contains", value: appliedCode2Filter.trim() });
    }
    if (appliedCode2NameFilter.trim()) {
      filters.push({ column: "Kod2Adi", operator: "contains", value: appliedCode2NameFilter.trim() });
    }
    if (appliedCode3Filter.trim()) {
      filters.push({ column: "Kod3", operator: "contains", value: appliedCode3Filter.trim() });
    }
    if (appliedCode3NameFilter.trim()) {
      filters.push({ column: "Kod3Adi", operator: "contains", value: appliedCode3NameFilter.trim() });
    }
    if (appliedCode4Filter.trim()) {
      filters.push({ column: "Kod4", operator: "contains", value: appliedCode4Filter.trim() });
    }
    if (appliedCode4NameFilter.trim()) {
      filters.push({ column: "Kod4Adi", operator: "contains", value: appliedCode4NameFilter.trim() });
    }
    if (appliedCode5Filter.trim()) {
      filters.push({ column: "Kod5", operator: "contains", value: appliedCode5Filter.trim() });
    }
    if (appliedCode5NameFilter.trim()) {
      filters.push({ column: "Kod5Adi", operator: "contains", value: appliedCode5NameFilter.trim() });
    }
    if (appliedManufacturerCodeFilter.trim()) {
      filters.push({ column: "UreticiKodu", operator: "contains", value: appliedManufacturerCodeFilter.trim() });
    }
    if (appliedUnitFilter.trim()) {
      filters.push({ column: "unit", operator: "contains", value: appliedUnitFilter.trim() });
    }
    if (appliedBranchCodeFilter.trim()) {
      filters.push({ column: "BranchCode", operator: "eq", value: appliedBranchCodeFilter.trim() });
    }

    return filters;
  }, [
    appliedBranchCodeFilter,
    appliedCode1Filter,
    appliedCode1NameFilter,
    appliedCode2Filter,
    appliedCode2NameFilter,
    appliedCode3Filter,
    appliedCode3NameFilter,
    appliedCode4Filter,
    appliedCode4NameFilter,
    appliedCode5Filter,
    appliedCode5NameFilter,
    appliedCodeFilter,
    appliedGroupCodeFilter,
    appliedGroupNameFilter,
    appliedIdFilter,
    appliedManufacturerCodeFilter,
    appliedNameFilter,
    appliedUnitFilter,
  ]);

  const hasAdvancedFilters = apiFilters.length > 0;

  const filterModalMaxHeight = useMemo(() => {
    const topSlack = insets.top + 16;
    const bottomSlack = Math.max(insets.bottom, 8) + 20 + filterKeyboardInset;
    const available = windowHeight - topSlack - bottomSlack;
    return Math.max(260, Math.min(580, available));
  }, [windowHeight, insets.top, insets.bottom, filterKeyboardInset]);

  useEffect(() => {
    if (!isFilterModalVisible) {
      setFilterKeyboardInset(0);
      return;
    }
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: KeyboardEvent) => {
      setFilterKeyboardInset(e.endCoordinates.height);
    };
    const onHide = () => {
      setFilterKeyboardInset(0);
    };
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [isFilterModalVisible]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useStocks(
    {
      filters: apiFilters,
      filterLogic: appliedFilterLogic,
      search: debouncedSearchText || undefined,
      enabled: isOpen,
    }
  );

  const stocks = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

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
    setSelectedResults([]);
  }, []);

  const handleOpenCatalog = useCallback(() => {
    setCatalogModalVisible(true);
  }, []);

  const handleCloseCatalog = useCallback(() => {
    setCatalogModalVisible(false);
  }, []);

  useImperativeHandle(ref, () => ({ close: handleClose }), [handleClose]);

  const handleSelect = useCallback(
    async (stock: StockGetDto) => {
      if (multiSelect) {
        const nextSelection: ProductSelectionResult = {
          id: stock.id,
          code: stock.erpStockCode,
          name: stock.stockName,
          unit: stock.unit ?? null,
          groupCode: stock.grupKodu ?? null,
          relatedStockIds: stock.id != null ? [stock.id] : undefined,
        };
        setSelectedResults((prev) => [...prev, nextSelection]);
        return;
      }

      const result = await Promise.resolve(onChange(stock));
      if (result !== false) {
        handleClose();
      }
    },
    [multiSelect, onChange, handleClose]
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

  const openFilterModal = useCallback(() => {
    setTempIdFilter(appliedIdFilter);
    setTempCodeFilter(appliedCodeFilter);
    setTempNameFilter(appliedNameFilter);
    setTempGroupCodeFilter(appliedGroupCodeFilter);
    setTempGroupNameFilter(appliedGroupNameFilter);
    setTempCode1Filter(appliedCode1Filter);
    setTempCode1NameFilter(appliedCode1NameFilter);
    setTempCode2Filter(appliedCode2Filter);
    setTempCode2NameFilter(appliedCode2NameFilter);
    setTempCode3Filter(appliedCode3Filter);
    setTempCode3NameFilter(appliedCode3NameFilter);
    setTempCode4Filter(appliedCode4Filter);
    setTempCode4NameFilter(appliedCode4NameFilter);
    setTempCode5Filter(appliedCode5Filter);
    setTempCode5NameFilter(appliedCode5NameFilter);
    setTempManufacturerCodeFilter(appliedManufacturerCodeFilter);
    setTempBranchCodeFilter(appliedBranchCodeFilter);
    setTempUnitFilter(appliedUnitFilter);
    setIsFilterModalVisible(true);
  }, [
    appliedBranchCodeFilter,
    appliedCode1Filter,
    appliedCode1NameFilter,
    appliedCode2Filter,
    appliedCode2NameFilter,
    appliedCode3Filter,
    appliedCode3NameFilter,
    appliedCode4Filter,
    appliedCode4NameFilter,
    appliedCode5Filter,
    appliedCode5NameFilter,
    appliedCodeFilter,
    appliedGroupCodeFilter,
    appliedGroupNameFilter,
    appliedIdFilter,
    appliedManufacturerCodeFilter,
    appliedNameFilter,
    appliedUnitFilter,
  ]);

  const applyFilters = useCallback(() => {
    setAppliedIdFilter(tempIdFilter);
    setAppliedCodeFilter(tempCodeFilter);
    setAppliedNameFilter(tempNameFilter);
    setAppliedGroupCodeFilter(tempGroupCodeFilter);
    setAppliedGroupNameFilter(tempGroupNameFilter);
    setAppliedCode1Filter(tempCode1Filter);
    setAppliedCode1NameFilter(tempCode1NameFilter);
    setAppliedCode2Filter(tempCode2Filter);
    setAppliedCode2NameFilter(tempCode2NameFilter);
    setAppliedCode3Filter(tempCode3Filter);
    setAppliedCode3NameFilter(tempCode3NameFilter);
    setAppliedCode4Filter(tempCode4Filter);
    setAppliedCode4NameFilter(tempCode4NameFilter);
    setAppliedCode5Filter(tempCode5Filter);
    setAppliedCode5NameFilter(tempCode5NameFilter);
    setAppliedManufacturerCodeFilter(tempManufacturerCodeFilter);
    setAppliedBranchCodeFilter(tempBranchCodeFilter);
    setAppliedUnitFilter(tempUnitFilter);
    setAppliedFilterLogic(tempFilterLogic);
    setIsFilterModalVisible(false);
  }, [
    tempBranchCodeFilter,
    tempCode1Filter,
    tempCode1NameFilter,
    tempCode2Filter,
    tempCode2NameFilter,
    tempCode3Filter,
    tempCode3NameFilter,
    tempCode4Filter,
    tempCode4NameFilter,
    tempCode5Filter,
    tempCode5NameFilter,
    tempCodeFilter,
    tempGroupCodeFilter,
    tempGroupNameFilter,
    tempIdFilter,
    tempManufacturerCodeFilter,
    tempNameFilter,
    tempFilterLogic,
    tempUnitFilter,
  ]);

  const clearFilters = useCallback(() => {
    setTempIdFilter("");
    setTempCodeFilter("");
    setTempNameFilter("");
    setTempGroupCodeFilter("");
    setTempGroupNameFilter("");
    setTempCode1Filter("");
    setTempCode1NameFilter("");
    setTempCode2Filter("");
    setTempCode2NameFilter("");
    setTempCode3Filter("");
    setTempCode3NameFilter("");
    setTempCode4Filter("");
    setTempCode4NameFilter("");
    setTempCode5Filter("");
    setTempCode5NameFilter("");
    setTempManufacturerCodeFilter("");
    setTempBranchCodeFilter("");
    setTempUnitFilter("");

    setAppliedIdFilter("");
    setAppliedCodeFilter("");
    setAppliedNameFilter("");
    setAppliedGroupCodeFilter("");
    setAppliedGroupNameFilter("");
    setAppliedCode1Filter("");
    setAppliedCode1NameFilter("");
    setAppliedCode2Filter("");
    setAppliedCode2NameFilter("");
    setAppliedCode3Filter("");
    setAppliedCode3NameFilter("");
    setAppliedCode4Filter("");
    setAppliedCode4NameFilter("");
    setAppliedCode5Filter("");
    setAppliedCode5NameFilter("");
    setAppliedManufacturerCodeFilter("");
    setAppliedBranchCodeFilter("");
    setAppliedUnitFilter("");
    setTempFilterLogic("and");
    setAppliedFilterLogic("and");
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
    ({ item }: { item: StockGetDto }) => {
      const itemKey = getProductSelectionKey({ id: item.id, code: item.erpStockCode });
      const isSelectedThisRound = multiSelect
        ? selectedResults.some(
            (selection) => getProductSelectionKey(selection) === itemKey
          )
        : value === item.erpStockCode;
      const priorPickHint = multiSelect && queuedKeySet.has(itemKey) && !isSelectedThisRound;

      return (
        <MemoizedStockListItem
          item={item}
          isSelected={isSelectedThisRound}
          priorPickHint={priorPickHint}
          onSelect={() => handleSelect(item)}
          onShowRelationDetail={handleShowRelationDetail}
        />
      );
    },
    [multiSelect, selectedResults, value, queuedKeySet, handleSelect, handleShowRelationDetail]
  );

  const chipSelections = useMemo(
    () =>
      selectedResults.map((selection, index) => ({
        id: `${getProductSelectionKey(selection)}-${index}`,
        label: selection.code,
        index,
      })),
    [selectedResults]
  );

  const removeOneSelection = useCallback((index: number) => {
    setSelectedResults((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      return [...prev.slice(0, index), ...prev.slice(index + 1)];
    });
  }, []);

  const handleConfirmMultiSelect = useCallback(async () => {
    if (!onMultiSelect || selectedResults.length === 0) return;
    await Promise.resolve(onMultiSelect(selectedResults));
    handleClose();
  }, [onMultiSelect, selectedResults, handleClose]);

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
              borderWidth: productName ? 1.25 : 1.8,
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
                productName ? styles.pickerTextProductName : null,
                { color: productName ? textColor : brandColor },
                !productName && { fontWeight: "700" },
              ]}
              numberOfLines={productName ? 2 : 1}
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
                  <View style={styles.searchTopRow}>
                    <View
                      style={[
                        styles.searchInputWrap,
                        {
                          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                          borderColor: borderColor,
                        },
                      ]}
                    >
                      <Ionicons name="search" size={16} color={mutedColor} />
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
                          <Ionicons name="close-circle" size={17} color={mutedColor} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <VoiceSearchButton onResult={setSearchText} />
                  </View>
                  <View style={styles.searchBottomRow}>
                    <TouchableOpacity
                      style={[
                        styles.catalogButton,
                        {
                          backgroundColor: brandColor + "14",
                          borderColor: brandColor + "55",
                        },
                      ]}
                      onPress={handleOpenCatalog}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="view-grid-plus-outline" size={14} color={brandColor} />
                      <Text style={[styles.catalogButtonText, { color: brandColor }]}>
                        {t("stockPicker.catalogOpenButton")}
                      </Text>
                    </TouchableOpacity>
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
                      <MaterialCommunityIcons name="filter-variant" size={16} color={brandColor} />
                      <Text style={[styles.filterButtonText, { color: brandColor }]}>
                        {t("common.filter")}
                      </Text>
                      {hasAdvancedFilters ? (
                        <View style={[styles.filterBadge, { backgroundColor: brandColor }]}>
                          <Text style={styles.filterBadgeText}>{apiFilters.length}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                </View>
                {multiSelect && chipSelections.length > 0 && (
                  <View style={[styles.multiSelectionContainer, { borderBottomColor: borderColor }]}>
                    <View style={[styles.selectionChipGrid, { gap: multiChipGap }]}>
                      {chipSelections.map((item) => (
                        <View
                          key={item.id}
                          style={[
                            styles.selectionChip,
                            {
                              width: selectionChipWidth,
                              maxWidth: selectionChipWidth,
                              borderColor: brandColor + "55",
                              backgroundColor: brandColor + "14",
                            },
                          ]}
                        >
                          <Text style={[styles.selectionChipText, { color: mutedColor }]} numberOfLines={1}>
                            {item.label}
                          </Text>
                          <TouchableOpacity
                            style={[styles.selectionChipRemove, { borderColor: brandColor + "35", backgroundColor: "transparent" }]}
                            onPress={() => removeOneSelection(item.index)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.selectionChipRemoveText, { color: brandColor }]}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

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
                {multiSelect && (
                  <View style={[styles.multiFooter, { borderTopColor: borderColor, backgroundColor: mainBg }]}>
                    <TouchableOpacity
                      style={[styles.multiFooterButton, { borderColor }]}
                      onPress={() => setSelectedResults([])}
                    >
                      <Text style={[styles.multiFooterButtonText, { color: textColor }]}>
                        {t("common.clear")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.multiFooterButton,
                        !isDark && styles.multiFooterPrimaryShadow,
                        {
                          backgroundColor: primaryActionBg,
                          borderColor: softPinkBorder,
                          borderWidth: 1,
                        },
                        (selectedResults.length === 0 || !onMultiSelect) && styles.multiFooterPrimaryDisabled,
                      ]}
                      onPress={() => {
                        void handleConfirmMultiSelect();
                      }}
                      disabled={selectedResults.length === 0 || !onMultiSelect}
                    >
                      <Text style={[styles.multiFooterPrimaryText, { color: primaryActionText }]}>
                        Seçilenleri Ekle ({selectedResults.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <CatalogStockPickerModal
        visible={catalogModalVisible}
        selectedStock={{ code: value, name: productName }}
        onClose={handleCloseCatalog}
        onApply={async (stock) => {
          if (!stock) {
            handleClear();
            return;
          }
          await handleSelect(stock);
        }}
      />

      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.filterModalRoot}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsFilterModalVisible(false)} />
          <View
            pointerEvents="box-none"
            style={[
              styles.filterModalShell,
              filterKeyboardInset > 0
                ? {
                    justifyContent: "flex-end",
                    paddingBottom: Math.max(insets.bottom, 8) + 10,
                    paddingTop: insets.top + 6,
                  }
                : {
                    justifyContent: "center",
                    paddingVertical: 20,
                  },
            ]}
          >
            <Pressable
              style={[
                styles.filterModalCard,
                {
                  backgroundColor: mainBg,
                  borderColor,
                  height: filterModalMaxHeight,
                  maxHeight: filterModalMaxHeight,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.filterModalInner}>
              <View style={[styles.filterModalHeader, { borderBottomColor: borderColor }]}>
                <View style={styles.filterModalHeaderLeft}>
                  <View style={[styles.filterModalHeaderIcon, { backgroundColor: brandColor + "18", borderColor: brandColor + "35" }]}>
                    <MaterialCommunityIcons name="filter-variant" size={18} color={brandColor} />
                  </View>
                  <View style={styles.filterModalHeaderTitles}>
                    <Text style={[styles.filterModalTitle, { color: textColor }]}>
                      {t("stockPicker.advancedFilterTitle")}
                    </Text>
                    <Text style={[styles.filterModalSubtitle, { color: mutedColor }]} numberOfLines={1}>
                      {t("stockPicker.advancedFilterSubtitle")}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={styles.filterModalCloseHit} activeOpacity={0.8}>
                  <Ionicons name="close" size={22} color={mutedColor} />
                </TouchableOpacity>
              </View>

              <FlatListScrollView
                style={styles.filterFormScroll}
                contentContainerStyle={styles.filterFormScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <View style={styles.filterFields}>
                  <View style={styles.logicRow}>
                    <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                      {t("common.logic")}
                    </Text>
                    <View style={[styles.logicSegmentTrack, { backgroundColor: inputBg, borderColor }]}>
                      <TouchableOpacity
                        style={[
                          styles.logicSegmentButton,
                          tempFilterLogic === "and" && { backgroundColor: brandColor },
                        ]}
                        onPress={() => setTempFilterLogic("and")}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.logicSegmentButtonText,
                            { color: tempFilterLogic === "and" ? "#fff" : textColor },
                          ]}
                        >
                          {t("common.and")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.logicSegmentButton,
                          tempFilterLogic === "or" && { backgroundColor: brandColor },
                        ]}
                        onPress={() => setTempFilterLogic("or")}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.logicSegmentButtonText,
                            { color: tempFilterLogic === "or" ? "#fff" : textColor },
                          ]}
                        >
                          {t("common.or")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.filterFieldRow}>
                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Stok Kodu
                      </Text>
                      <TextInput
                        value={tempCodeFilter}
                        onChangeText={setTempCodeFilter}
                        placeholder="Stok Kodu"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>

                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Stok Adı
                      </Text>
                      <TextInput
                        value={tempNameFilter}
                        onChangeText={setTempNameFilter}
                        placeholder="Stok Adı"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>
                  </View>

                  <View style={styles.filterFieldRow}>
                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Grup Kodu
                      </Text>
                      <TextInput
                        value={tempGroupCodeFilter}
                        onChangeText={setTempGroupCodeFilter}
                        placeholder="Grup Kodu"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>

                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Grup Adı
                      </Text>
                      <TextInput
                        value={tempGroupNameFilter}
                        onChangeText={setTempGroupNameFilter}
                        placeholder="Grup Adı"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>
                  </View>

                  <View style={styles.filterFieldRow}>
                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod1
                      </Text>
                      <TextInput
                        value={tempCode1Filter}
                        onChangeText={setTempCode1Filter}
                        placeholder="Kod1"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>

                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod1 Adı
                      </Text>
                      <TextInput
                        value={tempCode1NameFilter}
                        onChangeText={setTempCode1NameFilter}
                        placeholder="Kod1 Adı"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>
                  </View>

                  <View style={styles.filterFieldRow}>
                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod2
                      </Text>
                      <TextInput
                        value={tempCode2Filter}
                        onChangeText={setTempCode2Filter}
                        placeholder="Kod2"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>

                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod2 Adı
                      </Text>
                      <TextInput
                        value={tempCode2NameFilter}
                        onChangeText={setTempCode2NameFilter}
                        placeholder="Kod2 Adı"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>
                  </View>

                  <View style={styles.filterFieldRow}>
                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod3
                      </Text>
                      <TextInput
                        value={tempCode3Filter}
                        onChangeText={setTempCode3Filter}
                        placeholder="Kod3"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>

                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod3 Adı
                      </Text>
                      <TextInput
                        value={tempCode3NameFilter}
                        onChangeText={setTempCode3NameFilter}
                        placeholder="Kod3 Adı"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>
                  </View>

                  <View style={styles.filterFieldRow}>
                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod4
                      </Text>
                      <TextInput
                        value={tempCode4Filter}
                        onChangeText={setTempCode4Filter}
                        placeholder="Kod4"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>

                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod4 Adı
                      </Text>
                      <TextInput
                        value={tempCode4NameFilter}
                        onChangeText={setTempCode4NameFilter}
                        placeholder="Kod4 Adı"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>
                  </View>

                  <View style={styles.filterFieldRow}>
                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod5
                      </Text>
                      <TextInput
                        value={tempCode5Filter}
                        onChangeText={setTempCode5Filter}
                        placeholder="Kod5"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>

                    <View style={styles.filterField}>
                      <Text style={[styles.filterFieldLabel, { color: mutedColor }]}>
                        Kod5 Adı
                      </Text>
                      <TextInput
                        value={tempCode5NameFilter}
                        onChangeText={setTempCode5NameFilter}
                        placeholder="Kod5 Adı"
                        placeholderTextColor={mutedColor}
                        style={[styles.filterFieldInput, { color: textColor, borderColor, backgroundColor: inputBg }]}
                      />
                    </View>
                  </View>
                </View>
              </FlatListScrollView>

              <View style={[styles.filterModalFooter, { borderTopColor: borderColor }]}>
                <View style={styles.filterFooterRow}>
                  <TouchableOpacity
                    style={[styles.filterFooterSecondaryBtn, { borderColor, backgroundColor: mainBg }]}
                    onPress={() => setIsFilterModalVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.filterFooterSecondaryBtnText, { color: textColor }]}>
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterFooterSecondaryBtn, { borderColor, backgroundColor: inputBg }]}
                    onPress={clearFilters}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.filterFooterSecondaryBtnText, { color: mutedColor }]}>
                      {t("common.clear")}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.filterFooterPrimaryBtn, { backgroundColor: brandColor }]}
                  onPress={applyFilters}
                  activeOpacity={0.88}
                >
                  <MaterialCommunityIcons name="check" size={18} color="#fff" style={styles.filterFooterPrimaryIcon} />
                  <Text style={styles.filterPrimaryButtonText}>{t("common.apply")}</Text>
                </TouchableOpacity>
              </View>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 11,
    minHeight: 50,
    justifyContent: "center",
    borderWidth: 1.3,
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
    fontSize: 13.2,
    fontWeight: "500",
    flex: 1,
  },
  pickerTextProductName: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    position: "relative",
  },
  catalogButton: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  catalogButtonText: {
    fontSize: 10,
    fontWeight: "700",
  },
  filterButtonText: {
    fontSize: 10,
    fontWeight: "700",
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
  filterModalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  filterModalShell: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  filterModalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.22,
        shadowRadius: 28,
      },
      android: { elevation: 18 },
      default: {},
    }),
  },
  filterModalInner: {
    flex: 1,
    flexDirection: "column",
    width: "100%",
    minHeight: 0,
  },
  filterModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexShrink: 0,
  },
  filterModalHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  filterModalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterModalHeaderTitles: {
    flex: 1,
    minWidth: 0,
  },
  filterModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  filterModalSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  filterModalCloseHit: {
    padding: 8,
    borderRadius: 12,
  },
  filterFormScroll: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  filterFormScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  filterFields: {
    padding: 18,
    gap: 14,
  },
  logicRow: {
    gap: 8,
  },
  logicSegmentTrack: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  logicSegmentButton: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  logicSegmentButtonText: {
    fontSize: 13,
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
  filterFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterFieldInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  filterModalFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 10,
    flexShrink: 0,
  },
  filterFooterRow: {
    flexDirection: "row",
    gap: 10,
  },
  filterFooterSecondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  filterFooterSecondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterFooterPrimaryBtn: {
    minHeight: 50,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  filterFooterPrimaryIcon: {
    marginTop: 1,
  },
  filterPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
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
    paddingVertical: 6,
    borderBottomWidth: 1.8,
    minHeight: 78,
  },
  stockItemTouchable: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  stockInfoRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    marginRight: 12,
  },
  stockIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
    borderWidth: 1,
    position: "relative",
  },
  priorPickBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  stockInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  metaPill: {
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
    minHeight: 15,
    justifyContent: "center",
  },
  relatedStockBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  relatedStockBadgeText: {
    fontSize: 9,
    fontWeight: "600",
  },
  stockName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    marginBottom: 0,
    flexShrink: 1,
    includeFontPadding: false,
  },
  stockCode: {
    fontSize: 10.1,
    lineHeight: 13,
    fontWeight: "400",
    includeFontPadding: false,
  },
  stockMeta: {
    fontSize: 8.8,
    lineHeight: 12,
    marginTop: 0,
    letterSpacing: 0.12,
    includeFontPadding: false,
  },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
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
  multiSelectionContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  selectionChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  selectionChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  selectionChipText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: "500",
  },
  selectionChipRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  selectionChipRemoveText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "600",
  },
  multiFooter: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  multiFooterButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  multiFooterButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  multiFooterPrimaryShadow: {
    shadowColor: "#db2777",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  multiFooterPrimaryDisabled: {
    opacity: 0.5,
  },
  multiFooterPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
  },
});

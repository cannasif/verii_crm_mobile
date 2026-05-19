import { pricingRuleApi, type PricingRuleHeaderDto, type PricingRuleLineDto } from "../api/pricingRuleApi";
import type { CatalogCampaignPricingDisplay, CatalogPricingRuleType } from "../types/catalogPicker";

export interface CampaignStockDataResult {
  orderedCodes: string[];
  pricingByCodeLower: Record<string, CatalogCampaignPricingDisplay>;
}

const MAX_HEADER_PAGES = 200;

const isWithinToday = (header: PricingRuleHeaderDto, today: Date): boolean => {
  const start = header.validFrom ? new Date(header.validFrom) : null;
  const end = header.validTo ? new Date(header.validTo) : null;
  if (start && start > today) return false;
  if (end && end < today) return false;
  return true;
};

const isGlobalHeader = (header: PricingRuleHeaderDto): boolean =>
  header.customerId == null && String(header.erpCustomerCode ?? "").trim() === "";

const headerMatchesCustomer = (
  header: PricingRuleHeaderDto,
  customerId?: number | null,
  erpCustomerCode?: string | null
): boolean => {
  const hasCustomerFilter = customerId != null || String(erpCustomerCode ?? "").trim() !== "";

  if (!hasCustomerFilter) {
    return isGlobalHeader(header);
  }

  if (isGlobalHeader(header)) {
    return true;
  }

  if (customerId != null && header.customerId != null && header.customerId === customerId) {
    return true;
  }

  const normalizedCode = String(erpCustomerCode ?? "").trim().toLowerCase();
  const headerCode = String(header.erpCustomerCode ?? "").trim().toLowerCase();
  return normalizedCode !== "" && headerCode !== "" && normalizedCode === headerCode;
};

const toPricingDisplay = (line: PricingRuleLineDto): CatalogCampaignPricingDisplay => ({
  referencePrice: line.fixedUnitPrice ?? null,
  netPrice: line.fixedUnitPrice ?? null,
  discountRate1: line.discountRate1 ?? null,
  discountRate2: line.discountRate2 ?? null,
  discountRate3: line.discountRate3 ?? null,
  discountAmount1: line.discountAmount1 ?? null,
  discountAmount2: line.discountAmount2 ?? null,
  discountAmount3: line.discountAmount3 ?? null,
  currencyCode: line.currencyCode ?? null,
});

const fetchAllHeaders = async (filters: Parameters<typeof pricingRuleApi.queryHeaders>[0]["filters"]) => {
  const items: PricingRuleHeaderDto[] = [];
  let pageNumber = 1;
  let hasNextPage = true;

  while (hasNextPage && pageNumber <= MAX_HEADER_PAGES) {
    const page = await pricingRuleApi.queryHeaders({
      pageNumber,
      pageSize: 100,
      filters,
      filterLogic: "and",
    });
    items.push(...page.items);
    hasNextPage = page.hasNextPage;
    pageNumber += 1;
  }

  return items;
};

export async function fetchPricingRuleCampaignStockData(params: {
  pricingRuleType: CatalogPricingRuleType;
  customerId?: number | null;
  erpCustomerCode?: string | null;
}): Promise<CampaignStockDataResult> {
  const today = new Date();
  const ruleTypeValue = String(pricingRuleApi.getRuleTypeValue(params.pricingRuleType));

  let headers = await fetchAllHeaders([
    { column: "RuleType", operator: "eq", value: ruleTypeValue },
    { column: "IsActive", operator: "eq", value: "true" },
  ]);

  if (headers.length === 0) {
    headers = await fetchAllHeaders([]);
    headers = headers.filter(
      (header) => header.ruleType === pricingRuleApi.getRuleTypeValue(params.pricingRuleType) && header.isActive
    );
  }

  const activeHeaders = headers.filter(
    (header) => header.isActive && isWithinToday(header, today) && headerMatchesCustomer(header, params.customerId, params.erpCustomerCode)
  );

  const orderedCodes: string[] = [];
  const pricingByCodeLower: Record<string, CatalogCampaignPricingDisplay> = {};
  const seen = new Set<string>();

  for (const header of activeHeaders) {
    const lines: PricingRuleLineDto[] = await pricingRuleApi.getLinesByHeaderId(header.id);
    for (const line of lines) {
      const code = line.stokCode.trim();
      if (!code) continue;
      const lower = code.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        orderedCodes.push(code);
      }
      pricingByCodeLower[lower] = toPricingDisplay(line);
    }
  }

  return { orderedCodes, pricingByCodeLower };
}

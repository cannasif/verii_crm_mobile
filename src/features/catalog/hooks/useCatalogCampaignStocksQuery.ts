import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/features/stocks/api/stock-api";
import { mapStockGetToCatalogItem } from "../utils/catalog-stock-mapping";
import { fetchPricingRuleCampaignStockData } from "../utils/fetch-pricing-rule-campaign-stock-data";
import type { CatalogCampaignPricingDisplay, CatalogPricingRuleType } from "../types/catalog-picker";
import type { CatalogStockItemDto } from "../types/catalog-types";
import { catalogQueryKeys } from "../utils/query-keys";

interface UseCatalogCampaignStocksQueryParams {
  enabled: boolean;
  pricingRuleType: CatalogPricingRuleType;
  customerId?: number | null;
  erpCustomerCode?: string | null;
}

export interface CatalogCampaignStocksResult {
  items: CatalogStockItemDto[];
  pricingByCodeLower: Record<string, CatalogCampaignPricingDisplay>;
}

export function useCatalogCampaignStocksQuery(params: UseCatalogCampaignStocksQueryParams) {
  const { enabled, pricingRuleType, customerId, erpCustomerCode } = params;

  return useQuery<CatalogCampaignStocksResult, Error>({
    queryKey: catalogQueryKeys.campaign(pricingRuleType, customerId, erpCustomerCode),
    queryFn: async () => {
      const campaignData = await fetchPricingRuleCampaignStockData({
        pricingRuleType,
        customerId,
        erpCustomerCode,
      });

      if (campaignData.orderedCodes.length === 0) {
        return { items: [], pricingByCodeLower: campaignData.pricingByCodeLower };
      }

      const stocks = await stockApi.getListByErpStockCodes(campaignData.orderedCodes);
      const items = stocks.map((stock) => mapStockGetToCatalogItem(stock));

      return {
        items,
        pricingByCodeLower: campaignData.pricingByCodeLower,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

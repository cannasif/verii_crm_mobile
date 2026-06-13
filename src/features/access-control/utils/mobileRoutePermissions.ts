export interface MobileRoutePermissionRule {
  pattern: RegExp;
  requiredCodes: string[];
  mode?: "any" | "all";
}

const CUSTOMER_VIEW_CODES = [
  "customers.customer-management.view",
  "customers.contact-management.view",
  "customers.customer-type-management.view",
  "customers.erp-customers.view",
  "definitions.shipping-address-management.view",
];

const SALES_VIEW_CODES = [
  "sales.quotations.view",
  "sales.orders.view",
  "sales.demands.view",
];

const ACTIVITY_VIEW_CODES = [
  "activity.activity-management.view",
  "activity.daily-tasks.view",
];

export const MOBILE_ROUTE_PERMISSION_RULES: MobileRoutePermissionRule[] = [
  { pattern: /^\/$/, requiredCodes: ["dashboard.view"] },
  { pattern: /^\/access-control-simulator$/, requiredCodes: ["access-control.permission-groups.view"] },

  { pattern: /^\/customers\/create$/, requiredCodes: ["customers.customer-management.create"] },
  { pattern: /^\/customers\/edit\/[^/]+$/, requiredCodes: ["customers.customer-management.update"] },
  { pattern: /^\/customers\/contacts\/create$/, requiredCodes: ["customers.contact-management.create"] },
  { pattern: /^\/customers\/shipping\/create$/, requiredCodes: ["definitions.shipping-address-management.create"] },

  { pattern: /^\/customers\/contacts(\/.*)?$/, requiredCodes: ["customers.contact-management.view"] },
  { pattern: /^\/customers\/shipping(\/.*)?$/, requiredCodes: ["definitions.shipping-address-management.view"] },
  { pattern: /^\/customers\/titles(\/.*)?$/, requiredCodes: ["customers.customer-type-management.view"] },
  { pattern: /^\/customers\/erp(\/.*)?$/, requiredCodes: ["customers.erp-customers.view"] },
  { pattern: /^\/customers\/360\/[^/]+$/, requiredCodes: ["customers.customer-management.view"] },
  { pattern: /^\/customers(\/.*)?$/, requiredCodes: CUSTOMER_VIEW_CODES, mode: "any" },

  { pattern: /^\/sales\/quotations\/create$/, requiredCodes: ["sales.quotations.create"] },
  { pattern: /^\/sales\/quotations\/waiting-approvals$/, requiredCodes: ["sales.quotations.approve"] },
  { pattern: /^\/sales\/quotations(\/.*)?$/, requiredCodes: ["sales.quotations.view"] },

  { pattern: /^\/sales\/orders\/create$/, requiredCodes: ["sales.orders.create"] },
  { pattern: /^\/sales\/orders\/waiting-approvals$/, requiredCodes: ["sales.orders.approve"] },
  { pattern: /^\/sales\/orders(\/.*)?$/, requiredCodes: ["sales.orders.view"] },

  { pattern: /^\/sales\/demands\/create$/, requiredCodes: ["sales.demands.create"] },
  { pattern: /^\/sales\/demands\/waiting-approvals$/, requiredCodes: ["sales.demands.approve"] },
  { pattern: /^\/sales\/demands(\/.*)?$/, requiredCodes: ["sales.demands.view"] },

  { pattern: /^\/sales\/sales-kpi$/, requiredCodes: ["salesmen360.overview.view"] },

  { pattern: /^\/sales(\/.*)?$/, requiredCodes: SALES_VIEW_CODES, mode: "any" },

  { pattern: /^\/activities\/create$/, requiredCodes: ["activity.activity-management.create"] },
  { pattern: /^\/activities\/edit\/[^/]+$/, requiredCodes: ["activity.activity-management.update"] },
  { pattern: /^\/activities\/daily-tasks$/, requiredCodes: ["activity.daily-tasks.view"] },
  { pattern: /^\/activities\/rota$/, requiredCodes: ["activity.daily-tasks.view"] },
  { pattern: /^\/activities(\/.*)?$/, requiredCodes: ACTIVITY_VIEW_CODES, mode: "any" },

  { pattern: /^\/stock(\/.*)?$/, requiredCodes: ["stock.stocks.view"] },
];

export function getMobileRoutePermissionRule(pathname: string): MobileRoutePermissionRule | null {
  return MOBILE_ROUTE_PERMISSION_RULES.find((rule) => rule.pattern.test(pathname)) ?? null;
}

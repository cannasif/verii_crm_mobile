import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "src");
const extensions = new Set([".ts", ".tsx"]);
const failures = [];

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(fullPath));
    else if (extensions.has(path.extname(entry.name))) result.push(fullPath);
  }
  return result;
}

for (const file of await walk(src)) {
  const content = await readFile(file, "utf8");
  const relative = path.relative(root, file);
  const lines = content.split(/\r?\n/);

  for (const match of content.matchAll(/interface\s+\w*(?:PagedParams|PagedQueryParams)\w*\s*(?:extends[^\{]+)?\{([\s\S]*?)\n\}/g)) {
    const body = match[1];
    if (body.includes("search?:") && !body.includes("searchFields?:")) {
      failures.push(`${relative}: paged request type has search but no searchFields`);
    }
  }

  lines.forEach((line, index) => {
    if (!/search:\s*(?:params|request)\.search/.test(line)) return;
    const objectTail = lines.slice(index, index + 8).join("\n");
    if (!objectTail.includes("searchFields")) {
      failures.push(`${relative}:${index + 1} paged serializer drops searchFields`);
    }
  });
}

const requiredContracts = [
  ["src/lib/paged.ts", "searchFields: params.searchFields ?? []"],
  ["src/features/stocks/screens/StockListScreen.tsx", "STOCK_LIST_SEARCH_FIELDS"],
  ["src/features/customer/screens/CustomerListScreen.tsx", "CUSTOMER_LIST_SEARCH_FIELDS"],
  ["src/features/contact/screens/ContactListScreen.tsx", "CONTACT_LIST_SEARCH_FIELDS"],
  ["src/features/shipping-address/screens/ShippingAddressListScreen.tsx", "SHIPPING_ADDRESS_LIST_SEARCH_FIELDS"],
  ["src/features/activity/screens/ActivityListScreen.tsx", "ACTIVITY_LIST_SEARCH_FIELDS"],
  ["src/features/order/screens/OrderListScreen.tsx", "SALES_DOCUMENT_LIST_SEARCH_FIELDS"],
  ["src/features/demand/screens/DemandListScreen.tsx", "SALES_DOCUMENT_LIST_SEARCH_FIELDS"],
  ["src/features/quotation/screens/QuotationListScreen.tsx", "SALES_DOCUMENT_LIST_SEARCH_FIELDS"],
  ["src/features/customer/components/CustomerSelectDialog.tsx", "searchFields: customerSearchFields"],
  ["src/features/demand/components/ProductPicker.tsx", "searchFields: stockSearchFields"],
  ["src/features/quotation/components/ProductPicker.tsx", "searchFields: stockSearchFields"],
  ["src/features/order/components/ProductPicker.tsx", "searchFields: stockSearchFields"],
  ["src/features/catalog/api/catalogApi.ts", "query.append(\"searchFields\", field)"],
];

for (const [file, expected] of requiredContracts) {
  const content = await readFile(path.join(root, file), "utf8");
  if (!content.includes(expected)) failures.push(`${file}: missing ${expected}`);
}

if (failures.length) {
  console.error(`Paged SearchFields check failed:\n\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Paged SearchFields check passed.");

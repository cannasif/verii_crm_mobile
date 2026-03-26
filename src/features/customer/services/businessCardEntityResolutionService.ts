import type { CustomerDto, PagedFilter } from "../types";
import type { BusinessCardOcrResult } from "../types/businessCard";

export type BusinessCardMatchCandidate = {
  customer: CustomerDto;
  score: number;
  reasons: string[];
};

function normalizeDigits(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeText(value?: string | null): string {
  return (value ?? "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function domainOf(value?: string | null): string {
  const lower = normalizeText(value);
  if (!lower) return "";
  if (lower.includes("@")) return lower.split("@")[1] ?? "";
  return lower.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
}

export function buildBusinessCardPotentialMatchFilters(result: BusinessCardOcrResult): PagedFilter[] {
  const filters: PagedFilter[] = [];
  if (result.email) {
    filters.push({ column: "Email", operator: "Contains", value: result.email });
  }
  if (result.phone1) {
    filters.push({ column: "Phone", operator: "Contains", value: result.phone1 });
    filters.push({ column: "Phone2", operator: "Contains", value: result.phone1 });
  }
  if (result.phone2) {
    filters.push({ column: "Phone", operator: "Contains", value: result.phone2 });
    filters.push({ column: "Phone2", operator: "Contains", value: result.phone2 });
  }
  if (result.website) {
    filters.push({ column: "Website", operator: "Contains", value: result.website });
  }
  if (result.customerName) {
    filters.push({ column: "Name", operator: "Contains", value: result.customerName });
  }
  return filters;
}

export function scoreBusinessCardPotentialMatches(result: BusinessCardOcrResult, customers: CustomerDto[]): BusinessCardMatchCandidate[] {
  const targetEmail = normalizeText(result.email);
  const targetPhone1 = normalizeDigits(result.phone1);
  const targetPhone2 = normalizeDigits(result.phone2);
  const targetWebsiteDomain = domainOf(result.website);
  const targetName = normalizeText(result.customerName);

  return customers
    .map((customer) => {
      let score = 0;
      const reasons: string[] = [];
      const customerEmail = normalizeText(customer.email);
      const customerPhone = normalizeDigits(customer.phone);
      const customerPhone2 = normalizeDigits(customer.phone2);
      const customerWebsite = domainOf(customer.website);
      const customerName = normalizeText(customer.name);

      if (targetEmail && customerEmail && targetEmail === customerEmail) {
        score += 60;
        reasons.push("E-posta eşleşti");
      }

      const phoneCandidates = [customerPhone, customerPhone2].filter(Boolean);
      if (targetPhone1 && phoneCandidates.some((phone) => phone.endsWith(targetPhone1) || targetPhone1.endsWith(phone))) {
        score += 45;
        reasons.push("Telefon eşleşti");
      }
      if (targetPhone2 && phoneCandidates.some((phone) => phone.endsWith(targetPhone2) || targetPhone2.endsWith(phone))) {
        score += 35;
        reasons.push("İkinci telefon eşleşti");
      }

      if (targetWebsiteDomain && customerWebsite && (customerWebsite.includes(targetWebsiteDomain) || targetWebsiteDomain.includes(customerWebsite))) {
        score += 30;
        reasons.push("Website domain eşleşti");
      }

      if (targetName && customerName && (customerName.includes(targetName) || targetName.includes(customerName))) {
        score += 18;
        reasons.push("Firma adı benziyor");
      }

      return { customer, score, reasons };
    })
    .filter((candidate) => candidate.score >= 30)
    .sort((left, right) => right.score - left.score || left.customer.name.localeCompare(right.customer.name, "tr"))
    .slice(0, 5);
}

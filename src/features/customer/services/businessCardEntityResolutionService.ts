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

function normalizeCompanyKey(value?: string | null): string {
  return normalizeText(value)
    .replace(/\b(a\.?ş\.?|anonim şirket|ltd\.?\s*şti\.?|ltd\.?|şti\.?|gmbh|ag|ug|llc|inc|corp|corporation|holding|group|grup)\b/gi, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function domainOf(value?: string | null): string {
  const lower = normalizeText(value);
  if (!lower) return "";
  if (lower.includes("@")) return lower.split("@")[1] ?? "";
  return lower.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
}

function websiteStem(value?: string | null): string {
  const domain = domainOf(value);
  return domain.split(".")[0] ?? "";
}

function phoneTail(value?: string | null, size = 7): string {
  const digits = normalizeDigits(value);
  return digits.slice(-size);
}

function tokensOf(value?: string | null): string[] {
  return normalizeCompanyKey(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function tokenOverlapScore(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  return intersection / Math.max(leftSet.size, rightSet.size);
}

export function buildBusinessCardPotentialMatchFilters(result: BusinessCardOcrResult): PagedFilter[] {
  const filters: PagedFilter[] = [];
  const pushUnique = (filter: PagedFilter): void => {
    if (!filter.value) return;
    if (!filters.some((existing) => existing.column === filter.column && existing.operator === filter.operator && existing.value === filter.value)) {
      filters.push(filter);
    }
  };
  if (result.email) {
    pushUnique({ column: "Email", operator: "Contains", value: result.email });
  }
  if (result.phone1) {
    pushUnique({ column: "Phone", operator: "Contains", value: result.phone1 });
    pushUnique({ column: "Phone2", operator: "Contains", value: result.phone1 });
    const tail = phoneTail(result.phone1);
    if (tail.length >= 7) {
      pushUnique({ column: "Phone", operator: "Contains", value: tail });
      pushUnique({ column: "Phone2", operator: "Contains", value: tail });
    }
  }
  if (result.phone2) {
    pushUnique({ column: "Phone", operator: "Contains", value: result.phone2 });
    pushUnique({ column: "Phone2", operator: "Contains", value: result.phone2 });
    const tail = phoneTail(result.phone2);
    if (tail.length >= 7) {
      pushUnique({ column: "Phone", operator: "Contains", value: tail });
      pushUnique({ column: "Phone2", operator: "Contains", value: tail });
    }
  }
  if (result.website) {
    pushUnique({ column: "Website", operator: "Contains", value: result.website });
    const stem = websiteStem(result.website);
    if (stem.length >= 3) {
      pushUnique({ column: "Website", operator: "Contains", value: stem });
      pushUnique({ column: "Name", operator: "Contains", value: stem });
    }
  }
  if (result.customerName) {
    pushUnique({ column: "Name", operator: "Contains", value: result.customerName });
    for (const token of tokensOf(result.customerName).slice(0, 3)) {
      pushUnique({ column: "Name", operator: "Contains", value: token });
    }
  }
  return filters;
}

export function scoreBusinessCardPotentialMatches(result: BusinessCardOcrResult, customers: CustomerDto[]): BusinessCardMatchCandidate[] {
  const targetEmail = normalizeText(result.email);
  const targetPhone1 = normalizeDigits(result.phone1);
  const targetPhone2 = normalizeDigits(result.phone2);
  const targetWebsiteDomain = domainOf(result.website);
  const targetWebsiteStem = websiteStem(result.website);
  const targetName = normalizeText(result.customerName);
  const targetCompanyKey = normalizeCompanyKey(result.customerName);
  const targetNameTokens = tokensOf(result.customerName);

  return customers
    .map((customer) => {
      let score = 0;
      const reasons: string[] = [];
      const customerEmail = normalizeText(customer.email);
      const customerPhone = normalizeDigits(customer.phone);
      const customerPhone2 = normalizeDigits(customer.phone2);
      const customerWebsite = domainOf(customer.website);
      const customerWebsiteStem = websiteStem(customer.website);
      const customerName = normalizeText(customer.name);
      const customerCompanyKey = normalizeCompanyKey(customer.name);
      const customerNameTokens = tokensOf(customer.name);

      if (targetEmail && customerEmail && targetEmail === customerEmail) {
        score += 60;
        reasons.push("E-posta eşleşti");
      }

      const phoneCandidates = [customerPhone, customerPhone2].filter(Boolean);
      if (targetPhone1 && phoneCandidates.some((phone) => phone.endsWith(targetPhone1) || targetPhone1.endsWith(phone))) {
        score += 45;
        reasons.push("Telefon eşleşti");
      } else if (targetPhone1) {
        const tail = targetPhone1.slice(-7);
        if (tail.length >= 7 && phoneCandidates.some((phone) => phone.endsWith(tail))) {
          score += 22;
          reasons.push("Telefon son haneleri benziyor");
        }
      }
      if (targetPhone2 && phoneCandidates.some((phone) => phone.endsWith(targetPhone2) || targetPhone2.endsWith(phone))) {
        score += 35;
        reasons.push("İkinci telefon eşleşti");
      }

      if (targetWebsiteDomain && customerWebsite && (customerWebsite.includes(targetWebsiteDomain) || targetWebsiteDomain.includes(customerWebsite))) {
        score += 30;
        reasons.push("Website domain eşleşti");
      } else if (targetWebsiteStem && customerWebsiteStem && targetWebsiteStem === customerWebsiteStem) {
        score += 20;
        reasons.push("Website kök adı eşleşti");
      }

      if (targetName && customerName && (customerName.includes(targetName) || targetName.includes(customerName))) {
        score += 18;
        reasons.push("Firma adı benziyor");
      }

      if (targetCompanyKey && customerCompanyKey && targetCompanyKey === customerCompanyKey) {
        score += 28;
        reasons.push("Firma normalize adı eşleşti");
      } else {
        const overlap = tokenOverlapScore(targetNameTokens, customerNameTokens);
        if (overlap >= 0.8) {
          score += 20;
          reasons.push("Firma tokenları güçlü eşleşti");
        } else if (overlap >= 0.5) {
          score += 10;
          reasons.push("Firma tokenları kısmi eşleşti");
        }
      }

      return { customer, score, reasons };
    })
    .filter((candidate) => candidate.score >= 30)
    .sort((left, right) => right.score - left.score || left.customer.name.localeCompare(right.customer.name, "tr"))
    .slice(0, 5);
}

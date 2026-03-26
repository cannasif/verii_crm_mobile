import type { BusinessCardExtraction } from "../types/businessCard";

export type BusinessCardBenchmarkFixture = {
  id: string;
  locale: "tr" | "intl" | "ru";
  rawText: string;
  rawLines?: string[];
  expected: Partial<BusinessCardExtraction>;
  criticalFields: Array<keyof Pick<BusinessCardExtraction, "company" | "name" | "title" | "website" | "address"> | "phones[0]" | "emails[0]">;
};

const emptySocial = {
  linkedin: null,
  instagram: null,
  x: null,
  facebook: null,
} as const;

const emptyAddressParts = {
  neighborhood: null,
  street: null,
  avenue: null,
  boulevard: null,
  sitePlaza: null,
  block: null,
  buildingNo: null,
  floor: null,
  apartment: null,
  postalCode: null,
  district: null,
  province: null,
  country: null,
} as const;

export const businessCardBenchmarkFixtures: BusinessCardBenchmarkFixture[] = [
  {
    id: "trade-lines-tr",
    locale: "tr",
    rawText: [
      "Trade Lines",
      "Full Logistics and Trade Solutions",
      "Melisa TATAROĞLU",
      "Sales & Marketing",
      "+90 538 594 59 93",
      "+90 216 499 99 59 /104",
      "melisa@tradelines.com.tr",
      "www.tradelines.com.tr",
      "Caferağa Mah. Moda Cad. No:30/4 34710 Kadıköy / İstanbul - Türkiye",
    ].join("\n"),
    expected: {
      company: "Trade Lines",
      name: "Melisa TATAROĞLU",
      title: "Sales & Marketing",
      phones: ["+905385945993"],
      emails: ["melisa@tradelines.com.tr"],
      website: "www.tradelines.com.tr",
      address: "Caferağa Mah. Moda Cad. No:30/4, 34710, Kadıköy/İstanbul",
      addressParts: { ...emptyAddressParts },
      social: { ...emptySocial },
      notes: [],
      contactNameAndSurname: "Melisa TATAROĞLU",
    },
    criticalFields: ["company", "name", "phones[0]", "emails[0]", "website"],
  },
  {
    id: "strong-bull-es",
    locale: "intl",
    rawText: [
      "Strong Bull Maquinaria S.L.",
      "Sandra Lorido",
      "Export Manager",
      "Calle Guris, s/n - nave 1 - Chayán",
      "15687 TRAZO (A Coruña) - España",
      "Teléfono 0034 981 699 140",
      "E-mail: sandra@strongbull.es",
      "www.strongbull.es",
    ].join("\n"),
    expected: {
      company: "Strong Bull Maquinaria S.L.",
      name: "Sandra Lorido",
      title: "Export Manager",
      phones: ["+34981699140"],
      emails: ["sandra@strongbull.es"],
      website: "www.strongbull.es",
      social: { ...emptySocial },
      notes: [],
      addressParts: { ...emptyAddressParts },
      contactNameAndSurname: "Sandra Lorido",
    },
    criticalFields: ["company", "name", "phones[0]", "emails[0]", "website"],
  },
  {
    id: "rob-locks-ru",
    locale: "ru",
    rawText: [
      "rob locks security systems",
      "Dmitrii A. Kholodkov",
      "Sales division manager",
      "Office +7 495 223 80 03 ext. 200",
      "Cell +7 917 507 33 17",
      "e-mail: hd@rob-locks.ru",
      "109428, Russia, Moscow, Ryazanskiy prospect str., 24, build.1",
      "www.ravbariach.ru",
    ].join("\n"),
    expected: {
      company: "rob locks security systems",
      name: "Dmitrii A. Kholodkov",
      title: "Sales division manager",
      phones: ["+74952238003"],
      emails: ["hd@rob-locks.ru"],
      website: "www.ravbariach.ru",
      social: { ...emptySocial },
      notes: [],
      addressParts: { ...emptyAddressParts },
      contactNameAndSurname: "Dmitrii A. Kholodkov",
    },
    criticalFields: ["company", "name", "phones[0]", "emails[0]", "website"],
  },
];

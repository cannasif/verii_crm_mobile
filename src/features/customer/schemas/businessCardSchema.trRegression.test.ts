import assert from "node:assert/strict";
import { validateAndNormalizeBusinessCardExtraction } from "./businessCardSchema";

const emptySocial = {
  linkedin: null,
  instagram: null,
  x: null,
  facebook: null,
} as const;

type Case = {
  name: string;
  input: Parameters<typeof validateAndNormalizeBusinessCardExtraction>[0];
  rawText: string;
  assertResult: (result: ReturnType<typeof validateAndNormalizeBusinessCardExtraction>) => void;
};

const cases: Case[] = [
  {
    name: "Winax / TR",
    rawText: `winax
TARIK HOSKAN
EXPORT AREA MANAGER
EREN PVC KAPI VE PENCERE AKS.SAN.DIŞ TİC.LTD.ŞTİ.
Orhan Gazi Mah.Isıso San.Sit.
14.Yol Sok. U-1 Blok No:10-12
Esenyurt-İSTANBUL
Tel : +90 212 623 04 50
Faks : +90 212 623 04 77
Gsm : +90 530 955 04 31
web: www.winax.com e-mail: tarik@winax.com`,
    input: {
      contactNameAndSurname: "Tarık Hoskan",
      name: "Tarık Hoskan",
      title: "Export Area Manager",
      company: "Eren PVC Kapı ve Pencere Aks.San.Dış Tic.Ltd.Şti.",
      phones: ["+90 212 623 04 50", "+90 530 955 04 31"],
      emails: ["tarik@winax.com"],
      website: "www.winax.com",
      address: "Orhan Gazi Mah. Isıso San. Sit. 14. Yol Sk. U-1 Blok No:10-12, Esenyurt/İstanbul",
      addressParts: {
        neighborhood: "Orhan Gazi Mah.",
        street: "14. Yol Sk.",
        avenue: null,
        boulevard: null,
        sitePlaza: "Isıso San. Sit.",
        block: "U-1 Blok",
        buildingNo: "No:10-12",
        floor: null,
        apartment: null,
        postalCode: null,
        district: "Esenyurt",
        province: "İstanbul",
        country: "Türkiye",
      },
      social: emptySocial,
      notes: ["Fax: +902126230477", "Marka: winax"],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Tarık Hoskan");
      assert.equal(result.phones[0], "+905309550431");
      assert.equal(result.phones[1], "+902126230450");
      assert.equal(result.website, "www.winax.com");
      assert.ok(result.notes.some((note) => note.includes("Fax")));
    },
  },
  {
    name: "Sinpas / TR extension",
    rawText: `SİNPAŞ REAL ESTATE
INVESTMENT COMPANY
Dikilitaş Mah. Yenidoğan Sok.
No:36 34349
Beşiktaş / İSTANBUL / TURKEY
Tel: +90 (212) 310 27 00 / 1388
Fax: +90 (212) 259 87 14
serdar.bilgin@sinpas.com.tr
www.sinpas.com.tr
Serdar BİLGİN
Architect
Purchasing and Logistics Chief`,
    input: {
      contactNameAndSurname: "Serdar Bilgin",
      name: "Serdar Bilgin",
      title: "Architect, Purchasing and Logistics Chief",
      company: "Sinpaş Real Estate Investment Company",
      phones: ["+90 (212) 310 27 00 / 1388"],
      emails: ["serdar.bilgin@sinpas.com.tr"],
      website: "www.sinpas.com.tr",
      address: "Dikilitaş Mah. Yenidoğan Sk. No:36, 34349, Beşiktaş/İstanbul",
      addressParts: {
        neighborhood: "Dikilitaş Mah.",
        street: "Yenidoğan Sk.",
        avenue: null,
        boulevard: null,
        sitePlaza: null,
        block: null,
        buildingNo: "No:36",
        floor: null,
        apartment: null,
        postalCode: "34349",
        district: "Beşiktaş",
        province: "İstanbul",
        country: "Türkiye",
      },
      social: emptySocial,
      notes: ["Dahili: 1388", "Fax: +902122598714"],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Serdar Bilgin");
      assert.equal(result.phones[0], "+902123102700");
      assert.ok(result.notes.some((note) => note.includes("Dahili: 1388")));
      assert.equal(result.addressParts.postalCode, "34349");
    },
  },
  {
    name: "BTSO / TR slogan and T-M labels",
    rawText: `Serkan DURMUŞ
Meclis Üyesi
BURSA
BÜYÜRSE
TÜRKİYE
BÜYÜR
Organize Sanayi Bölgesi
Mavi Cadde 2.Sokak No:2
16140 Nilüfer/BURSA
T I +90 (224) 275 16 30
M I +90 (532) 665 75 10
serkandurmus061@hotmail.com
www.btso.org.tr
BTSO
BURSA TİCARET VE SANAYİ ODASI`,
    input: {
      contactNameAndSurname: "Serkan Durmuş",
      name: "Serkan Durmuş",
      title: "Meclis Üyesi",
      company: "BTSO - Bursa Ticaret ve Sanayi Odası",
      phones: ["+90 (224) 275 16 30", "+90 (532) 665 75 10"],
      emails: ["serkandurmus061@hotmail.com"],
      website: "www.btso.org.tr",
      address: "Organize Sanayi Bölgesi, Mavi Cad. 2. Sk. No:2, 16140, Nilüfer/Bursa",
      addressParts: {
        neighborhood: null,
        street: "2. Sk.",
        avenue: "Mavi Cad.",
        boulevard: null,
        sitePlaza: "Organize Sanayi Bölgesi",
        block: null,
        buildingNo: "No:2",
        floor: null,
        apartment: null,
        postalCode: "16140",
        district: "Nilüfer",
        province: "Bursa",
        country: "Türkiye",
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.company, "BTSO - Bursa Ticaret ve Sanayi Odası");
      assert.equal(result.phones[0], "+905326657510");
      assert.equal(result.phones[1], "+902242751630");
      assert.equal(result.addressParts.district, "Nilüfer");
    },
  },
  {
    name: "Ayaydin / TR site plaza",
    rawText: `AYAYDIN MAKİNE
Tekstil Otomasyonu
Oğuzkağan Aydın
Satış ve Pazarlama Müdürü
info@ayaydinmakine.com
www.ayaydinmakine.com
+90 534 524 74 85
+90 212 813 19 71
Aktim 1 Ticaret ve İş Merkezi
Akçaburgaz Mh. Akçaburgaz
Cd. No:25 Esenyurt/İstanbul`,
    input: {
      contactNameAndSurname: "Oğuzkağan Aydın",
      name: "Oğuzkağan Aydın",
      title: "Satış ve Pazarlama Müdürü",
      company: "Ayaydın Makine",
      phones: ["+90 534 524 74 85", "+90 212 813 19 71"],
      emails: ["info@ayaydinmakine.com"],
      website: "www.ayaydinmakine.com",
      address: "Akçaburgaz Mah. Akçaburgaz Cad. No:25, Aktim 1 Ticaret ve İş Merkezi, Esenyurt/İstanbul",
      addressParts: {
        neighborhood: "Akçaburgaz Mah.",
        street: null,
        avenue: "Akçaburgaz Cad.",
        boulevard: null,
        sitePlaza: "Aktim 1 Ticaret ve İş Merkezi",
        block: null,
        buildingNo: "No:25",
        floor: null,
        apartment: null,
        postalCode: null,
        district: "Esenyurt",
        province: "İstanbul",
        country: "Türkiye",
      },
      social: emptySocial,
      notes: ["Faaliyet: Tekstil Otomasyonu"],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Oğuzkağan Aydın");
      assert.equal(result.phones[0], "+905345247485");
      assert.equal(result.phones[1], "+902128131971");
      assert.ok(result.address?.includes("Aktim 1 Ticaret ve İş Merkezi"));
    },
  },
  {
    name: "Trade Lines / TR extension",
    rawText: `Trade Lines
Full Logistics and Trade Solutions
Melisa TATAROĞLU
Sales & Marketing
+90 538 594 59 93
+90 216 499 99 59 (104)
melisa@tradelines.com.tr
www.tradelines.com.tr
Caferağa Mah. Moda Cad. No:30/4
34710 Kadıköy / İstanbul - Türkiye`,
    input: {
      contactNameAndSurname: "Melisa Tataroğlu",
      name: "Melisa Tataroğlu",
      title: "Sales & Marketing",
      company: "Trade Lines",
      phones: ["+90 538 594 59 93", "+90 216 499 99 59 (104)"],
      emails: ["melisa@tradelines.com.tr"],
      website: "www.tradelines.com.tr",
      address: "Caferağa Mah. Moda Cad. No:30/4, 34710, Kadıköy/İstanbul",
      addressParts: {
        neighborhood: "Caferağa Mah.",
        street: null,
        avenue: "Moda Cad.",
        boulevard: null,
        sitePlaza: null,
        block: null,
        buildingNo: "No:30/4",
        floor: null,
        apartment: null,
        postalCode: "34710",
        district: "Kadıköy",
        province: "İstanbul",
        country: "Türkiye",
      },
      social: emptySocial,
      notes: ["Dahili: 104", "Açıklama: Full Logistics and Trade Solutions"],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Melisa Tataroğlu");
      assert.equal(result.phones[0], "+905385945993");
      assert.equal(result.phones[1], "+902164999959");
      assert.ok(result.notes.some((note) => note.includes("Dahili: 104")));
      assert.equal(result.addressParts.postalCode, "34710");
    },
  },
  {
    name: "Windoform / TR factory address",
    rawText: `WINDOFORM
Volkan SAĞLIK
Genel Müdür Yardımcısı
Deputy General Manager
Tel : +90 232 854 70 00-01
Fax : +90 232 854 63 00
Mobil : +90 533 158 00 40
v.saglik@windoform.com.tr
Fabrika: Kazım Karabekir Mh.
Bekir Saydam Cd. No: 104
A-10 Blok No: 76-35870
Pancar - Torbalı - İZMİR
www.windoform.com`,
    input: {
      contactNameAndSurname: "Volkan Sağlık",
      name: "Volkan Sağlık",
      title: "Genel Müdür Yardımcısı / Deputy General Manager",
      company: "Windoform",
      phones: ["+90 533 158 00 40", "+90 232 854 70 00-01"],
      emails: ["v.saglik@windoform.com.tr"],
      website: "www.windoform.com",
      address: "Kazım Karabekir Mah. Bekir Saydam Cad. No:104, A-10 Blok, Pancar, Torbalı / İzmir",
      addressParts: {
        neighborhood: "Kazım Karabekir Mah.",
        street: null,
        avenue: "Bekir Saydam Cad.",
        boulevard: null,
        sitePlaza: null,
        block: "A-10 Blok",
        buildingNo: "No:104",
        floor: null,
        apartment: null,
        postalCode: null,
        district: "Torbalı",
        province: "İzmir",
        country: "Türkiye",
      },
      social: emptySocial,
      notes: ["Fax: +902328546300"],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Volkan Sağlık");
      assert.equal(result.phones[0], "+905331580040");
      assert.equal(result.website, "www.windoform.com");
      assert.equal(result.addressParts.block, "A-10 Blok");
      assert.equal(result.addressParts.province, "İzmir");
      assert.equal(result.addressParts.district, "Torbalı");
    },
  },
];

const failures: string[] = [];

for (const testCase of cases) {
  try {
    const isolatedInput = JSON.parse(JSON.stringify(testCase.input));
    const result = validateAndNormalizeBusinessCardExtraction(isolatedInput, testCase.rawText);
    testCase.assertResult(result);
    console.log(`PASS: ${testCase.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${testCase.name}: ${message}`);
    console.log(`FAIL: ${testCase.name} -> ${message}`);
  }
}

assert.equal(failures.length, 0, failures.join("\n"));
console.log("businessCardSchema TR regression test passed");

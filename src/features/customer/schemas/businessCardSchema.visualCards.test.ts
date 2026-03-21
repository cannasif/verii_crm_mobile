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
    name: "Strong Bull / Spain",
    rawText: `Strong Bull Maquinaria S.L.
Sandra Lorido
Export Manager
Calle Gurís, s/n - nave 1 · Chayán
15687 TRAZO (A Coruña) · España
Teléfono 0034 981 699 140 · Fax 0034 981 699 140
E-mail: sandra@strongbull.es · www.strongbull.es`,
    input: {
      contactNameAndSurname: "Sandra Lorido",
      name: "Sandra Lorido",
      title: "Export Manager",
      company: "Strong Bull Maquinaria S.L.",
      phones: ["0034 981 699 140"],
      emails: ["sandra@strongbull.es"],
      website: "www.strongbull.es",
      address: "Calle Gurís, s/n - nave 1, 15687 TRAZO (A Coruña), España",
      addressParts: {
        neighborhood: null,
        street: "Calle Gurís",
        avenue: null,
        boulevard: null,
        sitePlaza: "nave 1",
        block: null,
        buildingNo: "s/n",
        floor: null,
        apartment: null,
        postalCode: "15687",
        district: "Trazo",
        province: "A Coruña",
        country: "España",
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Sandra Lorido");
      assert.equal(result.phones[0], "+34981699140");
      assert.equal(result.website, "www.strongbull.es");
      assert.equal(result.addressParts.country, "España");
      assert.ok(result.address?.includes("España"));
    },
  },
  {
    name: "Ezgi Metal / TR",
    rawText: `EZGI METAL
ATİLA ÖNEK
EZGİ METAL SANAYİ ve TİC. LTD. ŞTİ.
Merkez: Topçular Mah. Rami Kışla Cad.
Üretmen İş Mrk. A Blok
No: 61/K Eyüp - İSTANBUL
Tel: 0212 612 6161 (pbx)
bilgi@ezgimetal.com.tr
www.ezgimetal.com.tr`,
    input: {
      contactNameAndSurname: "Atila Önek",
      name: "Atila Önek",
      title: null,
      company: "Ezgi Metal Sanayi ve Tic. Ltd. Şti.",
      phones: ["0212 612 6161 (pbx)"],
      emails: ["bilgi@ezgimetal.com.tr"],
      website: "www.ezgimetal.com.tr",
      address: "Topçular Mah. Rami Kışla Cad. Üretmen İş Mrk. A Blok No:61/K Eyüp / İstanbul",
      addressParts: {
        neighborhood: "Topçular Mah.",
        street: null,
        avenue: "Rami Kışla Cad.",
        boulevard: null,
        sitePlaza: "Üretmen İş Mrk.",
        block: "A Blok",
        buildingNo: "No:61/K",
        floor: null,
        apartment: null,
        postalCode: null,
        district: "Eyüp",
        province: "İstanbul",
        country: "Türkiye",
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.company, "Ezgi Metal Sanayi ve Tic. Ltd. Şti.");
      assert.equal(result.name, "Atila Önek");
      assert.equal(result.phones[0], "+902126126161");
      assert.equal(result.website, "www.ezgimetal.com.tr");
    },
  },
  {
    name: "Bozdogan Cam Balkon / TR vertical",
    rawText: `BOZDOĞAN CAM BALKON
Emre BOZDOĞAN
0 553 416 84 63
Atatürk San. Sit. 5542 Sk. No:11 Torbalı - İZMİR`,
    input: {
      contactNameAndSurname: "Emre Bozdoğan",
      name: "Emre Bozdoğan",
      title: null,
      company: "Bozdoğan Cam Balkon",
      phones: ["0 553 416 84 63"],
      emails: [],
      website: null,
      address: "Atatürk San. Sit. 5542 Sk. No:11 Torbalı / İzmir",
      addressParts: {
        neighborhood: null,
        street: "5542 Sk.",
        avenue: null,
        boulevard: null,
        sitePlaza: "Atatürk San. Sit.",
        block: null,
        buildingNo: "No:11",
        floor: null,
        apartment: null,
        postalCode: null,
        district: "Torbalı",
        province: "İzmir",
        country: "Türkiye",
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Emre Bozdoğan");
      assert.equal(result.company, "Bozdoğan Cam Balkon");
      assert.equal(result.phones[0], "+905534168463");
    },
  },
  {
    name: "Baygun / TR multi-address",
    rawText: `BAYGÜN HIRDAVAT İNŞAAT A.Ş.
Şeref AYVA
seref@baygunhirdavat.com
0535 248 61 11
Merkez: Ostim OSB Mahallesi 1161/1 Cadde No: 26/A Yenimahalle / ANKARA
Tel: 0312 346 41 41 · Fax: 0312 346 41 46
Şube: Hürriyet Mah. Dr. Cemil Bengü Cad. No:60/A Çağlayan / İSTANBUL
Tel: 0212 343 05 11 · Fax: 0212 343 05 12`,
    input: {
      contactNameAndSurname: "Şeref Ayva",
      name: "Şeref Ayva",
      title: null,
      company: "Baygün Hırdavat İnşaat A.Ş.",
      phones: ["0535 248 61 11", "0312 346 41 41"],
      emails: ["seref@baygunhirdavat.com"],
      website: null,
      address: "Ostim OSB Mahallesi 1161/1 Cadde No: 26/A Yenimahalle / ANKARA",
      addressParts: {
        neighborhood: "Ostim OSB Mahallesi",
        street: null,
        avenue: "1161/1 Cadde",
        boulevard: null,
        sitePlaza: null,
        block: null,
        buildingNo: "No:26/A",
        floor: null,
        apartment: null,
        postalCode: null,
        district: "Yenimahalle",
        province: "Ankara",
        country: "Türkiye",
      },
      social: emptySocial,
      notes: ["Fax: 0312 346 41 46", "Şube: Hürriyet Mah. Dr. Cemil Bengü Cad. No:60/A Çağlayan / İstanbul"],
    },
    assertResult: (result) => {
      assert.equal(result.phones[0], "+905352486111");
      assert.equal(result.phones[1], "+903123464141");
      assert.ok(result.notes.some((note) => note.includes("Fax")));
      assert.ok(result.notes.some((note) => note.toLowerCase().includes("şube")));
    },
  },
  {
    name: "M Sora / Kosovo",
    rawText: `M SORA
Nuhi Krasniqi
Manager
mob: +383 45 77 11 22
nuhi.krasniqi@m-sora.al
www.m-sora.al
PARKU I BIZNESIT
13000 DRENAS
REPUBLIKA E KOSOVËS`,
    input: {
      contactNameAndSurname: "Nuhi Krasniqi",
      name: "Nuhi Krasniqi",
      title: "Manager",
      company: "M SORA PRISHTINA sh.p.k.",
      phones: ["+383 45 77 11 22"],
      emails: ["nuhi.krasniqi@m-sora.al"],
      website: "www.m-sora.al",
      address: "Parku i Biznesit, 13000 Drenas, Republika e Kosovës",
      addressParts: {
        neighborhood: null,
        street: null,
        avenue: null,
        boulevard: null,
        sitePlaza: "Parku i Biznesit",
        block: null,
        buildingNo: null,
        floor: null,
        apartment: null,
        postalCode: "13000",
        district: "Drenas",
        province: null,
        country: "Kosovo",
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.phones[0], "+38345771122");
      assert.equal(result.website, "www.m-sora.al");
      assert.equal(result.addressParts.country, "Kosovo");
    },
  },
  {
    name: "Rob Locks / Russia",
    rawText: `rob locks security systems
Dmitrii A. Kholodkov
Sales division manager
Office: +7 495 223 80 03 ext. 200
Cell +7 917 507 33 17
e-mail: hd@rob-locks.ru
109428, Russia, Moscow,
Ryazanskiy prospect str., 24, build. 1
www.ravbariach.ru, www.cisa-russia.com`,
    input: {
      contactNameAndSurname: "Dmitrii A. Kholodkov",
      name: "Dmitrii A. Kholodkov",
      title: "Sales division manager",
      company: "rob locks security systems",
      phones: ["+7 495 223 80 03 ext. 200", "+7 917 507 33 17"],
      emails: ["hd@rob-locks.ru"],
      website: "www.cisa-russia.com",
      address: "109428, Russia, Moscow, Ryazanskiy prospect str., 24, build. 1",
      addressParts: {
        neighborhood: null,
        street: "Ryazanskiy prospect str.",
        avenue: null,
        boulevard: null,
        sitePlaza: null,
        block: null,
        buildingNo: "24",
        floor: null,
        apartment: "build. 1",
        postalCode: "109428",
        district: null,
        province: "Moscow",
        country: "Russia",
      },
      social: emptySocial,
      notes: ["Dahili: 200", "Marka/ek website: www.ravbariach.ru"],
    },
    assertResult: (result) => {
      assert.equal(result.phones[0], "+79175073317");
      assert.equal(result.phones[1], "+74952238003");
      assert.ok(result.notes.some((note) => note.includes("Dahili: 200")));
      assert.equal(result.addressParts.country, "Russia");
    },
  },
  {
    name: "VBH / Kosovo",
    rawText: `VBH
Fisnik BERISHA
Manager
Tel.Mob. +377 (0) 45 560 800
E-mail vbh-kosovo@hotmail.com
VBH Kosovo L.L.C.
Member of VBH Group
Business Park Drenas
13050 Bushat / Kosovo
www.vbh-kosovo.de | www.vbh24.de`,
    input: {
      contactNameAndSurname: "Fisnik Berisha",
      name: "Fisnik Berisha",
      title: "Manager",
      company: "VBH Kosovo L.L.C.",
      phones: ["+377 (0) 45 560 800"],
      emails: ["vbh-kosovo@hotmail.com"],
      website: "www.vbh-kosovo.de",
      address: "VBH Kosovo L.L.C., Business Park Drenas, 13050 Bushat / Kosovo",
      addressParts: {
        neighborhood: null,
        street: null,
        avenue: null,
        boulevard: null,
        sitePlaza: "Business Park Drenas",
        block: null,
        buildingNo: null,
        floor: null,
        apartment: null,
        postalCode: "13050",
        district: "Bushat",
        province: null,
        country: "Kosovo",
      },
      social: emptySocial,
      notes: ["Marka/ek website: www.vbh24.de"],
    },
    assertResult: (result) => {
      assert.equal(result.phones[0], "+377045560800");
      assert.equal(result.website, "www.vbh-kosovo.de");
      assert.ok(result.notes.some((note) => note.includes("vbh24.de")));
    },
  },
];

const failures: string[] = [];

for (const testCase of cases) {
  try {
    const result = validateAndNormalizeBusinessCardExtraction(testCase.input, testCase.rawText);
    testCase.assertResult(result);
    console.log(`PASS: ${testCase.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${testCase.name}: ${message}`);
    console.log(`FAIL: ${testCase.name} -> ${message}`);
  }
}

assert.equal(failures.length, 0, failures.join("\n"));
console.log("businessCardSchema visual card regression test passed");

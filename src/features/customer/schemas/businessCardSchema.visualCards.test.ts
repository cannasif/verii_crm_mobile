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
      assert.equal(result.company, "Baygün Hırdavat İnşaat A.Ş.");
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
    name: "Muster GmbH / Germany",
    rawText: `MUSTER GMBH
Anna Müller
Vertriebsleiterin
Musterstraße 12
40210 Düsseldorf
Deutschland
Tel. +49 211 1234567
anna.mueller@muster.de
www.muster.de`,
    input: {
      contactNameAndSurname: "Anna Müller",
      name: "Anna Müller",
      title: "Vertriebsleiterin",
      company: "Muster GmbH",
      phones: ["+49 211 1234567"],
      emails: ["anna.mueller@muster.de"],
      website: "www.muster.de",
      address: "Musterstraße 12, 40210 Düsseldorf, Deutschland",
      addressParts: {
        neighborhood: null,
        street: "Musterstraße",
        avenue: null,
        boulevard: null,
        sitePlaza: null,
        block: null,
        buildingNo: "12",
        floor: null,
        apartment: null,
        postalCode: "40210",
        district: "Düsseldorf",
        province: null,
        country: "Deutschland",
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Anna Müller");
      assert.equal(result.title, "Vertriebsleiterin");
      assert.equal(result.company, "Muster GmbH");
      assert.equal(result.phones[0], "+492111234567");
      assert.equal(result.website, "www.muster.de");
    },
  },
  {
    name: "North Star / English",
    rawText: `North Star Trading LLC
John Carter
Sales Manager
1250 West Market Street, Suite 400
Chicago, IL 60607
Phone +1 312 555 0101
john.carter@northstartrading.com
www.northstartrading.com`,
    input: {
      contactNameAndSurname: "John Carter",
      name: "John Carter",
      title: "Sales Manager",
      company: "North Star Trading LLC",
      phones: ["+1 312 555 0101"],
      emails: ["john.carter@northstartrading.com"],
      website: "www.northstartrading.com",
      address: "1250 West Market Street, Suite 400, Chicago, IL 60607",
      addressParts: {
        neighborhood: null,
        street: "West Market Street",
        avenue: null,
        boulevard: null,
        sitePlaza: "Suite 400",
        block: null,
        buildingNo: "1250",
        floor: null,
        apartment: null,
        postalCode: "60607",
        district: "Chicago",
        province: "IL",
        country: null,
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.name, "John Carter");
      assert.equal(result.title, "Sales Manager");
      assert.equal(result.company, "North Star Trading LLC");
      assert.equal(result.phones[0], "+13125550101");
      assert.equal(result.website, "www.northstartrading.com");
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
      assert.equal(result.name, "Fisnik Berisha");
      assert.equal(result.title, "Manager");
      assert.equal(result.company, "VBH Kosovo L.L.C.");
    },
  },
  {
    name: "VBH / Kosovo bad extraction guard",
    rawText: `VBH
Everything Simple.
Fisnik BERISHA
Manager
VBH Kosovo L.L.C.
Member of VBH Group
Tel.Mob. +377 (0) 45 560 800
E-mail vbh-kosovo@hotmail.com
Business Park Drenas
13050 Bushat / Kosovo
www.vbh-kosovo.de | www.vbh24.de`,
    input: {
      contactNameAndSurname: "Everything Simple",
      name: "Everything Simple",
      title: "Member of VBH Group",
      company: "VBH",
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
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Fisnik Berisha");
      assert.equal(result.title, "Manager");
      assert.equal(result.company, "VBH Kosovo L.L.C.");
    },
  },
  {
    name: "Russian Cyrillic / multi-script",
    rawText: `РОБ ЛОКС
Дмитрий А. Холодков
Менеджер по продажам
ООО Роб Локс Секьюрити Системс
офис: +7 495 223 80 03 доб. 200
моб.: +7 917 507 33 17
hd@rob-locks.ru
109428, Россия, Москва,
Рязанский проспект, д. 24, стр. 1
www.rob-locks.ru`,
    input: {
      contactNameAndSurname: "Дмитрий А. Холодков",
      name: "Дмитрий А. Холодков",
      title: "Менеджер по продажам",
      company: "ООО Роб Локс Секьюрити Системс",
      phones: ["+7 495 223 80 03 ext. 200", "+7 917 507 33 17"],
      emails: ["hd@rob-locks.ru"],
      website: "www.rob-locks.ru",
      address: "109428, Россия, Москва, Рязанский проспект, д. 24, стр. 1",
      addressParts: {
        neighborhood: null,
        street: "Рязанский проспект",
        avenue: null,
        boulevard: null,
        sitePlaza: null,
        block: null,
        buildingNo: "24",
        floor: null,
        apartment: "стр. 1",
        postalCode: "109428",
        district: null,
        province: "Москва",
        country: "Россия",
      },
      social: emptySocial,
      notes: ["Dahili: 200"],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Дмитрий А. Холодков");
      assert.equal(result.title, "Менеджер по продажам");
      assert.equal(result.company, "ООО Роб Локс Секьюрити Системс");
      assert.equal(result.phones[0], "+79175073317");
      assert.equal(result.addressParts.country, "Россия");
    },
  },
  {
    name: "Times Bio / China multi-language",
    rawText: `TIMES
Bin Chen
Chairman
Ya'an Times Biotech Co. Ltd
Tel: 0835-2246888 0835-2323798
Fax: 0835-2323799
Phone: 13808178499
P.C. 625000
Http: www.times-bio.com
E-mail: gm@timesbio.net
Add: Ya'an Agricultural Hi-Tech Ecological Park, Ya'an City, China`,
    input: {
      contactNameAndSurname: "Bin Chen",
      name: "Bin Chen",
      title: "Chairman",
      company: "Ya'an Times Biotech Co. Ltd",
      phones: ["13808178499", "0835-2246888"],
      emails: ["gm@timesbio.net"],
      website: "www.times-bio.com",
      address: "Ya'an Agricultural Hi-Tech Ecological Park, 625000, Ya'an City, China",
      addressParts: {
        neighborhood: null,
        street: null,
        avenue: null,
        boulevard: null,
        sitePlaza: "Ya'an Agricultural Hi-Tech Ecological Park",
        block: null,
        buildingNo: null,
        floor: null,
        apartment: null,
        postalCode: "625000",
        district: null,
        province: "Ya'an",
        country: "China",
      },
      social: emptySocial,
      notes: ["Fax: 0835-2323799"],
    },
    assertResult: (result) => {
      assert.equal(result.name, "Bin Chen");
      assert.equal(result.title, "Chairman");
      assert.equal(result.website, "www.times-bio.com");
      assert.equal(result.addressParts.country, "China");
      assert.ok(result.notes.some((note) => note.includes("Fax")));
    },
  },
  {
    name: "Rob Locks / Russia wrong short company and website",
    rawText: `RB
rob locks security systems
Dmitrii A. Kholodkov
Sales division manager
Office: +7 495 223 80 03 ext. 200
Cell +7 917 507 33 17
e-mail: hd@rob-locks.ru
109428, Russia, Moscow,
Ryazanskiy prospect str., 24, build. 1
www.ravbariach.ru, www.cisa-russia.com, www.rob-locks.ru`,
    input: {
      contactNameAndSurname: "Dmitrii A. Kholodkov",
      name: "Dmitrii A. Kholodkov",
      title: "Sales division manager",
      company: "RB",
      phones: ["+7 917 507 33 17", "+7 495 223 80 03 ext. 200"],
      emails: ["hd@rob-locks.ru"],
      website: "www.cisa-russia.com",
      address: "Ryazanskiy prospect str., 24, 109428, Moscow",
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
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.company, "rob locks security systems");
      assert.equal(result.website, "www.rob-locks.ru");
      assert.ok(result.notes.some((note) => note.includes("cisa-russia.com")));
    },
  },
  {
    name: "M Sora / Kosovo bad company contamination",
    rawText: `M SORA
Nuhi Krasniqi
Manager
mob: +383 45 77 11 22
nuhi.krasniqisigm-sora.al
www.Sora.(94%)
PARKU I BIZNESIT, 13000 DRENAS
REPUBLIKA E KOSOVËS`,
    input: {
      contactNameAndSurname: "Nuhi Krasniqi",
      name: "Nuhi Krasniqi",
      title: "Manager",
      company: "M SORA Nuhi Krasniqi Manager mob: +38345 7711 22 nuhikrasnigigm-sora.al",
      phones: ["+383 45 77 11 22"],
      emails: [],
      website: "www.m-sora.al",
      address: "PARKU I BIZNESIT, 13000 DRENAS, REPUBLIKA E KOSOVËS",
      addressParts: {
        neighborhood: null,
        street: null,
        avenue: null,
        boulevard: null,
        sitePlaza: "PARKU I BIZNESIT",
        block: null,
        buildingNo: null,
        floor: null,
        apartment: null,
        postalCode: "13000",
        district: "DRENAS",
        province: null,
        country: "KOSOVËS",
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.company, "M SORA");
      assert.equal(result.name, "Nuhi Krasniqi");
      assert.equal(result.title, "Manager");
    },
  },
  {
    name: "Bozdogan / TR service lines should not become person or company",
    rawText: `BOZDOGAN CAM BALKON
PVC Doğrama
Alüminyum Doğrama
Eşikli - Eşiksiz Sürme
Otomatik Panjur
Otomatik Kepenk
Küpeşte - Sineklik
Emre BOZDOĞAN
0 553 416 84 63
Atatürk San. Sit. 5542 Sk. No:11 Torbalı - İZMİR`,
    input: {
      contactNameAndSurname: "Otomatik Kepenk",
      name: "Otomatik Kepenk",
      title: null,
      company: "Atatük San. Sit. 5542 Sk. No:11 Torbalı - İZMİR BOZDOĞAN PVC Doğrama BOZDOĞAN CAM BALKON",
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
    name: "Isbank / TR address should drop contact contamination",
    rawText: `TÜRKİYE İŞ BANKASI

Nurhat Çaça
Customer Relationship Manager

Türkiye İş Bankası A.Ş.
Ayrancılar - Torbalı
İzmir Branch
İnönü Mah. İzmir Aydın Cad. No 57/B
Ayrancılar 35860 Torbalı / İzmir - Turkey
Phone: +90 (232) 854 65 64
Gsm: +90 (507) 198 61 16
nurhat.caca@isbank.com.tr`,
    input: {
      contactNameAndSurname: "Nurhat Çaça",
      name: "Nurhat Çaça",
      title: "Customer Relationship Manager",
      company: "Türkiye İş Bankası A.Ş.",
      phones: ["+90 (232) 854 65 64"],
      emails: ["nurhat.caca@isbank.com.tr"],
      website: null,
      address: "Nurhat Çaça BANKASI Customer Relationship Manager Türkiye İş Bankası A.Ş. Ayrancılar - Torbalı İzmir Branch İnönü Mah. İzmir Aydın Cad. No:57/B Ayrancılar 35860 Torbalı / İzmir - Turkey Phone:",
      addressParts: {
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
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.company, "Türkiye İş Bankası A.Ş.");
      assert.equal(result.name, "Nurhat Çaça");
      assert.ok(result.address?.includes("İnönü Mah."));
      assert.ok(result.address?.includes("No 57/B") || result.address?.includes("No:57/B"));
      assert.ok(!result.address?.includes("Customer Relationship Manager"));
      assert.ok(!result.address?.includes("Phone"));
    },
  },
  {
    name: "Windoform / TR should recover person and title",
    rawText: `WINDOFORM
KAPI ve PENCERE AKSESUARLARI
NURAY Grup

Volkan SAĞLIK
Genel Müdür Yardımcısı
Deputy General Manager

Tel: +90 232 854 70 00-01
Fax: +90 232 854 63 00
Mobil: +90 533 158 00 40
v.saglik@windoform.com.tr
Fabrika: Kazım Karabekir Mh. Bekir Saydam Cd. No: 104
A-10 Blok No: 76-35870
Pancar - Torbalı - İZMİR
www.windoform.com`,
    input: {
      contactNameAndSurname: "Kapı ve Pencere AKSESUARLARI",
      name: "Kapı ve Pencere AKSESUARLARI",
      title: null,
      company: "WINDOFORM",
      phones: ["+90 232 854 63 00"],
      emails: ["v.saglik@windoform.com.tr"],
      website: "www.windoform.com",
      address: "Fabrika: Kazım Karabekir Mah. NURAY Grup Bekir Saydam Cd. No: 104 A-10 Blok No:",
      addressParts: {
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
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.company, "WINDOFORM");
      assert.equal(result.name, "Volkan Sağlık");
      assert.ok(result.title?.includes("Genel Müdür Yardımcısı"));
      assert.ok(result.address?.includes("Kazım Karabekir"));
      assert.ok(!result.address?.includes("NURAY Grup"));
    },
  },
  {
    name: "Trade Lines / TR should prefer brand over slogan",
    rawText: `Trade Lines
Komple Lojistik
Dış Ticaret Çözümleri

Melisa TATAROĞLU
Satış ve Pazarlama

+90 538 594 59 93
melisa@tradelines.com.tr
www.tradelines.com.tr
Caferağa Mah. Moda Cad. No:30/4
34710 Kadıköy / İstanbul - Türkiye`,
    input: {
      contactNameAndSurname: "Lines Çözümleri",
      name: "Lines Çözümleri",
      title: null,
      company: "Komple Lojistik",
      phones: ["+90 538 594 59 93"],
      emails: ["melisa@tradelines.com.tr"],
      website: "www.tradelines.com.tr",
      address: "Caferağa Mah. Moda Cad.. No:30/4 34710 Kadıköy / İstanbul",
      addressParts: {
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
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.ok(result.company?.toLowerCase().includes("trade"));
      assert.equal(result.name, "Melisa Tataroğlu");
      assert.ok(result.title?.includes("Satış ve Pazarlama"));
      assert.ok(result.address?.includes("Kadıköy"));
    },
  },
  {
    name: "Rapid / EN should drop service slogan from address",
    rawText: `RAPID
Since 1965
55 Years
INTERNATIONAL ROAD TRANSPORT
ROMANIA RUSSIA UKRAINE POLAND MOROCCO UZBEKISTAN MOLDOVA TURKEY

OLGA DOĞAN
Customer Representative

Tel 0090 212 252 38 33 (Pbx)
Gsm 0090 542 566 08 98
e-mail olga.dogan@rapid.com.tr
web www.rapid.com.tr`,
    input: {
      contactNameAndSurname: "Olga Doğan",
      name: "Olga Doğan",
      title: "Customer Representative",
      company: "RAPID",
      phones: ["0090 212 252 38 33 (Pbx)"],
      emails: ["olga.dogan@rapid.com.tr"],
      website: "www.rapid.com.tr",
      address: "ULUSLARARASI TAŞIMACILIK Since 1965 ROMANIA RUSSIA UKRAINE POLAND MOROCCO UZBEKISTAN MOLDOVA TURKEY INTERNATIONAL 55 Years ROAD",
      addressParts: {
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
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.company, "RAPID");
      assert.equal(result.name, "Olga Doğan");
      assert.equal(result.title, "Customer Representative");
      assert.equal(result.address, null);
    },
  },
  {
    name: "NGC / TR should keep company and person separate",
    rawText: `NGC DANIŞMANLIK
New Global Consultancy

Ali Hakan KANAT
Koordinatör

0541 244 14 54
www.ngcdanismanlik.com
hakan@ngcdanismanlik.com
0850 302 642 - 0850 302 4 NGC`,
    input: {
      contactNameAndSurname: "New Global Consultancy",
      name: "New Global Consultancy",
      title: null,
      company: "NGCDANISMANLIK",
      phones: ["0541 244 14 54"],
      emails: ["hakan@ngcdanismanlik.com"],
      website: "www.ngcdanismanlik.com",
      address: null,
      addressParts: {
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
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.ok(result.company?.toLowerCase().includes("ngc"));
      assert.ok(result.company?.toLowerCase().includes("dan"));
      assert.equal(result.name, "Ali Hakan Kanat");
      assert.ok(result.title?.toLowerCase().includes("koordinat"));
      assert.equal(result.address, null);
    },
  },
  {
    name: "Yurtici / TR should recover title email website and clean address",
    rawText: `yurtiçi taşımacılık hizmetleri

Hülya VEYİSOĞLU
İş Geliştirme Yöneticisi

İstasyon Mah. Hatboyu Cad.
No: 172 / C Tuzla / İSTANBUL
operasyon@tasimahizmetleri.com
hulya@tasimahizmetleri.com
www.yurticitasimahizmetleri.com
0542 137 17 41
0850 888 85 88
0216 888 18 18`,
    input: {
      contactNameAndSurname: "Hülya Veyisoğlu",
      name: "Hülya Veyisoğlu",
      title: null,
      company: "yurtiçi",
      phones: ["0542 137 17 41"],
      emails: [],
      website: null,
      address: "İstasyon Mah.. Hatboyu Cad.. No: 172/C Tuzla / İSTANBUL .com .com",
      addressParts: {
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
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.ok(result.company?.toLowerCase().includes("yurt"));
      assert.ok(result.company?.toLowerCase().includes("taş"));
      assert.equal(result.name, "Hülya Veyisoğlu");
      assert.ok(result.title?.toLowerCase().includes("geliştirme"));
      assert.ok(result.emails.some((email) => email.includes("hulya@")));
      assert.ok(result.website?.includes("yurtici"));
      assert.ok(result.address?.includes("Hatboyu"));
      assert.ok(!result.address?.includes(".com"));
    },
  },
  {
    name: "Windoform / TR manager card should keep person title and address",
    rawText: `WINDOFORM
KAPI VE PENCERE AKSESUARLARI
NURAY Grup

Aydın YÜKSEL
Genel Müdür / General Manager

Tel: +90 232 854 70 00-01
Fax: +90 232 854 63 00
Mobil: +90 532 425 48 21
a.yuksel@windoform.com.tr
Fabrika: Kazım Karabekir Mh.
Bekir Saydam Cd. No: 104
A-10 Blok No: 7-8 35870
Pancar - Torbalı - İZMİR
www.windoform.com.tr`,
    input: {
      contactNameAndSurname: "Fabrika: Kazım Karabekir Mh.",
      name: "Fabrika: Kazım Karabekir Mh.",
      title: "Genel Müdür / General Manager",
      company: "WINDOFORM",
      phones: ["+90 232 854 70 00"],
      emails: ["a.yuksel@windoform.com.tr"],
      website: "www.windoform.com.tr",
      address: "Fabrika: Kazım Karabekir Mh.. Bekir Saydam Cd. No: 104 A-10 Blok No:",
      addressParts: {
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
      },
      social: emptySocial,
      notes: [],
    },
    assertResult: (result) => {
      assert.equal(result.company, "WINDOFORM");
      assert.equal(result.name, "Aydın Yüksel");
      assert.ok(result.title?.includes("Genel Müdür"));
      assert.ok(result.address?.includes("Kazım Karabekir"));
      assert.ok(!result.address?.includes("NURAY Grup"));
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
console.log("businessCardSchema visual card regression test passed");

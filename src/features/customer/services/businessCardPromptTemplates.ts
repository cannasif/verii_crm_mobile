const SCHEMA_EXAMPLE_JSON = `{
  "contactNameAndSurname": "string | null",
  "name": "string | null",
  "title": "string | null",
  "company": "string | null",
  "phones": ["string"],
  "emails": ["string"],
  "website": "string | null",
  "address": "string | null",
  "addressParts": {
    "neighborhood": "string | null",
    "street": "string | null",
    "avenue": "string | null",
    "boulevard": "string | null",
    "sitePlaza": "string | null",
    "block": "string | null",
    "buildingNo": "string | null",
    "floor": "string | null",
    "apartment": "string | null",
    "postalCode": "string | null",
    "district": "string | null",
    "province": "string | null",
    "country": "string | null"
  },
  "social": {
    "linkedin": "string | null",
    "instagram": "string | null",
    "x": "string | null",
    "facebook": "string | null"
  },
  "notes": ["string"]
}`;

const FEW_SHOT_EXAMPLES = `
--- ÖRNEK 1 (Standart Kart: Tel/Faks/Gsm etiketleri, marka adı) ---
OCR METNİ:
winax
TARIK HOSKAN
EXPORT AREA MANAGER
EREN PVC KAPI VE PENCERE AKS.SAN.DIŞ TİC.LTD.ŞTİ.
Orhan Gazi Mah.Isıso San.Sit.
14.Yol Sok. U-1 Blok No:10-12
Esenyurt-İSTANBUL
Tel : +90 212 623 04 50
Faks : +90 212 623 04 77
Gsm : +90 530 955 04 31
web: www.winax.com e-mail: tarik@winax.com

DOĞRU JSON:
{
  "contactNameAndSurname": "Tarık Hoskan",
  "name": "Tarık Hoskan",
  "title": "Export Area Manager",
  "company": "Eren PVC Kapı ve Pencere Aks.San.Dış Tic.Ltd.Şti.",
  "phones": ["+905309550431", "+902126230450"],
  "emails": ["tarik@winax.com"],
  "website": "www.winax.com",
  "address": "Orhan Gazi Mah. Isıso San. Sit. 14. Yol Sk. U-1 Blok No:10-12, Esenyurt/İstanbul",
  "addressParts": {
    "neighborhood": "Orhan Gazi Mah.",
    "street": "14. Yol Sk.",
    "avenue": null,
    "boulevard": null,
    "sitePlaza": "Isıso San. Sit.",
    "block": "U-1 Blok",
    "buildingNo": "No:10-12",
    "floor": null,
    "apartment": null,
    "postalCode": null,
    "district": "Esenyurt",
    "province": "İstanbul",
    "country": "Türkiye"
  },
  "social": {"linkedin": null, "instagram": null, "x": null, "facebook": null},
  "notes": ["Fax: +902126230477", "Marka: winax"]
}
NEDEN:
- Gsm=mobil(5xx) → phones'a İLK sıraya. Tel=sabit hat → phones'a sonra.
- Faks → phones'a GİRMEZ, notes'a "Fax: +90..." yazılır.
- "winax" marka adı, resmi şirket adı değil → notes'a "Marka: winax".
- addressParts: neighborhood, street, sitePlaza, block, buildingNo, district, province dolu.
- address = addressParts'tan birleştirildi (PTT sırası). "Türkiye" address'e EKLENMEDİ.

--- ÖRNEK 2 (Dahili Numara / Extension + Posta Kodu) ---
OCR METNİ:
SİNPAŞ REAL ESTATE
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
Purchasing and Logistics Chief

DOĞRU JSON:
{
  "contactNameAndSurname": "Serdar Bilgin",
  "name": "Serdar Bilgin",
  "title": "Architect, Purchasing and Logistics Chief",
  "company": "Sinpaş Real Estate Investment Company",
  "phones": ["+902123102700"],
  "emails": ["serdar.bilgin@sinpas.com.tr"],
  "website": "www.sinpas.com.tr",
  "address": "Dikilitaş Mah. Yenidoğan Sk. No:36, 34349, Beşiktaş/İstanbul",
  "addressParts": {
    "neighborhood": "Dikilitaş Mah.",
    "street": "Yenidoğan Sk.",
    "avenue": null,
    "boulevard": null,
    "sitePlaza": null,
    "block": null,
    "buildingNo": "No:36",
    "floor": null,
    "apartment": null,
    "postalCode": "34349",
    "district": "Beşiktaş",
    "province": "İstanbul",
    "country": "Türkiye"
  },
  "social": {"linkedin": null, "instagram": null, "x": null, "facebook": null},
  "notes": ["Dahili: 1388", "Fax: +902122598714"]
}
NEDEN:
- Tel satırındaki "/1388" dahili → BAZ NUMARA (+902123102700) phones'a GİRER, dahili notes'a.
- Fax numarası phones'a GİRMEZ → notes'a "Fax: +90..." yazılır.
- 34349 → addressParts.postalCode. address string'de kalır.
- "TURKEY" → addressParts.country="Türkiye" ama address string'e EKLENMEDİ.
- "Beşiktaş / İSTANBUL" → district+province ayrımı slash (/) ile yapıldı.

--- ÖRNEK 3 (T/M etiketleri, kısaltma + tam ad, slogan) ---
OCR METNİ:
Serkan DURMUŞ
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
BURSA TİCARET VE SANAYİ ODASI

DOĞRU JSON:
{
  "contactNameAndSurname": "Serkan Durmuş",
  "name": "Serkan Durmuş",
  "title": "Meclis Üyesi",
  "company": "BTSO - Bursa Ticaret ve Sanayi Odası",
  "phones": ["+905326657510", "+902242751630"],
  "emails": ["serkandurmus061@hotmail.com"],
  "website": "www.btso.org.tr",
  "address": "Organize Sanayi Bölgesi, Mavi Cad. 2. Sk. No:2, 16140, Nilüfer/Bursa",
  "addressParts": {
    "neighborhood": null,
    "street": "2. Sk.",
    "avenue": "Mavi Cad.",
    "boulevard": null,
    "sitePlaza": "Organize Sanayi Bölgesi",
    "block": null,
    "buildingNo": "No:2",
    "floor": null,
    "apartment": null,
    "postalCode": "16140",
    "district": "Nilüfer",
    "province": "Bursa",
    "country": "Türkiye"
  },
  "social": {"linkedin": null, "instagram": null, "x": null, "facebook": null},
  "notes": []
}
NEDEN:
- "T I" = Tel (sabit hat). "M I" = Mobil. Mobil(5xx) → İLK sıra.
- "BURSA BÜYÜRSE TÜRKİYE BÜYÜR" slogan → hiçbir alana girmez, atlanır.
- "BTSO" kısaltma + "BURSA TİCARET VE SANAYİ ODASI" tam adı birleştirilir.
- "Nilüfer/BURSA" → district="Nilüfer", province="Bursa". Slash deseni.
- 16140 → postalCode. "Organize Sanayi Bölgesi" → sitePlaza.

--- ÖRNEK 4 (LTD/A.Ş. eki olmayan firma + İş Merkezi) ---
OCR METNİ:
AYAYDIN MAKİNE
Tekstil Otomasyonu
Oğuzkağan Aydın
Satış ve Pazarlama Müdürü
info@ayaydinmakine.com
www.ayaydinmakine.com
+90 534 524 74 85
+90 212 813 19 71
Aktim 1 Ticaret ve İş Merkezi
Akçaburgaz Mh. Akçaburgaz
Cd. No:25 Esenyurt/İstanbul

DOĞRU JSON:
{
  "contactNameAndSurname": "Oğuzkağan Aydın",
  "name": "Oğuzkağan Aydın",
  "title": "Satış ve Pazarlama Müdürü",
  "company": "Ayaydın Makine",
  "phones": ["+905345247485", "+902128131971"],
  "emails": ["info@ayaydinmakine.com"],
  "website": "www.ayaydinmakine.com",
  "address": "Akçaburgaz Mah. Akçaburgaz Cad. No:25, Aktim 1 Ticaret ve İş Merkezi, Esenyurt/İstanbul",
  "addressParts": {
    "neighborhood": "Akçaburgaz Mah.",
    "street": null,
    "avenue": "Akçaburgaz Cad.",
    "boulevard": null,
    "sitePlaza": "Aktim 1 Ticaret ve İş Merkezi",
    "block": null,
    "buildingNo": "No:25",
    "floor": null,
    "apartment": null,
    "postalCode": null,
    "district": "Esenyurt",
    "province": "İstanbul",
    "country": "Türkiye"
  },
  "social": {"linkedin": null, "instagram": null, "x": null, "facebook": null},
  "notes": ["Faaliyet: Tekstil Otomasyonu"]
}
NEDEN:
- "AYAYDIN MAKİNE" firma adıdır (LTD/A.Ş. eki OLMASA bile). "Makine" sektör kelimesidir → company.
- "Tekstil Otomasyonu" faaliyet alanı → company DEĞİL, notes'a.
- "Aktim 1 Ticaret ve İş Merkezi" → sitePlaza.
- "Esenyurt/İstanbul" → district/province ayrımı.

--- ÖRNEK 5 (İngilizce firma + parantez dahili + ülke ayıklama) ---
OCR METNİ:
Trade Lines
Full Logistics and Trade Solutions
Melisa TATAROĞLU
Sales & Marketing
+90 538 594 59 93
+90 216 499 99 59 (104)
melisa@tradelines.com.tr
www.tradelines.com.tr
Caferağa Mah. Moda Cad. No:30/4
34710 Kadıköy / İstanbul - Türkiye

DOĞRU JSON:
{
  "contactNameAndSurname": "Melisa Tataroğlu",
  "name": "Melisa Tataroğlu",
  "title": "Sales & Marketing",
  "company": "Trade Lines",
  "phones": ["+905385945993", "+902164999959"],
  "emails": ["melisa@tradelines.com.tr"],
  "website": "www.tradelines.com.tr",
  "address": "Caferağa Mah. Moda Cad. No:30/4, 34710, Kadıköy/İstanbul",
  "addressParts": {
    "neighborhood": "Caferağa Mah.",
    "street": null,
    "avenue": "Moda Cad.",
    "boulevard": null,
    "sitePlaza": null,
    "block": null,
    "buildingNo": "No:30/4",
    "floor": null,
    "apartment": null,
    "postalCode": "34710",
    "district": "Kadıköy",
    "province": "İstanbul",
    "country": "Türkiye"
  },
  "social": {"linkedin": null, "instagram": null, "x": null, "facebook": null},
  "notes": ["Dahili: 104", "Açıklama: Full Logistics and Trade Solutions"]
}
NEDEN:
- "Trade Lines" firma adıdır ("Lines" iş kelimesi → company).
- "(104)" numara sonundaki parantez dahili → BAZ numara phones'a, "Dahili: 104" notes'a.
- "Türkiye" → country="Türkiye" ama address string'e EKLENMEDİ.
- "34710" → postalCode. "Kadıköy / İstanbul" → district/province.`;

export const BUSINESS_CARD_SYSTEM_PROMPT = `You are a strict JSON-only extraction engine for Turkish business cards.
CRITICAL:
1. Return ONLY a single valid JSON object. No markdown code fences. No explanations. No extra text before or after JSON.
2. NEVER invent or guess information not clearly present in the OCR text. If uncertain → null or [].
3. Parse Turkish characters carefully: ş, ç, ğ, ı, ö, ü, İ, Ş, Ç, Ğ, Ö, Ü.
4. OCR text may have minor errors — fix OBVIOUS typos only (e.g. "l" for "I", "0" for "O" in names). Do NOT guess.`;

export interface BusinessCardPromptCandidateHints {
  phones: string[];
  emails: string[];
  websites: string[];
  addressLines: string[];
  scriptProfile: {
    dominantScript: "latin" | "cyrillic" | "mixed" | "unknown";
    suggestedLocale: "tr" | "en" | "de" | "ru" | "intl";
    confidence: number;
  };
  topCandidates: {
    names: string[];
    titles: string[];
    companies: string[];
  };
  layoutProfile: {
    orderedLines: string[];
    topZoneLines: string[];
    middleZoneLines: string[];
    bottomZoneLines: string[];
    preferredNameLines: string[];
    preferredTitleLines: string[];
    preferredCompanyLines: string[];
    contactClusterLines: string[];
  };
}

export interface BusinessCardPromptContext {
  ocrLines?: string[];
  candidateHints?: BusinessCardPromptCandidateHints;
}

function renderContextSection(context?: BusinessCardPromptContext): string {
  if (!context) return "";
  const sections: string[] = [];
  const lines = context.ocrLines ?? [];
  const hints = context.candidateHints;

  if (lines.length > 0) {
    const lineText = lines.map((line, idx) => `${idx + 1}. ${line}`).join("\n");
    sections.push(`OCR SATIRLARI (SIRALI):\n${lineText}`);
  }

  if (hints) {
    const phones = hints.phones.length > 0 ? hints.phones.join(", ") : "[]";
    const emails = hints.emails.length > 0 ? hints.emails.join(", ") : "[]";
    const websites = hints.websites.length > 0 ? hints.websites.join(", ") : "[]";
    const addressLines = hints.addressLines.length > 0 ? hints.addressLines.join(" | ") : "[]";
    const names = hints.topCandidates.names.length > 0 ? hints.topCandidates.names.join(" | ") : "[]";
    const titles = hints.topCandidates.titles.length > 0 ? hints.topCandidates.titles.join(" | ") : "[]";
    const companies = hints.topCandidates.companies.length > 0 ? hints.topCandidates.companies.join(" | ") : "[]";
    const preferredNames = hints.layoutProfile.preferredNameLines.length > 0 ? hints.layoutProfile.preferredNameLines.join(" | ") : "[]";
    const preferredTitles = hints.layoutProfile.preferredTitleLines.length > 0 ? hints.layoutProfile.preferredTitleLines.join(" | ") : "[]";
    const preferredCompanies = hints.layoutProfile.preferredCompanyLines.length > 0 ? hints.layoutProfile.preferredCompanyLines.join(" | ") : "[]";
    const contactCluster = hints.layoutProfile.contactClusterLines.length > 0 ? hints.layoutProfile.contactClusterLines.join(" | ") : "[]";

    sections.push(
      `HEURISTIC ADAYLAR (sadece referans, uydurma yok):\n` +
      `- phones: ${phones}\n` +
      `- emails: ${emails}\n` +
      `- websites: ${websites}\n` +
      `- addressLines: ${addressLines}\n` +
      `- topNameCandidates: ${names}\n` +
      `- topTitleCandidates: ${titles}\n` +
      `- topCompanyCandidates: ${companies}\n` +
      `- preferredNameLines: ${preferredNames}\n` +
      `- preferredTitleLines: ${preferredTitles}\n` +
      `- preferredCompanyLines: ${preferredCompanies}\n` +
      `- contactClusterLines: ${contactCluster}\n` +
      `- scriptProfile: ${hints.scriptProfile.dominantScript} / ${hints.scriptProfile.suggestedLocale} / confidence=${hints.scriptProfile.confidence}`
    );
  }

  if (sections.length === 0) return "";
  return `\n\nEK BAĞLAM:\n${sections.join("\n\n")}`;
}

export function buildBusinessCardUserPrompt(rawText: string, context?: BusinessCardPromptContext): string {
  const contextSection = renderContextSection(context);
  return `Kartvizit OCR metninden alanları çıkar. Kart Türkiye'den veya yabancı bir ülkeden gelebilir. Çıktı SADECE aşağıdaki şemaya uyan TEK bir JSON object olacak. JSON dışında hiçbir şey yazma.

ŞEMA:
${SCHEMA_EXAMPLE_JSON}

══════════════════════════════════════════════
KURALLAR (HARFİYEN UYGULA):
══════════════════════════════════════════════

0) contactNameAndSurname:
- contactNameAndSurname = name (birebir aynı değer).
- name null ise contactNameAndSurname da null.

1) PHONES — Telefon Numaraları:
- Çıktı formatı E.164 olmalı: "+<ülkeKodu><numara>".
- TÜRKİYE için normalize kuralı KESİN: "+90XXXXXXXXXX" (+ işareti, 90, ardından 10 rakam = toplam 13 karakter).
- Yabancı kartvizitlerde ülke kodu açıkça yazıyorsa koru: ör. +34..., +383..., +7...
- Kart Kiril/Rusça veya başka Latin dışı karakterler içerebilir. Orijinal yazımı koru; Latin'e zorlama yapma.
- "0034..." gibi başlıyorsa "+34..." yap.
- Yabancı numarada ülke kodu AÇIKÇA yoksa uydurma yapma; emin değilsen phones'a koyma, notes'a "Şüpheli telefon: ..." yaz.
- Tüm boşluk, parantez, tire, nokta ayırıcıları sil.
- Dönüştürme:
  0XXXXXXXXXX → +90XXXXXXXXXX
  90XXXXXXXXXX → +90XXXXXXXXXX
  (0XXX) XXX XX XX → +90XXXXXXXXXX
  +90 (XXX) XXX XX XX → +90XXXXXXXXXX
  10 rakam varsa → başına +90 ekle
- ETİKET TANIMA:
  "Tel", "Tel:", "Telefon", "T", "T |", "T:", "T I" → sabit hat telefon
  "P", "P:", "P.", "Phone" → sabit hat / genel telefon
  "D", "D:", "D.", "Direct" → direkt hat telefon
  "Gsm", "Gsm:", "Cep", "Mobile", "M", "M |", "M:", "M I" → mobil telefon
  "Fax", "Faks", "F", "F:" → FAX numarası → phones'a KOYMA → notes'a "Fax: +90XXXXXXXXXX"
- DAHİLİ / EXTENSION (tüm formatlar):
  "/1388", "/ 1388" → dahili. BAZ numarayı phones'a KOY + notes'a "Dahili: 1388"
  "(2706)" (sonunda parantez) → dahili. BAZ numarayı phones'a KOY + notes'a "Dahili: 2706"
  "dahili 1234", "ext 1234", "ext. 1234" → dahili
  "iç hat 123", "int: 123", "int. 123" → dahili
  ÖNEMLİ: Dahili VARSA bile baz numara phones'a GİRMELİ!
- ÖZEL NUMARALAR (phones'a KOYMA):
  444 XXXX (çağrı merkezi) → notes'a "Çağrı merkezi: 444 XXXX"
  0850 XXX XX XX → notes'a "Özel hat: 0850..."
  Bu numaralar +90 formatına dönüştürülemez, phones dizisine GİRMEZ.
- SIRALAMA: Mobil numaralar (5XX ile başlayan) phones dizisinde İLK sırada.
- Tekrar yok: Aynı numara iki kez eklenmez.
- Regex'e uymayan şüpheli numara phones'a KONMAZ.

2) EMAILS:
- Gerçek email formatı: "@" ve en az bir "." içermeli.
- "e-mail:", "email:", "mail:" prefixlerini sil.
- Bozuk/şüpheli email'i UYDURMA. Emin değilsen ekleme.

3) WEBSITE:
- Gerçek domain/URL: www. veya http ile başlar VEYA en az bir nokta + TLD (.com, .com.tr, .net, .org, .tr, .org.tr, .es, .ru, .de, .al vb.)
- .cn gibi ülke uzantılı domainleri de website olarak kabul et.
- ŞİRKET ADI/KISALTMA OLAN STRING website OLAMAZ: A.Ş, AŞ, LTD, ŞTİ, SAN, TİC, DIŞ, AKS, ORTAKLIĞI, GAYRİMENKUL
- "@" içeriyorsa website OLAMAZ (email'dir).
- Yoksa null.

4) ADDRESS + addressParts — Fiziksel Adres (PTT STANDARDI):

  4.1) addressParts — Adresi PARÇALARA AYIR:
    neighborhood: Mahalle (Mah.) — ör: "Dikilitaş Mah.", "Akçaburgaz Mah."
    street: Sokak (Sk.) — ör: "14. Yol Sk.", "Yenidoğan Sk."
    avenue: Cadde (Cad.) — ör: "Mavi Cad.", "Akçaburgaz Cad."
    boulevard: Bulvar (Blv.) — ör: "Atatürk Blv."
    sitePlaza: Site/Plaza/Han/İş Merkezi/OSB — ör: "Organize Sanayi Bölgesi", "Isıso San. Sit."
    block: Blok — ör: "U-1 Blok", "A Blok"
    buildingNo: Bina numarası — ör: "No:36", "No:10-12", "No:30/4"
      ÖNEMLİ: "No" yazımları: No:36, No 36, NO:10-12, No:30/4, Numara 25, N:78, N.78
      Hepsi geçerli. Sadece "No:" değil "No 36" (boşluklu) da kabul et!
    floor: Kat — ör: "Kat:3", "K:3", "3. Kat"
    apartment: Daire — ör: "Daire:5", "D:5", "Daire 12"
    postalCode: Posta kodu (5 haneli) — ör: "34349", "16140"
      Yabancı kartlarda 4-6 hane olabilir — ör: "13000", "109428"
    district: İlçe — ör: "Kadıköy", "Esenyurt", "Nilüfer", "Beşiktaş"
    province: İl — ör: "İstanbul", "Bursa", "Ankara", "İzmir"
    country: Ülke — ör: "Türkiye"
    Rusça adres ipuçları: "ул.", "улица", "проспект", "дом", "д.", "стр.", "офис"

  4.2) İL / İLÇE AYIRMA (ÇOK KRİTİK DESEN):
    "Kadıköy/İstanbul" → district="Kadıköy", province="İstanbul"
    "Nilüfer / BURSA" → district="Nilüfer", province="Bursa"
    "Esenyurt-İSTANBUL" → district="Esenyurt", province="İstanbul"
    KURAL: X/Y veya X-Y deseninde sondaki Y genellikle İL, soldaki X İLÇE olur.
    Güvenli il listesi: İstanbul, Ankara, İzmir, Bursa, Kocaeli, Antalya, Konya,
      Gaziantep, Mersin, Adana, Kayseri, Tekirdağ, Sakarya, Muğla, Aydın,
      Manisa, Balıkesir, Eskişehir, Denizli, Samsun, Trabzon, Erzurum, Diyarbakır

  4.3) ÜLKE KURALI:
    "TURKEY", "TÜRKİYE", "TR" → addressParts.country = "Türkiye"
    FAKAT address string'e EKLENMEMELİ (TR CRM için gereksiz).
    Tek satır "Türkiye" / "TURKEY" / "TR" ise → address'ten çıkar, country'ye yaz.
    Türkiye DIŞINDA ülke adı varsa (Spain, España, Kosovo, Russia vb.) → addressParts.country'ye yaz.
    "Россия", "Китай", "China", "Çin" gibi yabancı ülke adlarını gördüğün gibi koru ya da güvenliyse normalize et.
    Yabancı kartlarda country address string içinde KALABİLİR.

  4.4) address — BİRLEŞTİRME KURALI (PTT sırası):
    address = neighborhood + avenue/street/boulevard + sitePlaza + block + buildingNo + floor + apartment + postalCode + district/province
    Parçalar arasına ", " koy.
    district ve province varsa "İlçe/İl" formatında birleştir (ör: "Kadıköy/İstanbul").
    country address'e EKLENMEMELİ.
    Parçaların hepsi null ise address = null.

  4.5) HARD EXCLUDE — Şu token'lar geçen satırı ASLA address'e KOYMA:
    @, www, http, .com, .net, .org, .tr, e-mail, email, tel, telefon,
    gsm, mobile, fax, faks, linkedin, instagram, facebook, twitter, x.com

  4.6) STRONG INCLUDE — Şunlardan EN AZ BİRİ varsa address satırı:
    • PTT kısaltmaları: Mah, Cad, Sok, Sk, Blv, Bulvar, Blok, Plaza, Han, İş Merkezi,
      San., Sit., OSB, Organize, Apt
    • Bina numarası: No 36, No:36, NO:10-12, Numara 25 (No/Numara + rakam)
    • Kat/Daire: Kat 3, K:3, Daire 5, D:5
    • Posta kodu: 5 haneli sayı (16140, 34349 vb.)
    • İl/ilçe adları: İstanbul, Ankara, İzmir, Bursa, Esenyurt, Kadıköy, Beşiktaş vb.

5) NAME / TITLE / COMPANY (SKORLAMA YÖNTEMİ — ÇOK KRİTİK):
  Bir string "company mi yoksa name mi?" diye karar vermek için SKORLA:

  ŞİRKET SKORU (+2 puan):
    • A.Ş, LTD, ŞTİ, SAN, TİC, HOLDING, GROUP vb. ek içeriyorsa +2
    • Sektör kelimesi içeriyorsa +2: Makine, Makina, Tekstil, Otomotiv, Gıda, İnşaat,
      Mobilya, Lojistik, Logistics, Trading, Solutions, Lines, Plastik, Metal, Kimya,
      Elektrik, Elektronik, Yazılım, Software, Bilişim, Otomasyon, PVC, Alüminyum,
      Nakliyat, Gayrimenkul, Sigorta, Reklam, Medya, Demir, Çelik, Cam, Pencere,
      Kapı, Maden, Teknoloji, Technology, Hizmet, Services, Marine, Marin, Denizcilik
    • Email domain'i ile benzerlik varsa +2 (ör: info@ayaydinmakine.com → "Ayaydın Makine")
    • Kartvizitte en üstte, büyük harflerle veya logo yazısı olarak bulunuyorsa +2

  KİŞİ SKORU (+2 puan):
    • 2-3 kelime, hiçbir kelime şirket eki/sektör kelimesi DEĞİL → +2
    • Email local-part ile uyuşma (ör: oguzaydın@… → "Oğuz Aydın") → +2
    • Türk isim kalıbı: Ad + Soyad (her biri büyük harfle başlar) → +1

  EŞİTLİKTE: company'yi doldurmak ÖNCELİKLİDİR. name null olabilir, company null olmamalı.

- company: Şirket/kuruluş/marka adı. BU ALAN EN ÖNEMLİDİR.
  • Kısaltma + tam ad birleştir: "BTSO - Bursa Ticaret ve Sanayi Odası"
  • Firma açıklaması/sloganı company'ye DEĞİL notes'a yaz
- name: Kişi adı-soyadı (ör: "Oğuzkağan Aydın", "Melisa Tataroğlu").
  • Sektör kelimesi içeriyorsa KİŞİ ADI DEĞİLDİR → company alanına koy.
  • Şirket ekleri (A.Ş, LTD, ŞTİ, SAN, TİC) içeriyorsa → null.
  • Tek kelime ise → null.
- title: Unvan/pozisyon (Manager, Müdür, Architect, Satın Alma Yönetmeni, Sales & Marketing vb.)
- Email/telefon/website hiçbir zaman name/company OLAMAZ.

6) MULTI-KİŞİ / MULTI-KART:
- OCR'da birden fazla kişi adı/email/cep numarası → çoklu kart taranmış demektir.
- SADECE İLK/EN BELİRGİN kişiyi seç.
- Diğer kişi bilgilerini notes'a ekle: "Diğer kişi: Ad Soyad, email, telefon"
- Emin olamadığın bilgiyi UYDURMA.

7) SLOGAN / MOTTO / REKLAM:
- Kartvizitlerdeki sloganlar (ör: "Bursa Büyürse Türkiye Büyür") ne name, ne company, ne address.
- Yoksay veya kısaca notes'a ekle.

══════════════════════════════════════════════
GERÇEK KARTVİZİT ÖRNEKLERİ (öğren ve uygula):
══════════════════════════════════════════════
${FEW_SHOT_EXAMPLES}

══════════════════════════════════════════════
SON KONTROL (JSON döndürmeden önce):
══════════════════════════════════════════════
✓ contactNameAndSurname = name (birebir aynı). name null ise contact da null.
✓ phones: Her eleman "^\\+90\\d{10}$" kalıbına uymalı. Uymayan → sil.
✓ phones: Fax numarası phones'ta OLMAMALI → notes'a taşı.
✓ phones: Dahili/extension phones'ta OLMAMALI → baz numara phones'ta, dahili notes'ta.
✓ phones: 444 xxxx ve 0850 numaraları phones'ta OLMAMALI → notes'a taşı.
✓ phones: Mobil (5XX) numaralar dizide İLK sırada.
✓ addressParts: Mümkün olan her parçayı doldur. Emin değilsen null.
✓ address: addressParts'tan birleştir (PTT sırası). Parçalar boşsa null.
✓ address: country (Türkiye/Turkey/TR) address'e EKLENMEMELİ.
✓ address: "@", "www", "http", "tel", "fax", ".com" geçiyorsa → düzelt veya null.
✓ address: "No 36", "No:36" gibi numara varsa → address'e dahil et.
✓ website: "@" içeriyorsa → null.
✓ name: Şirket adına benziyorsa (skorla!) → company'ye taşı.
✓ company: Email/web/telefon içeriyorsa → temizle.
✓ company: Eşitlikte company > name öncelikli. name null olabilir.
✓ OCR metninde OLMAYAN bilgiyi UYDURMA. Emin değilsen null/[] bırak.
✓ JSON dışında HİÇBİR ŞEY yazma.
${contextSection}

OCR TEXT:
<<<
${rawText}
>>>`;
}

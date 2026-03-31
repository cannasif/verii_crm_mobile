import { parseBusinessCardText } from "./parseBusinessCardText";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function run(): void {
  const isbank = parseBusinessCardText(`
Türkiye İş Bankası A.Ş.
Nurhat Çaça
Customer Relationship Manager
Phone: +90 (232) 854 65 64 / 2301
Gsm: +90 (507) 198 61 68
nurhat.caca@isbank.com.tr
İnönü Mah. İzmir Aydın Cad. No:57/B
Ayrancılar 35860 Torbalı / İzmir
  `);

  assert(isbank.customerName === "Türkiye İş Bankası A.Ş.", "Isbank customer should stay on company line");
  assert(isbank.title === "Customer Relationship Manager", "Isbank title should be recovered");
  assert(!/phone|gsm|@/i.test(isbank.address ?? ""), "Isbank address should drop contact contamination");
  assert(isbank.cityName === "İzmir", "Isbank city should be inferred from address");
  assert(isbank.districtName === "Torbalı", "Isbank district should be inferred from address");

  const vega = parseBusinessCardText(`
Vega Makina San. ve Tic. A.Ş.
Mustafa Kemal Nalbant
Satış Yöneticisi
Gsm: +90 (533) 950 69 55
kemal@vegamak.com
Osmangazi Mahallesi 2647. Sk. No:15 Esenyurt
İSTANBUL
www.vegamak.com
  `);

  assert(vega.customerName === "Vega Makina San. ve Tic. A.Ş.", "Vega company should stay as customer name");
  assert(vega.title === "Satış Yöneticisi", "Vega title should be recovered");
  assert((vega.website ?? "").includes("vegamak.com"), "Vega website should be extracted");
  assert((vega.address ?? "").includes("Osmangazi"), "Vega address should keep address line");
  assert(!/@|gsm|phone/i.test(vega.address ?? ""), "Vega address should not keep contact fragments");

  const windoform = parseBusinessCardText(`
WINDOFORM
KAPI ve PENCERE AKSESUARLARI
Volkan SAĞLIK
Genel Müdür Yardımcısı
Deputy General Manager
Tel : +90 232 854 70 00-01
Fax : +90 232 854 63 00
Mobil : +90 533 158 00 40
v.saglik@windoform.com.tr
www.windoform.com
Fabrika: Kazım Karabekir Mh. Bekir Saydam Cd. No: 104
Pancar - Torbalı - İZMİR
  `);

  assert((windoform.phone1 ?? "").includes("533"), "Windoform mobile line should rank above office/fax");
  assert((windoform.phone2 ?? "").includes("232"), "Windoform office line should remain as secondary phone");
  assert((windoform.website ?? "").includes("windoform"), "Windoform website should align with email domain");

  const brandRecovery = parseBusinessCardText(`
BAYGÜN
HIRDAVAT İNŞAAT A.Ş.
Şeref AYVA
seref@baygunhirdavat.com
www.abc-example.com
  `);

  assert(
    /bayg[üu]n|hirdavat/i.test(brandRecovery.customerName ?? ""),
    "Domain-driven company ranking should prefer a company-like line tied to domain signals"
  );
  assert(
    (brandRecovery.website ?? "").includes("abc-example.com"),
    "Explicit website should still be preserved when email does not match it"
  );

  const robLocks = parseBusinessCardText(`
rob locks security systems
Dmitrii A. Kholodkov
Sales division manager
Office +7 495 223 80 03 ext. 200
Cell +7 917 507 33 17
e-mail: hd@rob-locks.ru
109428, Russia, Moscow, Ryazanskiy prospect str., 24, build.1
www.ravbariach.ru
  `);

  assert(robLocks.countryName === "Russia", "Russian address should keep country");
  assert(robLocks.cityName === "Moscow", "Russian address should infer city");
  assert((robLocks.phone1 ?? "").includes("495"), "Office phone should remain primary on the Russian sample");

  const derivedWebsite = parseBusinessCardText(`
Acme Industrial Solutions Ltd.
Jane Cooper
Sales Manager
jane.cooper@acmeindustrial.com
+44 20 7946 0958
  `);

  assert(derivedWebsite.website === "www.acmeindustrial.com", "Website should fall back from business email domain when explicit site is missing");

  const aegeanSales = parseBusinessCardText(`
Çözümün Bir Parçası A.Ş.
EGEA Bölümü
Satış Temsilcisi
+90 530 967 1991
+90 232 376 7787
info@cozumunbirparcasi.com.tr
com.tr
10002 Sk. No: 12
  `);

  assert(aegeanSales.customerName?.includes("Çözümün"), "Company should remain on customer name for sales card");
  assert(
    aegeanSales.title?.toLocaleLowerCase("tr-TR").includes("satış temsilcisi") ||
      aegeanSales.title?.toLocaleLowerCase("tr-TR").includes("satis temsilcisi"),
    "Sales representative should be recovered as title"
  );
  assert(aegeanSales.website === "www.cozumunbirparcasi.com.tr", "Broken bare website suffix should fall back to business email domain");

  const ayaydin = parseBusinessCardText(`
AYAYDIN MAKINE
yaratici otomasyon
Oğuzkağan Aydın
Satış ve Pazarlama Müdürü
+90 534 524 74 85
+90 212 813 19 71
info@ayaydinmakine.com
www.ayaydinmakine.com
Aktım 1 Ticaret ve İş Merkezi
Akçaburgaz Mh. Akçaburgaz Cd. No:25 Esenyurt/İstanbul
  `);

  assert(/ayaydin/i.test(ayaydin.customerName ?? ""), "Ayaydin company should keep the brand line");
  assert(/oğuzkağan|oguzkagan/i.test(ayaydin.contactNameAndSurname ?? ""), "Ayaydin person should be recovered near title");
  assert(/satış|satis/i.test(ayaydin.title ?? ""), "Ayaydin title should stay as title");

  const ayaydinSplit = parseBusinessCardText(`
AYAYDIN MAKINE
yaratici otomasyon
Oğuzkağan
Aydın
Satış ve Pazarlama Müdürü
+90 534 524 74 85
info@ayaydinmakine.com
ne.com
  `);
  assert((ayaydinSplit.website ?? "").length > 0, "Ayaydin split sample should still keep a website value");

  console.log("parseBusinessCardText test passed");
}

run();

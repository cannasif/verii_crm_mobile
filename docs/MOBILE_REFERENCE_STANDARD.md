# V3RII Mobile Reference Standard

Bu belge `verii_crm_mobile` icin baglayici mobile standardidir. CRM mobile'da oturan kurallar WMS, B2B, Aqua ve yeni V3RII mobile projelerine ayni yaklasimla tasinir.

Ust urun ailesi standardi CRM API dokumanlarindaki `docs/V3RII_PRODUCT_FAMILY_BASE_STANDARD.md` dosyasinda tutulur. Bu dosya o standardin Expo/React Native uygulama kurallarini detaylandirir.

## Hedef

Mobile uygulamalar feature-first Expo + React Native yapisinda kalir:

- `src/app` sadece route ve navigation boundary tasir.
- `src/features/<feature>` is akisi ve domain'e yakin kodu tasir.
- `src/components/ui` temel UI primitive'lerini tasir.
- `src/components/shared` domainler arasi tekrar kullanilan uygulama komponentlerini tasir.
- `src/features/common` veya `src/components/paged` gercekten ortak list/paging parcalarini tasir.
- Native kabiliyetler feature service veya hook katmaninda izole edilir.

## Feature Klasor Standardi

```text
src/features/<feature>/
  api/
    <feature>-api.ts
  components/
  hooks/
  screens/
  schemas/
  types/
  utils/
```

Kucuk feature'larda bos klasor zorunlu degildir. Dosya buyudugunde bu sinirlara tasinir.

## API ve Data Fetching

- API client merkezi olur; component icinde raw axios/fetch cogalmaz.
- Endpoint path, request DTO ve response DTO feature `api/` dosyasinda tutulur.
- Hook dosyasi React Query state'ini, query key'i ve invalidation davranisini tasir.
- Component endpoint, token, response unwrap veya retry detayi bilmez.
- API kontrati web ile ayni `PagedRequest` / `PagedResponse` davranisini kullanir.
- Mutation sonrasi cache davranisi aciktir.
- Eski request sonucu yeni search sonucunu ezmemelidir; query key paging/search/filter/sort parametrelerini kapsar.

## Paged Liste ve Search

- Default `pageSize=10`.
- Kullanici page size degistirirse backend'e yeni deger gider ve page 1'e doner.
- Search input state'i ile request search parametresi ayridir.
- Search debounce edilir.
- Turkce karakter, buyuk/kucuk harf ve noktalama toleransi backend standardina yaslanir.
- Milyonluk data mobile cihazda client-side filtrelenmez.
- Buyuk listelerde FlatList/FlashList benzeri sanallastirma ve server paging kullanilir.
- "Daha fazla yukle" pageSize buyuterek ilk sayfayi tekrar cekmez; sonraki sayfayi append eder.

## Form ve Validation

- Formlarda React Hook Form + Zod tercih edilir.
- Validation schema feature icinde tutulur.
- Numeric inputlarda string gorunum ile hesaplama modeli karistirilmaz.
- Save, delete, sync, approve, reject gibi aksiyonlar pending/disabled state'e sahiptir.
- Backend'den gelen anlamli hata mesaji gizlenmez.
- Teknik stack trace kullaniciya gosterilmez.

## Native Kabiliyetler

- Kamera, dosya, OCR, lokasyon, barcode, document scanner gibi izin isteyen isler feature service/hook icinde izole edilir.
- Izin reddi kullaniciyi kilitlemez; anlamli fallback veya tekrar dene aksiyonu bulunur.
- Image/file upload islemlerinde boyut, format ve network hatalari ayrilir.
- OCR gibi agir islemler UI thread'i kilitlemeyecek sekilde tasarlanir.

## Offline, Storage ve Update

- AsyncStorage key'leri user/feature scope tasir.
- Draft, theme, pagination veya form tercihleri key collision yaratmaz.
- Offline/zayif networkte kullanici aksiyonu sessizce kaybolmaz.
- APK `versionCode` ve `versionName` disiplinli artar.
- OTA/remote update ile native binary update ayrimi dokumante edilir.
- Update sorunu raporlaninca cihaz modeli, Android/iOS version, app version, build number ve update channel birlikte loglanir.

## UI/UX ve Tema

- Mobile ekranlar web tasarimini birebir kopyalamaz; dokunma hedefi, okunurluk ve tek elle kullanim onceliklidir.
- Tema tokenlari global yuzeylere uygulanir.
- Hardcoded marka rengi feature icinde cogalmaz.
- Modal/sheet/dropdown davranisi keyboard ve safe-area ile test edilir.
- Loading, empty, error ve permission state'leri bulunur.

## React Stabilite

- Render sirasinda state setter cagrilmaz.
- Effect dependency listesi stabil olur.
- Derived state icin once memo/render hesap tercih edilir.
- Liste satirlari stable unique key kullanir.
- Ref veya layout measurement state set ediyorsa ayni deger guard'i bulunur.
- Navigation focus effect'leri sonsuz refetch loop yaratmaz.

## Kalite Kapisi

Mobile degisikligi icin varsayilan kontrol:

```bash
npm run typecheck
npm test
```

Riskli degisiklikte ek kontrol:

- Android emulator veya fiziksel cihaz smoke test.
- iOS simulator veya fiziksel cihaz smoke test.
- Metro log/console error kontrolu.
- Search + page + pageSize testi.
- Offline/zayif network davranisi.
- Permission ret/izin ver akisi.

## Degisiklik Checklist'i

1. Feature klasoru dogru yerde mi?
2. API cagrisi component disinda mi?
3. Query key paging/search/filter/sort parametrelerini kapsiyor mu?
4. Search page 1'e donuyor mu?
5. Buyuk data client-side filtrelenmiyor mu?
6. Pending/loading/error/empty state var mi?
7. Native izin hatalari anlamli mi?
8. AsyncStorage key'i scoped mi?
9. Stable list key kullaniliyor mu?
10. `npm run typecheck` ve ilgili testler gecti mi?

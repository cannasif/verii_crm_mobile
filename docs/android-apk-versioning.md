# Android APK Versioning

`verii_crm_mobile` tarafinda surum mantigi su sekilde ilerliyor:

- `1.0.0` -> `versionCode 1`
- `1.0.1` -> `versionCode 2`
- `1.0.11` -> `versionCode 12`

Yani son parca `N` ise Android build numarasi `N + 1` gibi dusunuluyor.

## Nereleri guncellemeliyim?

Her release icin bu dosyalari ayni anda guncelle:

- `package.json`
  - `"version": "1.0.11"`
- `app.json`
  - `expo.version`
  - `expo.ios.buildNumber`
  - `expo.android.versionCode`
- `android/app/build.gradle`
  - `defaultConfig.versionName`
  - `defaultConfig.versionCode`
- `verii_crm_api/Shared/Host/WebApi/Assets/AndroidVersions/versions.json`
  - `latestVersion`
  - `latestVersionCode`
  - gerekiyorsa `minimumSupportedVersion`
  - gerekiyorsa `minimumSupportedVersionCode`
  - `apkFileName`

## Bu release icin yazilan degerler

- App version: `1.0.11`
- Android versionCode: `12`
- iOS buildNumber: `12`
- API minimum supported version code: `12`
- APK file name: `verii-crm-1.0.11.apk`

## APK nasil alinir?

Proje kokunden degil, `android` klasorunde calistir:

```bash
cd /Users/cannasif/Documents/V3rii/verii_crm_mobile/android
./gradlew assembleRelease
```

Olusan APK:

```text
/Users/cannasif/Documents/V3rii/verii_crm_mobile/android/app/build/outputs/apk/release/app-release.apk
```

API'nin dagitacagi dosya adi bu release icin su olmali:

```text
/Users/cannasif/Documents/V3rii/verii_crm_api/Shared/Host/WebApi/Assets/AndroidVersions/verii-crm-1.0.11.apk
```

## Android 12 icin neye bakacagim?

Bu projede Android native ayarlar `android/app/build.gradle` icinden yonetiliyor.

- `minSdkVersion`
- `targetSdkVersion`
- `compileSdk`

Bu degerler su an `rootProject.ext.*` uzerinden geliyor. Uygulamanin Android 12 cihazlarda calismasi icin release build almak yeterli; uygulama versiyonu icin ayrica `versionName/versionCode` guncellenmeli.

## API neden onemli?

Mobile app acilisinda su endpoint version kontrolu yapiyor:

```text
GET /api/mobile/version-check
```

Bu endpoint `versions.json` dosyasini okuyor. Burada `minimumSupportedVersionCode` daha buyukse, eski APK'lar zorunlu guncellemeye duser.

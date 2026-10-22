# emlak-hesap

Türkiye'de konut yatırımı ve alım giderlerini hesaplayan, çalışma zamanı bağımlılığı olmayan TypeScript kütüphanesi ve iki dilli statik hesaplayıcı.

[![CI: test + lint](.github/badges/ci.svg)](.github/workflows/ci.yml)
[![MIT lisansı](.github/badges/license.svg)](LICENSE)

[English](README.md) · Sürüm 0.1.0 · ESM · Node.js 20+

## Kurulum

Bu depodan kurmak için (npm'de yayımlandığı varsayılmaz):

```sh
npm install
npm run build
```

Başka bir projede yerel kopyayı kullanmak için derlemeden sonra `npm install /path/to/emlak-hesap` çalıştırın. Paket adı `emlak-hesap`; yayımlama ayrı bir adımdır. Çalışma zamanı bağımlılığı yoktur. Kütüphane ve hesaplayıcı ağ çağrısı yapmaz; analitik, uzaktan yüklenen yazı tipi veya kaydedilen mali girdi içermez. Kaynak bağlantıları yalnızca tıklandığında açılır.

## Hızlı örnek

```ts
import { grossRentalYield, mortgage, purchaseCost } from 'emlak-hesap';
import { tr2026 } from 'emlak-hesap/presets/tr-2026';

// Hayalî senaryo. Kütüphanedeki tüm tutarlar tam sayı kuruştur: 100 kuruş = 1 TL.
const yieldResult = grossRentalYield({
  propertyPriceKurus: 100_000_000, // 1.000.000 TL
  monthlyRentKurus: 500_000,      // 5.000 TL
});
console.log(yieldResult.grossYield); // 0.06 = %6

const loan = mortgage({
  principalKurus: 10_000,
  monthlyInterestRate: 0.01, // yıllık değil aylık: 0.01 = %1
  months: 2,
  bsmvRate: 0,
  kkdfRate: 0,
});
console.log(loan.monthlyPaymentKurus, loan.totalInterestKurus); // 5075, 150

// Referans setini açıkça seçin. Oranları doğrulayın, sabit giderler için teklif alın.
const acquisition = purchaseCost({
  ...tr2026.purchase,
  propertyPriceKurus: 100_000_000,
  deedFeeBaseKurus: 100_000_000,
  revolvingFundKurus: 100_000, // hayalî teklif; resmî tarife değildir
  appraisalKurus: 50_000,
  daskKurus: 20_000,
});
console.log(acquisition.buyerTotalKurus); // 104570000
```

## API özeti

Her fonksiyon saftır, tek nesne alır, kalem kalem döküm içeren nesne döndürür ve girdiyi değiştirmez. Girdi ve sonuç tipleri paket kökünden dışa aktarılır. `Kurus` alanları güvenli tam sayıdır; oranlar ve getiri sonuçları ondalıktır (`0.02 = %2`). Web formunda ise TL ve yüzde girilir (`2 = %2`).

| Fonksiyon | Girdi alanları | Başlıca sonuçlar / hesap |
| --- | --- | --- |
| `grossRentalYield` | `propertyPriceKurus`, `monthlyRentKurus` | `annualRentKurus`, `grossYield = yıllık kira / fiyat` |
| `netRentalYield` | Brüt getiri girdileri + `monthlyDuesKurus`, `annualPropertyTaxKurus`, `annualMaintenanceKurus`, `vacancyRate`, `annualInsuranceKurus` | Brüt döküm, boşluk kaybı, tahsil edilen kira, ayrı giderler, `annualExpensesKurus`, `netAnnualIncomeKurus`, `netYield` |
| `paybackPeriod` | `investmentKurus`, `monthlyRentKurus`, isteğe bağlı `annualRentGrowthRate = 0`, `maxYears = 100` | `years` (kesirli yıl veya `null`), `recovered`, ilk yılın kirası, tam yıllık `schedule` |
| `mortgage` | `principalKurus`, `monthlyInterestRate`, `months`, isteğe bağlı `bsmvRate = 0`, `kkdfRate = 0` | Vergiler dahil `monthlyPaymentKurus`, `finalPaymentKurus`, ödeme/faiz/vergi toplamları, aylık `schedule` |
| `purchaseCost` | `propertyPriceKurus`, `deedFeeBaseKurus`, `buyerDeedFeeRate`, `sellerDeedFeeRate`, `revolvingFundKurus`, `agentFeeRate`, `agentVatRate`, `buyerAgentShare`, `appraisalKurus`, `daskKurus` | Alıcı/satıcı için ayrı tapu harcı ve hizmet bedeli, KDV, sabit giderler, `buyerCostsKurus`, `sellerCostsKurus`, işlem giderleri, `buyerTotalKurus`, satıcının net tahsilatı |
| `realReturn` | `nominalReturnRate`, `inflationRate` | Girdi oranları ve `realReturnRate = (1 + nominal) / (1 + enflasyon) - 1` |
| `pricePerSqm` | `propertyPriceKurus`, `areaSqm` | Kuruş/m² olarak yuvarlanmış `pricePerSqmKurus` |
| `comparePricePerSqm` | Metrekare fiyatı girdileri + `regionalAverageKurus` (kuruş/m²) | Yuvarlanmış birim fiyat, `differenceKurus`, `differenceRate = (birim fiyat - ortalama) / ortalama` |
| `rentVsBuy` | `propertyPriceKurus`, `monthlyRentKurus`, `purchaseCostsKurus`, `annualOwnershipCostsKurus`, `annualOpportunityRate`, `years` | Kira/mülkiyet/fırsat maliyeti toplamları, bağlanan sermaye, `rentMinusBuyKurus`, `lowerCostOption: 'rent' \| 'buy' \| 'equal'` |

[Kaynak kod ve dışa aktarılan tipler](src/index.ts) ile [hesabı açıklanan sayısal testlere](tests/calculations.test.ts) bakabilirsiniz. Kredi tablosunda dönem başı borç, taksit, anapara, faiz, BSMV, KKDF ve dönem sonu borç kuruş cinsinden yer alır.

### Para ve girdi doğrulama

- Tutarları sıfır veya pozitif güvenli tam sayı kuruş olarak verin; ondalıklı TL tutarlarını önceden dönüştürün. Fiyat, kredi, yatırım, harç matrahı, alan ve bölge ortalaması sıfırdan büyük olmalıdır.
- Sonlu olmayan sayılar, aralık dışı girdiler ve güvenli sınırı aşan parasal sonuçlar İngilizce mesajla `RangeError` verir. Oranlar `0–1` arasındadır; nominal getiri ve enflasyon `1` değerini aşabilir. Bu sürüm negatif senaryo oranlarını, deflasyonu ve nominal zararı girdi olarak desteklemez. Hesaplanan sonuçlar negatif olabilir.
- Ay sayısı `1–1200`, yıl sayısı `1–1000` arasında tam sayı olmalıdır. Bu sınırlar tablo boyutunu da sınırlar. Seçilen sürede dönmeyen yatırım için sonsuz yerine `null` döner.
- Çarpma ve bölmede sayısal girdinin ondalık yazımı esas alınır; kuruşa yuvarlamadan önce BigInt ile kesin işlem yapılır. **En yakın kuruşa, tam yarımda sıfırdan uzağa** yuvarlanır. Örneğin `100 * 0.145`, kayan noktalı çarpım `14.5` değerinin biraz altında kalsa da `15` olur. Her kalem ayrı yuvarlanır; hizmet bedelindeki bölünemeyen kuruş, alıcı payı yuvarlanıp kalan satıcıya verilerek dağıtılır.
- Sabit taksit katsayısı ve oran sonuçları kayan noktayla hesaplanır. Aylık faiz ve her vergi ayrı ayrı yuvarlanır. Son taksit kalan anaparayı kapattığından hedef taksitten farklı olabilir. Çok küçük krediler yuvarlama nedeniyle erken kapanabilir veya düzensiz taksitler oluşturabilir; tablo istenen vadenin tamamını kapsar ve negatif anapara içermez. Toplamlar tabloyla tutarlıdır. Sınırı aşan sonuçlar kırpılmaz, hata verilir.

## Web hesaplayıcı

```sh
npm run build:web
python -m http.server 8080 --directory web/dist
```

`http://localhost:8080` adresini açın. Üretilen `web/dist` göreli dosya yolları kullanır; GitHub Pages'te proje alt yolunda çalışabilir. Sunucu komutu yalnızca yerel önizleme içindir, kütüphanenin parçası değildir. Kaynaklar [`web/`](web/), dil dosyaları [`en.json`](web/locales/en.json) ve [`tr.json`](web/locales/tr.json) içindedir.

Framework kullanmayan arayüzde tüm hesapları kapsayan yedi sekme, Türkçe/İngilizce dil seçimi, `Intl` ile dile uygun TL biçimi, açık/koyu tema, klavyeyle sekme geçişi, etiketli alanlar, alan yanında hata bildirimi ve kredi ödeme tablosu vardır. Başlangıçtaki hayalî değerler düzenlenebilir. Girdiler sekme ve dil değişiminde bellekte tutulur, sayfa yenilenince silinir; mali veri kaydedilmez. Girdiler değiştiğinde eski sonuçların yenilenmesi gerektiği gösterilir.

[Pages iş akışı](.github/workflows/pages.yml) **yalnızca `main` dalına push olduğunda** çalışır; önce kontrolleri yapar, sonra `web/dist` içeriğini yayımlar. Kullanmak için depo ayarlarında **Pages → Source → GitHub Actions** seçilmelidir. Yerel derleme web sitesini veya npm paketini yayımlamaz.

## Varsayımlar ve uyarılar

**Hukuki, vergisel veya mali tavsiye değildir.** Sonuçlar planlama tahminidir; teklif, değerleme veya getiri garantisi sayılmaz. Girdileri ve geçerli kuralları yetkin uzmanlarla doğrulayın.

- Net kira getirisi yalnızca belirtilen mal sahibi giderleriyle boşluk kaybını içerir; gelir vergisi, alım giderleri ve kredi dahil değildir. Konutun tüm yıl boş kalması net getiriyi negatife düşürebilir.
- Geri dönüş hesabı yalnızca iskonto edilmemiş kira gelirini kullanır. Kira her yıl dönümünde artar; son yılın gereken kısmı doğrusal hesaplanır. Tabloda tam yıllık nakit akışları bulunduğu için son yılın toplamı yatırım tutarını aşabilir. Giderler ve satış değeri dahil değildir.
- Kredi hesabı `P*r / (1 - (1+r)^-n)` formülünü ve aylık `r = monthlyInterestRate * (1 + bsmvRate + kkdfRate)` oranını kullanır. BSMV/KKDF'nin sıfır başlaması bir model varsayımıdır; **muafiyet veya verginin uygulanıp uygulanmayacağı konusunda hüküm vermez**. Banka ücretleri, sigorta, ödemesiz dönem ve değişken faiz dahil değildir.
- Alım fonksiyonuna **yasal oranlar gömülü değildir**. Tapu harcı matrahı açıkça girilir; hesaplayıcı yasal alt sınırı belirlemez. Hizmet bedeli oranı KDV hariç **toplam** orandır; KDV bu bedel üzerinden hesaplanır. `buyerAgentShare`, KDV dahil toplamı paylaştırır. Basit modelde sabit giderler alıcıya yazılır. Muafiyetler, konut satışındaki KDV, değer artış kazancı ve diğer işlem giderleri kendiliğinden belirlenmez.
- `rentVsBuy`, peşin alımı, sabit kirayı ve değerini koruyan konutu esas alır. Alımın ekonomik maliyeti = başlangıç giderleri + yıllık mülkiyet giderleri × yıl + `(fiyat + başlangıç giderleri) × fırsat maliyeti oranı`, yıllık kuruşa yuvarlanarak, × yıl. Konut elde tutulduğu için fiyatın tamamı kayıp sayılmaz. Kredi, değer artışı, kira artışı, bileşik getiri, satış giderleri ve kapsamlı portföy hesabı dahil değildir. Pozitif `rentMinusBuyKurus`, bu varsayımlarla alımın daha düşük maliyetli olduğunu gösterir.
- Fisher hesabındaki oranlar aynı döneme ait olmalıdır. Alan karşılaştırmalarında net/brüt tanımı tutarlı olmalı; bölge ortalamasını kullanıcı sağlamalıdır. Piyasa verisi alınmaz.

### Tarihli Türkiye referans seti

[`src/presets/tr-2026.ts`](src/presets/tr-2026.ts), **22.10.2026 tarihli ve açıkça seçilerek kullanılan bir referans setidir; oranlar değişebilir, doğrulanmalıdır**. Taraf başına %2 tapu harcı, KDV hariç toplam %4 hizmet bedeli üst sınırı, yarı yarıya paylaşım varsayımı ve hizmet bedeli senaryosu için %20 genel KDV içerir. Üst sınır zorunlu ücret değildir. Sabit giderler ücretsiz oldukları için değil, teklif gerektirdikleri için sıfırdır. Kaynaklar kod yorumlarında da bulunur:

- [GİB tapu harcı bilgilendirmesi](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Finfografikler%2Fpdfs%2Ftapuharci.pdf): alıcı/satıcı için ayrı oranlar ve harç matrahı.
- [Ticaret Bakanlığı yönetmeliği, madde 20](https://eskisehir.ticaret.gov.tr/data/64edb08513b876171c69c106/TA%C5%9EINMAZ%20T%C4%B0CARET%C4%B0%20HAKKINDA%20Y%C3%96NETMEL%C4%B0K%20.pdf): toplam hizmet bedeli üst sınırı ve paylaşımı.
- [GİB KDV oranları](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fkdv-oranlari.pdf): genel KDV oranı, 10.07.2023'te yürürlüğe giren 7346 sayılı Karar. Hizmete uygulanabilirliğini doğrulayın.

## Geliştirme ve katkı

```sh
npm run check          # strict tip kontrolü, ESLint, Vitest + kapsama, iki derleme, sır taraması
npm run test:smoke     # derlenmiş paket; yalnızca Node'un yerleşik test/assert modülleriyle kontrol
```

Vitest testleri elle hesabı açıklanan örnekleri, her fonksiyonun geçersiz girdilerini, yuvarlamayı, sınırları, ödeme tablosunun tutarlılığını ve iki dilli DOM arayüzünü kapsar. Kapsama raporu HTML ve LCOV olarak `coverage/` altına yazılır. Kütüphane eşikleri: satır/ifade %95, fonksiyon %100, dal %90. [CI iş akışı](.github/workflows/ci.yml) Node 20, 22 ve 24 üzerinde çalışır. Yukarıdaki CI rozeti bu iş akışını gösterir; güncel testlerin geçtiği iddiası değildir.

İş akışı, gizlilik kuralları ve commit öncesi sır taraması için [CONTRIBUTING.md](CONTRIBUTING.md), sürüm notları için [CHANGELOG.md](CHANGELOG.md) dosyasına bakın. MIT lisansı [LICENSE](LICENSE) içindedir.

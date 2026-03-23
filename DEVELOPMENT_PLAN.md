# CLOCKWORK REQUIEM — Moduler Gelistirme Plani

> **Stack:** Vite + TypeScript + Phaser 3 (Pixel Art Roguelite Autobattler)
> **Kaynak GDD:** `clockwork_requiem_gdd.html` v0.1

---

## M0 — Proje Iskeleti & Altyapi

- [ ] **M0.1** Vite + TypeScript + Phaser 3 proje kurulumu
  - `npm create vite`, phaser paketi, tsconfig, alias ayarlari
- [ ] **M0.2** Klasor yapisi olustur
  - `src/scenes/`, `src/systems/`, `src/entities/`, `src/data/`, `src/ui/`, `src/utils/`, `src/types/`, `assets/`
- [ ] **M0.3** Sahne akisi (Scene Flow) iskeletini yaz
  - Boot → Preload → Menu → RunStart → Map → Battle → Salvage → GameOver
- [ ] **M0.4** EventBus singleton (sistemler arasi iletisim)
- [ ] **M0.5** Global state manager (RunState, MetaState)
- [ ] **M0.6** Save/Load altyapisi (localStorage + JSON serializasyon)
- [ ] **M0.7** Sabit degerler dosyasi (`src/data/constants.ts`)
  - Isı esikleri, stat tabanlari, rarity carpanlari vb.

---

## M1 — Veri Modelleri & Tanimlar

- [ ] **M1.1** TypeScript type/interface tanimlari
  - `PowerSource` (Steam | Electric | Soul)
  - `BodyType` (9 govde: Dokme, Zirh, Kazan, Tel, Lens, Role, Kafes, Rezonans, Yanki)
  - `WeaponModule` (27 silah modulu)
  - `UnitConfig` { powerSource, bodyType?, weaponModule?, parts[], level, stats }
  - `Part` { id, name, category, rarity, powerSource, statMods, heatCost, ability? }
  - `RunState` { units[], map, currentRoom, heat, floor, ascension }
- [ ] **M1.2** Stat sistemi tanimlari
  - HP, ATK, DEF, SPD, HEAT, THRESH, SYN
- [ ] **M1.3** Guc Kaynagi profil verileri (base stat tablolari)
  - Buhar: HP 95, ATK 70, SPD 35, HeatRes 90
  - Elektrik: HP 45, ATK 85, SPD 95, HeatRes 25
  - Ruh: HP 60, ATK 90, SPD 65, HeatRes 55
- [ ] **M1.4** Parca kategorileri veri dosyasi
  - Guc Cekirdegi, Hareket Modulu, Zirh Plakasi, Sogutma Sistemi, Protokol Cipi, Kenet Parcasi
- [ ] **M1.5** Nadirlik sistemi veri tablosu
  - Common → Legendary → Kenet: isi maliyeti ve drop oranlari
- [ ] **M1.6** Durum efektleri tanimlari
  - Pas, Kisa Devre, Asiri Isinma, Donma, Kenet Bulasmasi, Rezonans
- [ ] **M1.7** Taktik direktifleri tanimlari
  - Saldiri, Savunma, Hedefleme, Isi Tasarrufu, Berserker

---

## M2 — Birim (Unit) Sistemi

- [ ] **M2.1** Unit entity sinifi
  - Stats, level, powerSource, bodyType, weaponModule, equippedParts[]
- [ ] **M2.2** Stat hesaplama motoru
  - Base stats + part mods + synergy bonuslari + level scaling
- [ ] **M2.3** Seviye sistemi
  - XP kazanma, level up, Lv.10 govde secimi, Lv.20 silah secimi
- [ ] **M2.4** 3x3x3 agac yapisi (PowerSource → BodyType → WeaponModule)
  - Split secim ekrani UI
- [ ] **M2.5** AXIOM-0 ozel birimi
  - Tam uyumluluk, maks 2 yabanci parca siniri, bagirsiklik
- [ ] **M2.6** Parca takilma / cikarma mekanigi
  - Uyumluluk matrisi kontrolu (ayni kaynak, kismi, catisma)
  - Isi maliyeti hesaplama

---

## M3 — Overload / Isi Yonetim Sistemi

- [ ] **M3.1** Heat Manager sistemi
  - Birim bazli HEAT ve THRESH degerleri
  - Parca ekleme → esik dusme hesabi
- [ ] **M3.2** Isı birikim kaynaklari
  - Parca ekleme, guclu yetenek kullanimi, hasar alma, Kenet efektleri
- [ ] **M3.3** Overload faz sistemi
  - Guvenli (0-40%), Uyari (40-70%), Kritik (70-90%), Patlama (90%+)
- [ ] **M3.4** Faz efektleri
  - Uyari: belirli yetenekler devre disi
  - Kritik: tur basi +2 HEAT, guclu yetenekler +%50 hasar / +%40 isi
  - Patlama: birim devre disi, alan hasari (dost + dusman)
- [ ] **M3.5** Isi azaltma yontemleri
  - Tamir Istasyonu, Sogutma Modulu, Parca Cikarma, Savunma Direktifi
- [ ] **M3.6** Overload gorsel geri bildirim sistemi
  - Renk degisimi, titresim, buhar efektleri, patlama animasyonu
- [ ] **M3.7** "Kasitli Patlama" stratejisi destegi
  - Kurban mekanigi: bilinçli overload ile alan hasari

---

## M4 — Savas Sistemi (Autobattle)

- [ ] **M4.1** BattleManager cekirdegi
  - Turn sirasi (SPD bazli), tur dongusu, savas sonu kontrol
- [ ] **M4.2** AI Protokolleri (birim davranis sistemi)
  - Taktik direktifine gore hedef secimi ve yetenek kullanimi
- [ ] **M4.3** Hasar hesaplama motoru
  - ATK vs DEF, guc kaynagi carpanlari, kritik vurus
- [ ] **M4.4** Yetenek sistemi
  - Aktif yetenekler (silah modulune bagli)
  - Pasif yetenekler (protokol cipine bagli)
  - Tetiklenme kosullari
- [ ] **M4.5** Durum efekti uygulama & suresi
  - Pas, Kisa Devre, Asiri Isinma, Donma, Kenet Bulasmasi, Rezonans
- [ ] **M4.6** Savas icinde isi birikimi
  - Guclu yetenek kullanimi → HEAT artisi
  - Overload tetiklenme kontrolu her tur
- [ ] **M4.7** Sinerji Protokolleri
  - 2+ Buhar: Ortak Isi Havuzu
  - 2+ Elektrik: Zincir iletim bonusu
  - Buhar + Ruh: Buharli Ruh Kalkani
  - Tum farkli: Kaotik Sinerji
- [ ] **M4.8** Anti-sinerji mekanikleri
  - 3 Ruh: Bilinc Cokusu riski
  - Ruh + Kenet: virus yayilma sansi
  - Tam Elektrik + uyusmazlik: zincir patlama
- [ ] **M4.9** Savas animasyonu & gorsel akis
  - Tur bazli animasyonlar, hasar gostergeleri, efektler
- [ ] **M4.10** Savas sonucu ekrani
  - XP dagilimi, birim kaybi, isi durumu ozeti

---

## M5 — Sokum & Loot Sistemi

- [ ] **M5.1** SalvageScene (Sokum Ekrani)
  - Savas sonrasi 1-3 parca sunumu
  - Her parcanin isi maliyeti, stat degisimi, uyumluluk gostergesi
- [ ] **M5.2** Parca havuzu & drop tablosu
  - Bolgeye gore agirlikli drop
  - Elite/Boss → daha fazla ve nadir parca
- [ ] **M5.3** Uyumluluk hesaplama UI
  - Ayni kaynak: standart, Kismi: +%20, Catisma: +%50
  - AXIOM-0 ozel: tam uyumlu ama maks 2
- [ ] **M5.4** Parca envanter yonetimi
  - Takma, cikarma, karsilastirma gorunumu
- [ ] **M5.5** Protokol Cipleri (takim geneli pasifler)
  - Termal Denge, Suru Hafizasi, Kaskad Devreleri, Bilinc Agi
- [ ] **M5.6** Kenet Parcasi ozel mekanigi
  - Cok guclu ama virus bulasma sansi
  - Risk/odul gosterim UI

---

## M6 — Harita & Oda Sistemi

- [ ] **M6.1** Prosedural harita uretici (MapGenerator)
  - Dal yapili, kavsakli harita — her kavsakta 2 yol
  - Bolge bazinda 6-9 oda
- [ ] **M6.2** MapScene — harita goruntuleme & navigasyon
  - Oda ikonlari, yol cizimleri, oyuncu pozisyonu
- [ ] **M6.3** Oda tipleri
  - Savas Odasi: Kenet enfekte otomaton dalgalari
  - Tamir Istasyonu: HP/Isi sifirlama (zaman maliyeti)
  - Veri Terminali: Lore + pasif buff / risk secimi
  - Elite Oda: Komutan-seviye, nadir parca odulu
  - Boss Odasi: Bolge sonu, benzersiz mekanikler
  - Parca Pazari: Bilinc Skoru harcama, parca secimi
- [ ] **M6.4** Bolge temalandirma
  - B1 Kazan Fabrikalari (Buhar), B2 Voltaj Arsivleri (Elektrik), B3 Ruh Laboratuvarlari (Ruh), B4 Kenet Kalbi (karisik)
- [ ] **M6.5** Bolge gecisi ve zorluk artisi
  - Her bolge sonunda boss → sonraki bolgeye gecis
  - Dusman stat scaling

---

## M7 — Takim Yonetimi & Run Akisi

- [ ] **M7.1** TeamManager
  - AXIOM-0 + 4 birim yuvasi, siralama, direktif atama
- [ ] **M7.2** RunStartScene — Guc Kaynagi secimi
  - Buhar / Elektrik / Ruh secim ekrani, profil gosterimi
- [ ] **M7.3** Yeni birim edinme mekanigi
  - Her bolgede 1 yeni birim bulma/insa etme
- [ ] **M7.4** Takim kompozisyon ekrani
  - Birim detaylari, parca yonetimi, sinerji gosterimi
- [ ] **M7.5** Kosu sonu (Run Over)
  - Zafer: meta progresyon odulleri
  - Olum/Patlama: "ne patlatti" analizi + meta ilerleme

---

## M8 — Dusman & Boss Tasarimi

- [ ] **M8.1** Dusman veri modeli
  - Stats, powerSource, AI pattern, loot tablosu
- [ ] **M8.2** Dusman cesitleri
  - Normal Kenet birimleri: bolgeye gore temalandirilmis
  - Elite: Komutan seviye, ozel mekanikler
- [ ] **M8.3** Boss sistemi
  - B1 Boss: Buhar tematik, isi bazli mekanik
  - B2 Boss: Elektrik tematik, hiz/zincir mekanik
  - B3 Boss: Ruh tematik, bilinc bozma mekanik
  - B4 Boss: Kenet Kalbi final boss, coklu faz
- [ ] **M8.4** Dusman AI davranis desenleri
  - Suru hareketi, oncelik hedefleme, senkronize saldiri
- [ ] **M8.5** Kenet Virusu yayilma mekanigi
  - Temas bazli bulasma, gorsel belirti (kirmizi goz)

---

## M9 — Meta Progresyon

- [ ] **M9.1** Sema Kitabi (koleksiyon)
  - Kesfedilen her parca ve sinif kaydi
- [ ] **M9.2** AXIOM Gunlukleri (lore)
  - Kosu icinde bulunan lore parcalari → gunluk formati
- [ ] **M9.3** Konfigurasyon Kilitleri
  - Belirli sinerji kombinasyonlari → yeni baslangic secenekleri
- [ ] **M9.4** Patlama Arsivi
  - Her Overload kaydedilir — analiz ekrani
- [ ] **M9.5** Ascension Protokolu
  - Her basarili run sonrasi zorluk katlari
  - Yeni kisitlar: baslangic isi esigi -15, nadir drop azalma, boss ek katmanlar
- [ ] **M9.6** Kalici ilerleme kaydetme/yukleme
  - Meta state persistence (localStorage / IndexedDB)

---

## M10 — Async PvP

- [ ] **M10.1** Protokol Arsivi — run konfigurasyonu kaydetme
  - Takim + parcalar + direktifler snapshot
- [ ] **M10.2** Ghost AI sistemi
  - Kaydedilmis konfigurasyondan davranis simulasyonu
- [ ] **M10.3** PvP savas motoru
  - Mevcut BattleManager uzerinden ghost vs player
- [ ] **M10.4** Isi Bahsi mekanigi
  - Esik %80'de savas = ek risk/odul
- [ ] **M10.5** Liderboard sistemi
  - Puan hesaplama, isi yonetimi skoru
- [ ] **M10.6** Backend altyapisi (opsiyonel)
  - Supabase / Firebase: kullanici, arsiv, liderboard

---

## M11 — UI & UX

- [ ] **M11.1** Ana Menu ekrani
  - Yeni Kosu, Devam, Sema Kitabi, Arsiv, PvP, Ayarlar
- [ ] **M11.2** HUD tasarimi (savas icin)
  - Birim HP barlari, isi gostergeleri, tur sayaci, direktif ikonu
- [ ] **M11.3** Overload Meter UI
  - 4 fazli renk kodlu bar (Guvenli/Uyari/Kritik/Patlama)
- [ ] **M11.4** Sokum ekrani UI
  - Parca kartlari, isi maliyet bari, uyumluluk rozeti
- [ ] **M11.5** Takim yonetim paneli
  - Birim slotlari, parca yuvalar, stat detaylari
- [ ] **M11.6** Harita UI
  - Oda ikonlari, yol gorselleri, bolge bilgisi
- [ ] **M11.7** Split secim ekranlari (Lv.10 Govde, Lv.20 Silah)
- [ ] **M11.8** Tooltip & bilgi overlay sistemi
- [ ] **M11.9** Ayarlar ekrani (ses, hiz, dil)
- [ ] **M11.10** Gecis animasyonlari (sahne arasi)

---

## M12 — Gorseller & Pixel Art Pipeline

- [ ] **M12.1** Placeholder asset seti (prosedural / geometrik)
  - Temel birim siluetleri, oda ikonlari, UI elemanlari
- [ ] **M12.2** Renk paleti uygulama
  - Buhar: amber/turuncu, Elektrik: soguk mavi, Ruh: mor, Kenet: kirmizi-turuncu
- [ ] **M12.3** Birim sprite'lari
  - AXIOM-0, 9 govde tipi siluetleri, Kenet dusmanlar
- [ ] **M12.4** Overload gorsel katmani
  - Guvenli (mavi goz), Uyari (turuncu + buhar), Kritik (kirmizi + kivilcim), Patlama efekti
- [ ] **M12.5** Ortam & arka plan gorselleri
  - 4 bolge tematik arka plan
- [ ] **M12.6** Efekt animasyonlari
  - Buhar fiskirmasi, elektrik sparki, ruh dalgasi, patlama sok dalgasi
- [ ] **M12.7** UI asset'leri
  - Butonlar, paneller, barlar, ikonlar (endüstriyel tema)

---

## M13 — Ses & Muzik

- [ ] **M13.1** Prosedural / synth ambient muzik sistemi
  - Harita: endustriyel drone, tik-tak ritmi
  - Savas: dinamik tempo, metalik perkusyon
  - Boss: agir orkestral endustriyel
- [ ] **M13.2** Overload ses katmani
  - Kritik: muzik bozulma efekti, asimetrik ritim
  - Patlama: derin boom + metal parcalanma + sessizlik
- [ ] **M13.3** SFX seti
  - Buhar saldirisi (piston), Elektrik (spark), Ruh (inleme)
  - Parca sokum (civata + klik), Kenet bulasmasi (bozuk frekans)
- [ ] **M13.4** AudioManager sistemi
  - Muzik gecisleri, SFX havuzu, ses ayarlari

---

## M14 — Polish & Son Dokunuslar

- [ ] **M14.1** Tutorial / ilk kosu rehberi
  - Ilk 3 kosuda yuksek isi esigi (ogrenme alani)
- [ ] **M14.2** Performans optimizasyonu
  - Asset lazy loading, object pooling, render optimizasyonu
- [ ] **M14.3** Responsive / mobil uyumluluk (opsiyonel)
- [ ] **M14.4** Erisebilirlik ayarlari
  - Renk koru modu, font boyutu, animasyon hizi
- [ ] **M14.5** Lokalizasyon altyapisi (i18n)
  - EN (launch), TR/DE/ZH (sonra)
- [ ] **M14.6** Analytics & hata raporlama
- [ ] **M14.7** Build & deploy pipeline (Vercel / Electron / Steam)

---

## Bagimlilk Grafigi (Onerilen Siralama)

```
M0 (Altyapi)
 └→ M1 (Veri Modelleri)
     ├→ M2 (Birim Sistemi)
     │   ├→ M3 (Overload/Isi)
     │   └→ M4 (Savas Sistemi) ← M3'e de bagimli
     │       └→ M5 (Sokum/Loot)
     ├→ M6 (Harita)
     │   └→ M7 (Run Akisi) ← M5'e de bagimli
     │       └→ M8 (Dusman/Boss)
     ├→ M9 (Meta Progresyon) ← M7 sonrasi
     └→ M10 (PvP) ← M4 + M7 sonrasi

M11 (UI) → her milestone ile paralel ilerler
M12 (Gorseller) → placeholder ile basla, iteratif
M13 (Ses) → M4 sonrasi entegre et
M14 (Polish) → tum M'ler tamamlandiktan sonra
```

---

## Kutuphane Onerileri

| Ihtiyac | Kutuphane | Neden |
|---------|-----------|-------|
| Oyun motoru | **Phaser 3** | 2D pixel art, sahne yonetimi, sprite, animasyon |
| Bundler | **Vite** | Hizli HMR, TS destegi |
| Dil | **TypeScript** | Tip guvenligi, buyuk proje yonetimi |
| State | **Ozel EventBus + Store** | Phaser sahne yapisiyla uyumlu |
| Prosedural harita | **Ozel algoritma** | Dal yapili graf uretici |
| Ses (synth) | **Tone.js** (opsiyonel) | Prosedural muzik/SFX |
| PvP backend | **Supabase** veya **Firebase** | Auth, DB, realtime (async icin yeterli) |
| Deployment | **Vercel** (web) / **Electron** (desktop) | Web-first, sonra Steam wrap |

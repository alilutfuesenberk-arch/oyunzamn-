# GRIMSTONE '94: OVERDOSE - Isometric 2.5D Hotline Action Implementation Plan

## 1. Düşman Görüşü & Pasif Şüphe (Sarı Ünlem) Sistemi
- **Ayrıştırılmış Görüş Kontrolleri (`hasWallCollision`, `hasDoorCollision`, `hasPropCollision`, `hasLineOfSight`)**:
  - `hasWallCollision`: Beton duvarlar görüşü tamamen keser (arkasından görünmez).
  - `hasDoorCollision`: Kapalı kapılar ve açık kapı kanatları doğrudan görüşü engeller.
  - `hasPropCollision`: Bilardo masası, bar tezgahı, koltuklar, jukebox ve slot makineleri doğrudan görüşü keser.
  - `hasLineOfSight`: Yalnızca arada hiçbir duvar, kapı veya obje olmadığında `true` döner (doğrudan açık görüş).
- **Sarı Ünlem (`!`) & Pasif Araştırma Modu (`INVESTIGATE`)**:
  - Düşman karakteri bir objenin (bilardo masası, bar, koltuk vb.) veya bir kapının arkasında fark ettiğinde:
    - Başının üstünde **SARI ÜNLEM (`#facc15` `!`)** ve sarı şüphe halesi belirir.
    - Düşman **pasif ve temkinli** yürüyüş hızında (`speed = 1.9`) o objenin ya da kapının arkasına doğru ilerler ("o tarafa pasif şekilde gider").
    - **Ateş Etmez:** Pasif arama modundayken silahını ateşlemez, şüphelendiği yeri kontrol etmeye gider.
    - Karakter kapının arkasında saklanıyorsa, düşman pasif bir şekilde kapı aralığından geçerek kapının arkasına çıkar ("kapının arkasına çıkar").
    - Eğer kapalı bir kapıya denk gelirse kapıyı tekmeler/açar.
- **Kırmızı Ünlem (`!`) & Aktif Çatışma (`CHASE`)**:
  - Düşman objenin köşesini döndüğünde veya kapının arkasına çıktığında karakterle **doğrudan engelsiz açık görüş** yakalarsa anında tam alarm durumuna geçer:
    - Başının üstünde **KIRMIZI ÜNLEM (`#ef4444` `!`)** belirir.
    - Ateşli silahı varsa doğrudan ateş açar, yakın dövüşçüyse hızla hücum eder.
  - Karakter çatışma esnasında kaçıp tekrar bir objenin veya kapının arkasına saklanırsa, düşman tekrar sarı ünlemle pasif araştırmaya geçip arkasını kontrol etmeye gelir.

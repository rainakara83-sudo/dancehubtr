export const site = {
  name: "DanceHubTr",

  hero: {
    lead: "Sahnede ne varsa, hepsi burada.",
    body: "DanceHub; dansın disipliniyle teknolojinin şeffaflığını aynı sahnede buluşturuyor. Burası; binlerce saatlik emeğin, sahnedeki en güçlü anların ve hak edilmiş başarıların kalıcı adresi. Yarışma takvimleri, açık ve doğrulanabilir jüri puanları, her detayıyla performansı öne çıkaran galeriler ve çok daha fazlası için geri sayım başladı."
  },

  cta: {
    primary: { label: "Sonuç yükle", href: "/giris" },
    secondary: { label: "Yarışmalar", href: "#yarismalar" }
  },

  // Turuncu blok içindeki iki kart
  pillars: [
    {
      title: "Yarışma Takvimi",
      body: "Tüm sezonun etkinliklerini keşfet, tarih veya şehre göre filtrele."
    },
    {
      title: "Resmî Sonuç Arşivi",
      body: "Geçmiş tüm yarışmaların sonuçlarına ve puan detaylarına anında ulaş."
    }
  ],

  features: [
    {
      title: "Yarışma Takvimi",
      body: "IS Group'ın düzenlediği tüm yarışmalar; tarih, şehir ve disiplin bazında filtrelenebilir liste."
    },
    {
      title: "Resmî Sonuçlar",
      body: "Masa hakemi yarışma sonrası sonuçları yükler. Sıra, toplam ve jüri bazında puan detayı yayınlanır."
    },
    {
      title: "Foto & Video Galeri",
      body: "Performanslara özel görsel ve video arşivi. Kişisel aidiyetler arka planda kalır; galeri tamamen koreografi ve sahne sanatı üzerine kuruludur."
    }
  ],

  who: [
    { role: "Seyirci", desc: "Favori koreografini seç; sonuçları ve puanları anında takip et." },
    { role: "Kulüpler / Şirketler", desc: "Organizasyonunu tek ekrandan yönet, sonuçlarını güvenle paylaş." },
    { role: "Masa Hakemi", desc: "Karmaşık hesaplara son; yarışma bittiği an sonuçları saniyeler içinde yükle." },
    { role: "Jüri", desc: "Oylarınız güvence altında; tamamen şeffaf ve adil bir değerlendirme süreci." }
  ],

  // Sonuçlar bölümünde yarışma seçici (SS4)
  competitions: [
    { name: "METAMORFOZ DANCE COMPETITION", eps: "EPS 5", date: "14 Şubat 2026", city: "İstanbul", live: true },
    { name: "LOZENGE DANCE COMPETITION", eps: "EPS 4", date: "21 Aralık 2025", city: "İstanbul", live: false },
    { name: "METAMORFOZ DANCE COMPETITION", eps: "EPS 4", date: "05 Kasım 2025", city: "İstanbul", live: false },
    { name: "LOZENGE DANCE COMPETITION", eps: "EPS 3", date: "18 Eylül 2025", city: "İstanbul", live: false }
  ],

  // Galeri bölümü (SS9)
  gallery: {
    title: "Sahnelerden kareler",
    body: "Fotoğraf ve video, performansa bağlı olarak yüklenir. Dansçının kimliği gizli kalır; galeri koreografi üzerinden kurulur.",
    archive: [
      "METAMORFOZ DANCE COMPETITION  EPS 5",
      "LOZENGE DANCE COMPETITION EPS 4",
      "METAMORFOZ DANCE COMPETITION  EPS 4",
      "LOZENGE DANCE COMPETITION EPS 3",
      "METAMORFOZ DANCE COMPETITION  EPS 3",
      "LOZENGE DANCE COMPETITION EPS 2",
      "METAMORFOZ DANCE COMPETITION  EPS 2",
      "LOZENGE DANCE COMPETITION EPS 1"
    ]
  },

  // Erken erişim / bekleme listesi (CTA)
  waitlist: {
    title: "Erken Erişim İçin Sınırlı Sayılı Günler.",
    body: "Kapılar açıldığı an içeride olmak ve bu devrimin bir parçası kalmak istiyorsan, ilk haberi alanlardan ol.",
    placeholder: "E-posta adresini yaz, açılışta ilk sen haberdar ol",
    button: "Bize E-posta Gönder",
    email: "iletisim@dancehubtr.com"
  },

  footer: "© 2026 DanceHubTR · Powered by IS Group",

  contact: "iletisim@dancehubtr.com"
}

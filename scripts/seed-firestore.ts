/**
 * Seed Firestore with mock CHAPTERS data.
 * Uses Firebase Auth REST API to get an ID token, then Firestore REST API to write.
 * 
 * Usage: npx tsx scripts/seed-firestore.ts
 */

const API_KEY = "AIzaSy...GXKE"; // same as firebase.ts
const PROJECT_ID = "lmspasraman";

// Test credentials (must exist in Firebase Auth)
const TEST_EMAIL = "siswa001@pasraman.id";
const TEST_PASSWORD = "pasraman123";

// ── Auth: sign in to get ID token ──
async function signIn(): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth failed: ${err}`);
  }
  const data = await res.json();
  console.log(`✅ Signed in as ${data.email} (localId: ${data.localId.slice(0, 8)}...)`);
  return data.idToken;
}

// ── Firestore REST: write a document ──
async function writeDoc(token: string, collection: string, docId: string, data: any) {
  // Firestore REST API v1
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  // Convert JS object to Firestore field format
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    fields[key] = toFirestoreValue(val);
  }
  
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore write failed for ${collection}/${docId}: ${err}`);
  }
  console.log(`  📝 ${collection}/${docId}`);
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return { integerValue: String(val) };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// ── CHAPTERS data (copied from mock-data.ts) ──
const CHAPTERS = [
  {
    id: "bab-1", orderIndex: 1,
    title: "Pengantar Susila Hindu",
    subtitle: "Apa itu Susila dan mengapa penting?",
    description: "Memahami konsep dasar Susila dalam Hindu: arti, sumber ajaran, dan penerapannya dalam kehidupan sehari-hari.",
    materialContent: `## Apa itu Susila?\n\nSusila berasal dari bahasa Sanskerta: **Su** (baik) dan **Sila** (perilaku). Susila adalah ajaran tentang tingkah laku yang baik dan benar sesuai Dharma.\n\n### Mengapa Mempelajari Susila Penting?\n\n1. **Membentuk karakter mulia** — menuntun kita menjadi pribadi yang berakhlak\n2. **Hidup selaras dengan Dharma** — membedakan yang benar dan salah\n3. **Subha & Asubha Karma** — memahami bahwa setiap perbuatan berbuah\n\n### Sumber Ajaran Susila\n\n- **Weda Sruti** — wahyu suci yang didengar para Rsi\n- **Weda Smerti** — kitab hukum seperti Manawa Dharmasastra\n- **Itihasa** — Ramayana & Mahabharata (khususnya Bhagavad Gita)\n\n### Penerapan Sehari-hari\n\nSusila bukan hanya teori. Setiap hari kita dihadapkan pada pilihan:\n- Berkata jujur atau berbohong\n- Menolong teman atau bersikap acuh\n- Menghormati orang tua atau membantah\n\nPilihan-pilihan kecil inilah yang membentuk karma kita.`,
    materialVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    preTest: [
      { id: "pre1-1", question: 'Apa arti kata "Su" dalam Susila?', options: ["Kuat", "Baik", "Suci", "Agung"], correctIndex: 1 },
      { id: "pre1-2", question: "Manawa Dharmasastra termasuk golongan kitab?", options: ["Weda Sruti", "Weda Smerti", "Itihasa", "Purana"], correctIndex: 1 },
      { id: "pre1-3", question: "Sebutan untuk wahyu suci yang didengar para Rsi adalah?", options: ["Weda Smerti", "Weda Sruti", "Bhagavad Gita", "Nitisastra"], correctIndex: 1 },
    ],
    tasks: [
      { id: "t1-1", title: "Refleksi Diri", description: "Tuliskan 3 contoh perilaku Susila yang kamu lakukan hari ini dalam kehidupan sehari-hari. Submit dalam bentuk teks.", dueDate: "2026-05-28", type: "submission_link" },
    ],
    postTestMandatory: [
      { id: "post1-1", question: 'Apa arti kata "Sila" dalam Susila?', options: ["Kuat", "Perilaku", "Suci", "Tuhan"], correctIndex: 1 },
      { id: "post1-2", question: "Manakah yang BUKAN sumber ajaran Susila?", options: ["Weda Sruti", "Weda Smerti", "Itihasa", "Koran"], correctIndex: 3 },
      { id: "post1-3", question: "Apa itu Subha Karma?", options: ["Perbuatan buruk", "Perbuatan baik", "Tidak berbuat", "Hasil perbuatan"], correctIndex: 1 },
      { id: "post1-4", question: "Kitab hukum Hindu yang terkenal adalah?", options: ["Ramayana", "Manawa Dharmasastra", "Bhagavad Gita", "Upanishad"], correctIndex: 1 },
      { id: "post1-5", question: "Susila menuntun kita hidup selaras dengan?", options: ["Keinginan", "Dharma", "Kekuasaan", "Kekayaan"], correctIndex: 1 },
    ],
    postTestOptional: {
      instruction: "### Tugas Pengayaan: Video Refleksi Susila\n\n1. Pilih satu ajaran Susila dari bab ini\n2. Buat video pendek (1-2 menit) tentang:\n   - Bagaimana kamu menerapkan ajaran itu\n   - Apa manfaat yang kamu rasakan\n3. Upload ke YouTube (unlisted) atau Google Drive\n4. **Submit link video di sini**",
    },
    coverEmoji: "🪷",
    coverColor: "from-orange-100 to-amber-200",
  },
  {
    id: "bab-2", orderIndex: 2,
    title: "Tri Kaya Parisudha",
    subtitle: "Tiga perbuatan yang harus disucikan",
    description: "Mempelajari tiga jenis perbuatan suci: berpikir baik (Manacika), berkata baik (Wacika), dan berbuat baik (Kayika).",
    materialContent: `## Tri Kaya Parisudha\n\nTri Kaya Parisudha adalah **tiga perbuatan yang harus disucikan** dalam ajaran Hindu:\n\n### 1. Manacika — Berpikir yang Baik 🙏\n\nPikiran adalah sumber segala perbuatan. **Apa yang kita pikirkan akan tercermin dalam ucapan dan tindakan.**\n\n- Selalu berpikir positif terhadap sesama\n- Menghindari iri hati, dengki, dan prasangka buruk\n- Mengisi pikiran dengan hal-hal yang bermanfaat\n\n> "Pikiran adalah pelopor, pikiran adalah pemimpin, segala sesuatu diciptakan oleh pikiran." — *Dhammapada*\n\n### 2. Wacika — Berkata yang Baik 🗣️\n\nUcapan memiliki kekuatan besar. Kata-kata bisa menyembuhkan atau melukai.\n\n- Berkata jujur (*Satya*)\n- Berkata lembut dan sopan (*Priya*)\n- Berkata yang bermanfaat (*Hita*)\n- Menghindari fitnah, gosip, dan kata-kata kasar\n\n### 3. Kayika — Berbuat yang Baik 🤲\n\nPerbuatan nyata yang mencerminkan Dharma. Pikiran baik + ucapan baik harus diwujudkan dalam tindakan.\n\n- Menolong sesama tanpa pamrih\n- Menghormati orang tua dan guru\n- Menjaga kebersihan lingkungan\n- Rajin bersembahyang dan belajar`,
    materialVideoUrl: null,
    preTest: [
      { id: "pre2-1", question: "Tri Kaya Parisudha terdiri dari berapa bagian?", options: ["2", "3", "4", "5"], correctIndex: 1 },
      { id: "pre2-2", question: "Manacika berarti?", options: ["Berkata baik", "Berpikir baik", "Berbuat baik", "Berdoa baik"], correctIndex: 1 },
    ],
    tasks: [
      { id: "t2-1", title: "Jurnal Tri Kaya", description: "Catat selama 3 hari: setiap hari tulis 1 contoh Manacika, 1 Wacika, dan 1 Kayika yang kamu lakukan. Submit hasilnya dalam bentuk teks atau foto jurnal.", dueDate: "2026-06-02", type: "submission_link" },
    ],
    postTestMandatory: [
      { id: "post2-1", question: '"Manacika" secara bahasa berarti?', options: ["Pikiran yang baik", "Ucapan yang baik", "Perbuatan yang baik", "Doa yang baik"], correctIndex: 0 },
      { id: "post2-2", question: "Berkata jujur dalam Hindu disebut?", options: ["Priya", "Satya", "Hita", "Dharma"], correctIndex: 1 },
      { id: "post2-3", question: "Yang termasuk contoh Kayika yang baik adalah?", options: ["Menghina teman", "Menolong membersihkan pura", "Berbohong pada guru", "Iri pada teman"], correctIndex: 1 },
      { id: "post2-4", question: '"Priya" dalam konteks Wacika berarti?', options: ["Berkata jujur", "Berkata lembut dan sopan", "Berkata bermanfaat", "Berkata keras"], correctIndex: 1 },
      { id: "post2-5", question: "Mengapa Manacika dianggap paling penting dalam Tri Kaya Parisudha?", options: ["Karena paling mudah", "Karena pikiran adalah sumber ucapan dan perbuatan", "Karena paling terlihat", "Karena paling sulit"], correctIndex: 1 },
    ],
    postTestOptional: null,
    coverEmoji: "💎",
    coverColor: "from-emerald-100 to-teal-200",
  },
  {
    id: "bab-3", orderIndex: 3,
    title: "Subha & Asubha Karma",
    subtitle: "Memahami hukum karma dalam kehidupan",
    description: "Mengenal perbuatan baik (Subha Karma) dan buruk (Asubha Karma) serta hukum Karma Phala yang mengajarkan setiap perbuatan berbuah.",
    materialContent: `## Subha Karma & Asubha Karma\n\nDalam ajaran Hindu, setiap perbuatan akan mendatangkan hasil. Ini disebut **Karma Phala** — hukum sebab-akibat universal.\n\n### Subha Karma — Perbuatan Baik 🌸\n\nPerbuatan yang sesuai Dharma, menghasilkan karma baik (*Subha Karma Phala*):\n\n- Menghormati orang tua dan guru (*Guru Susrusa*)\n- Menjaga kebersihan dan melestarikan alam\n- Rajin belajar dan bersembahyang\n- Berkata jujur dan menolong sesama\n- Berdana punia (bersedekah)\n\n### Asubha Karma — Perbuatan Buruk ⚠️\n\nPerbuatan yang melanggar Dharma, menghasilkan karma buruk (*Asubha Karma Phala*):\n\n- Berbohong dan mencuri\n- Menyakiti makhluk hidup (*Himsa Karma*)\n- Malas belajar dan bermalas-malasan\n- Merusak alam dan lingkungan\n- Menghina dan merendahkan orang lain\n\n### Hukum Karma Phala 📜\n\n> **"Siapa menanam, dia menuai."**\n\nHukum karma bukan hukuman, melainkan konsekuensi alami. Seperti menanam padi akan tumbuh padi, bukan jagung. Begitu pula perbuatan kita.\n\n### Tiga Jenis Karma Phala\n\n1. **Sancita Karma Phala** — hasil perbuatan masa lalu yang belum dinikmati\n2. **Prarabdha Karma Phala** — hasil perbuatan yang sedang dinikmati sekarang\n3. **Kriyamana Karma Phala** — hasil perbuatan yang akan dinikmati di masa depan`,
    materialVideoUrl: null,
    preTest: null,
    tasks: [],
    postTestMandatory: [
      { id: "post3-1", question: "Subha Karma berarti?", options: ["Perbuatan buruk", "Perbuatan baik", "Perbuatan netral", "Tidak berbuat"], correctIndex: 1 },
      { id: "post3-2", question: "Apa akibat dari Asubha Karma?", options: ["Kelahiran mulia", "Kebahagiaan", "Penderitaan", "Moksha"], correctIndex: 2 },
      { id: "post3-3", question: "Menyakiti makhluk hidup dalam Hindu disebut?", options: ["Subha Karma", "Himsa Karma", "Karma Phala", "Tri Kaya"], correctIndex: 1 },
      { id: "post3-4", question: '"Siapa menanam, dia menuai" merujuk pada hukum?', options: ["Dharma", "Karma Phala", "Punarbhawa", "Moksha"], correctIndex: 1 },
      { id: "post3-5", question: "Karma yang sedang dinikmati saat ini disebut?", options: ["Sancita", "Prarabdha", "Kriyamana", "Asubha"], correctIndex: 1 },
    ],
    postTestOptional: {
      instruction: "### Tugas Pengayaan: Mind Map Karma\n\n1. Buat mind map (peta pikiran) tentang Subha & Asubha Karma\n2. Bisa digambar tangan lalu difoto, atau dibuat digital (Canva, dll)\n3. Mind map harus mencakup:\n   - Definisi Subha Karma + 5 contoh\n   - Definisi Asubha Karma + 5 contoh\n   - 3 jenis Karma Phala\n4. Upload ke Google Drive dan **submit link di sini**",
    },
    coverEmoji: "⚖️",
    coverColor: "from-violet-100 to-purple-200",
  },
  {
    id: "bab-4", orderIndex: 4,
    title: "Tat Twam Asi",
    subtitle: "Ajaran welas asih dalam Hindu",
    description: 'Memahami makna "Engkau adalah Aku" dari Chandogya Upanishad dan penerapannya dalam toleransi serta kepemimpinan.',
    materialContent: `## Tat Twam Asi — Engkau adalah Aku\n\n**Tat Twam Asi** berasal dari *Chandogya Upanishad*, salah satu kitab suci Hindu. Secara harfiah berarti **"Itu adalah Kamu"** atau **"Engkau adalah Aku"**.\n\n### Makna Filosofis\n\nSemua makhluk pada hakikatnya adalah bagian dari **Brahman** (Tuhan Yang Maha Esa). Tidak ada perbedaan esensial antara aku, kamu, dan makhluk lain.\n\nJika kita menyakiti orang lain, pada hakikatnya kita menyakiti diri sendiri. Jika kita menolong orang lain, kita menolong diri sendiri.\n\n### Penerapan Tat Twam Asi 🌏\n\n1. **Toleransi Beragama** — menghormati keyakinan orang lain\n2. **Anti Diskriminasi** — tidak membeda-bedakan berdasarkan suku, agama, ras\n3. **Empati** — merasakan penderitaan sesama dan terdorong menolong\n4. **Kerukunan** — menjaga kedamaian di sekolah, rumah, dan masyarakat\n\n### Ajaran Kepemimpinan dari Itihasa 👑\n\n#### Rama — Pemimpin yang Berkorban\nDalam Ramayana, Rama rela meninggalkan istana dan hidup di hutan selama 14 tahun demi menepati janji ayahnya. Pemimpin sejati mengutamakan kebenaran di atas kenyamanan pribadi.\n\n#### Yudhistira — Pemimpin Dharma\nDalam Mahabharata, Yudhistira memimpin dengan berpegang teguh pada Dharma. Ia tidak pernah berbohong dan selalu mengutamakan keadilan, bahkan di tengah perang.\n\n### Refleksi\n\n> "Jika kamu ingin orang lain memperlakukanmu dengan baik, perlakukanlah mereka dengan baik terlebih dahulu."`,
    materialVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    preTest: [
      { id: "pre4-1", question: '"Tat Twam Asi" berasal dari kitab?', options: ["Bhagavad Gita", "Chandogya Upanishad", "Ramayana", "Manawa Dharmasastra"], correctIndex: 1 },
    ],
    tasks: [
      { id: "t4-1", title: "Esai Mini: Tat Twam Asi dalam Hidupku", description: "Tulis esai pendek (minimal 150 kata) tentang bagaimana kamu menerapkan prinsip Tat Twam Asi dalam kehidupan sehari-hari. Submit link Google Docs.", dueDate: "2026-06-04", type: "submission_link" },
    ],
    postTestMandatory: [
      { id: "post4-1", question: 'Arti harfiah "Tat Twam Asi" adalah?', options: ["Aku adalah Brahman", "Engkau adalah Aku", "Kebenaran pasti menang", "Hidup adalah penderitaan"], correctIndex: 1 },
      { id: "post4-2", question: "Dalam Ramayana, siapa yang rela berkorban meninggalkan istana demi janji?", options: ["Laksmana", "Bharata", "Rama", "Hanuman"], correctIndex: 2 },
      { id: "post4-3", question: "Yudhistira dikenal sebagai pemimpin yang?", options: ["Gagah berani", "Kaya raya", "Berpegang pada Dharma", "Sakti mandraguna"], correctIndex: 2 },
      { id: "post4-4", question: "Penerapan Tat Twam Asi dalam kehidupan sehari-hari adalah?", options: ["Bersaing dengan teman", "Menghormati semua orang tanpa memandang perbedaan", "Mementingkan diri sendiri", "Menghindari interaksi sosial"], correctIndex: 1 },
      { id: "post4-5", question: "Mengapa Tat Twam Asi penting untuk toleransi beragama?", options: ["Karena memaksa semua beragama sama", "Karena mengajarkan bahwa semua manusia adalah bagian dari Brahman", "Karena melarang beribadah", "Karena mengajarkan satu agama"], correctIndex: 1 },
    ],
    postTestOptional: {
      instruction: "### Tugas Pengayaan: Video Drama Pendek\n\n1. Bersama 2-3 teman, buat video drama pendek (2-3 menit) tentang penerapan Tat Twam Asi\n2. Contoh tema: toleransi di sekolah, menolong tanpa memandang perbedaan\n3. Upload ke YouTube (unlisted)\n4. **Submit link video di sini**",
    },
    coverEmoji: "🕉️",
    coverColor: "from-rose-100 to-pink-200",
  },
  {
    id: "bab-5", orderIndex: 5,
    title: "Catur Guru",
    subtitle: "Empat guru dalam kehidupan",
    description: "Mengenal empat guru yang wajib dihormati: Guru Rupaka (orang tua), Guru Pengajian (guru sekolah), Guru Wisesa (pemerintah), dan Guru Swadyaya (Tuhan).",
    materialContent: `## Catur Guru — Empat Guru Kehidupan\n\n**Catur** berarti empat, **Guru** berarti yang patut dihormati. Catur Guru adalah ajaran tentang empat sosok yang wajib kita hormati dalam hidup.\n\n### 1. Guru Rupaka — Orang Tua 👨‍👩‍👧\n\nOrang tua adalah guru pertama dan utama. Mereka yang melahirkan, membesarkan, dan mendidik kita dengan penuh kasih sayang.\n\n**Kewajiban kita:**\n- Hormat dan patuh pada orang tua\n- Membantu pekerjaan rumah\n- Belajar dengan rajin — membanggakan mereka\n- Merawat mereka di masa tua\n\n### 2. Guru Pengajian — Guru Sekolah 📚\n\nGuru di sekolah yang memberikan ilmu pengetahuan dan membimbing kita menjadi manusia yang cerdas dan berkarakter.\n\n**Kewajiban kita:**\n- Menghormati dan mendengarkan guru\n- Mengerjakan tugas tepat waktu\n- Tidak menyontek atau berbuat curang\n- Menjaga nama baik sekolah\n\n### 3. Guru Wisesa — Pemerintah 🏛️\n\nPemerintah dan pemimpin yang menciptakan ketertiban, keamanan, dan kesejahteraan masyarakat.\n\n**Kewajiban kita:**\n- Mematuhi peraturan yang berlaku\n- Ikut menjaga ketertiban lingkungan\n\n### 4. Guru Swadyaya — Ida Sang Hyang Widhi Wasa 🙏\n\nTuhan Yang Maha Esa sebagai guru sejati, sumber segala ilmu dan kebenaran.\n\n**Kewajiban kita:**\n- Rajin sembahyang dan berdoa\n- Mempelajari kitab suci\n- Merenungkan ajaran Dharma`,
    materialVideoUrl: null,
    preTest: [
      { id: "pre5-1", question: "Catur Guru berarti?", options: ["Empat kitab", "Empat guru", "Empat dewa", "Empat jalan"], correctIndex: 1 },
      { id: "pre5-2", question: "Orang tua termasuk dalam kategori?", options: ["Guru Wisesa", "Guru Rupaka", "Guru Pengajian", "Guru Swadyaya"], correctIndex: 1 },
    ],
    tasks: [
      { id: "t5-1", title: "Surat untuk Guru", description: "Tulis surat pendek untuk salah satu Catur Guru dalam hidupmu (orang tua, guru sekolah, dll). Ekspresikan rasa terima kasihmu. Submit teks.", dueDate: "2026-06-06", type: "submission_link" },
    ],
    postTestMandatory: [
      { id: "post5-1", question: "Guru Rupaka merujuk pada?", options: ["Guru sekolah", "Orang tua", "Pemerintah", "Tuhan"], correctIndex: 1 },
      { id: "post5-2", question: "Guru Wisesa adalah?", options: ["Guru spiritual", "Guru di sekolah", "Pemerintah/pemimpin", "Orang tua"], correctIndex: 2 },
      { id: "post5-3", question: "Guru Swadyaya berarti?", options: ["Orang tua", "Guru sekolah", "Pemerintah", "Tuhan Yang Maha Esa"], correctIndex: 3 },
      { id: "post5-4", question: "Berapa jumlah guru dalam ajaran Catur Guru?", options: ["3", "4", "5", "6"], correctIndex: 1 },
      { id: "post5-5", question: "Mengapa kita harus menghormati Guru Pengajian?", options: ["Karena takut dihukum", "Karena mereka memberi ilmu dan membimbing kita", "Karena dipaksa orang tua", "Karena mereka kaya"], correctIndex: 1 },
    ],
    postTestOptional: {
      instruction: "### Tugas Pengayaan: Poster Digital Catur Guru\n\n1. Buat poster digital tentang Catur Guru — bisa pakai Canva, Photoshop, atau tools lainnya\n2. Poster harus mencakup keempat guru beserta penjelasan singkat\n3. Upload ke Google Drive dan **submit link di sini**",
    },
    coverEmoji: "👨‍🏫",
    coverColor: "from-blue-100 to-sky-200",
  },
  {
    id: "bab-6", orderIndex: 6,
    title: "Kepemimpinan Asta Brata",
    subtitle: "Delapan sifat pemimpin ideal",
    description: "Mempelajari Asta Brata dari Ramayana: delapan sifat alam yang harus dimiliki seorang pemimpin.",
    materialContent: `## Asta Brata — Delapan Sifat Kepemimpinan\n\n**Asta** berarti delapan, **Brata** berarti laku/sifat. Asta Brata adalah ajaran kepemimpinan Hindu dari *Ramayana* yang diajarkan Rama kepada Wibisana.\n\n### Delapan Sifat Pemimpin Ideal 👑\n\n1. **Indra Brata** 🌧️ — Seperti hujan: menyejukkan, memberi kesuburan, merata tanpa pandang bulu. Pemimpin harus adil dan memberi kesejahteraan pada semua.\n\n2. **Yama Brata** ⚖️ — Seperti Dewa Yama: menegakkan keadilan tanpa pandang bulu. Pemimpin harus tegas menghukum yang salah dan melindungi yang benar.\n\n3. **Surya Brata** ☀️ — Seperti matahari: memberi penerangan perlahan-lahan, tidak menyilaukan. Pemimpin mendidik rakyatnya dengan sabar, tidak memaksa.\n\n4. **Candra Brata** 🌙 — Seperti bulan: menyejukkan hati, memberi kedamaian. Pemimpin harus menenangkan, tidak menakut-nakuti rakyatnya.\n\n5. **Bayu Brata** 🌬️ — Seperti angin: bergerak tanpa terlihat, menyelami segala tempat. Pemimpin harus memahami kondisi rakyatnya secara langsung, tidak hanya dari laporan.\n\n6. **Kuwera Brata** 💰 — Seperti Dewa Kekayaan: bijak mengelola sumber daya. Pemimpin harus mengelola keuangan negara dengan jujur dan tepat sasaran.\n\n7. **Baruna Brata** 🌊 — Seperti samudra: luas, dalam, menampung segala sungai tanpa meluap. Pemimpin harus berwawasan luas dan mampu menampung aspirasi.\n\n8. **Agni Brata** 🔥 — Seperti api: membakar habis kejahatan. Pemimpin harus berani memberantas korupsi dan ketidakadilan.\n\n### Refleksi\n\n> "Pemimpin sejati bukan yang minta dihormati, melainkan yang membuat rakyatnya hidup sejahtera." — Ajaran Rama kepada Wibisana`,
    materialVideoUrl: null,
    preTest: [
      { id: "pre6-1", question: '"Asta" dalam Asta Brata berarti?', options: ["Tujuh", "Delapan", "Sembilan", "Sepuluh"], correctIndex: 1 },
      { id: "pre6-2", question: "Asta Brata berasal dari kitab?", options: ["Bhagavad Gita", "Manawa Dharmasastra", "Ramayana", "Upanishad"], correctIndex: 2 },
    ],
    tasks: [
      { id: "t6-1", title: "Analisis Pemimpin", description: "Pilih satu pemimpin (dari sekolah, daerah, atau nasional) dan analisis sifat-sifat Asta Brata apa yang sudah/selum dimilikinya. Tulis minimal 200 kata. Submit teks.", dueDate: "2026-06-10", type: "submission_link" },
    ],
    postTestMandatory: [
      { id: "post6-1", question: "Berapa jumlah sifat dalam Asta Brata?", options: ["5", "7", "8", "10"], correctIndex: 2 },
      { id: "post6-2", question: "Indra Brata mengajarkan pemimpin bersifat seperti?", options: ["Api", "Hujan", "Matahari", "Samudra"], correctIndex: 1 },
      { id: "post6-3", question: "Sifat Yama Brata mengajarkan pemimpin untuk?", options: ["Memberi kesejahteraan", "Menegakkan keadilan", "Mendidik rakyat", "Mengelola kekayaan"], correctIndex: 1 },
      { id: "post6-4", question: "Baruna Brata melambangkan?", options: ["Api yang membakar", "Samudra yang luas", "Hujan yang menyejukkan", "Angin yang menyelami"], correctIndex: 1 },
      { id: "post6-5", question: "Agni Brata mengajarkan pemimpin untuk?", options: ["Bersikap lembut", "Berani memberantas kejahatan", "Mengelola keuangan", "Mendidik dengan sabar"], correctIndex: 1 },
    ],
    postTestOptional: {
      instruction: "### Tugas Pengayaan: Esai Kepemimpinan\n\n1. Tulis esai tentang: \"Jika aku menjadi pemimpin, sifat Asta Brata mana yang akan aku terapkan pertama kali?\"\n2. Minimal 250 kata\n3. Submit link Google Docs di sini",
    },
    coverEmoji: "👑",
    coverColor: "from-yellow-100 to-amber-200",
  },
];

// ── Main ──
async function main() {
  console.log("🌱 Seeding Firestore...\n");
  const token = await signIn();

  for (const chapter of CHAPTERS) {
    const { id, ...data } = chapter;
    await writeDoc(token, "materi", id, data);
  }

  console.log(`\n✅ Done! ${CHAPTERS.length} chapters seeded to Firestore.`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});

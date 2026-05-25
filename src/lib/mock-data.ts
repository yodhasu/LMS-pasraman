import { Chapter, StudentInfo } from './types';

export const STUDENT_INFO: StudentInfo = {
  name: 'Putu Adi Sanjaya',
  className: 'Kelas 8B',
  semester: 'Genap 2025/2026',
};

export const CHAPTERS: Chapter[] = [
  {
    id: 'bab-1',
    orderIndex: 1,
    title: 'Pengantar Susila Hindu',
    subtitle: 'Apa itu Susila dan mengapa penting?',
    description: 'Memahami konsep dasar Susila dalam Hindu: arti, sumber ajaran, dan penerapannya dalam kehidupan sehari-hari.',
    materialContent: `## Apa itu Susila?

Susila berasal dari bahasa Sanskerta: **Su** (baik) dan **Sila** (perilaku). Susila adalah ajaran tentang tingkah laku yang baik dan benar sesuai Dharma.

### Mengapa Mempelajari Susila Penting?

1. **Membentuk karakter mulia** — menuntun kita menjadi pribadi yang berakhlak
2. **Hidup selaras dengan Dharma** — membedakan yang benar dan salah
3. **Subha & Asubha Karma** — memahami bahwa setiap perbuatan berbuah

### Sumber Ajaran Susila

- **Weda Sruti** — wahyu suci yang didengar para Rsi
- **Weda Smerti** — kitab hukum seperti Manawa Dharmasastra
- **Itihasa** — Ramayana & Mahabharata (khususnya Bhagavad Gita)

### Penerapan Sehari-hari

Susila bukan hanya teori. Setiap hari kita dihadapkan pada pilihan:
- Berkata jujur atau berbohong
- Menolong teman atau bersikap acuh
- Menghormati orang tua atau membantah

Pilihan-pilihan kecil inilah yang membentuk karma kita.`,
    materialVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    preTest: [
      { id: 'pre1-1', question: 'Apa arti kata "Su" dalam Susila?', options: ['Kuat', 'Baik', 'Suci', 'Agung'], correctIndex: 1 },
      { id: 'pre1-2', question: 'Manawa Dharmasastra termasuk golongan kitab?', options: ['Weda Sruti', 'Weda Smerti', 'Itihasa', 'Purana'], correctIndex: 1 },
      { id: 'pre1-3', question: 'Sebutan untuk wahyu suci yang didengar para Rsi adalah?', options: ['Weda Smerti', 'Weda Sruti', 'Bhagavad Gita', 'Nitisastra'], correctIndex: 1 },
    ],
    tasks: [
      { id: 't1-1', title: 'Refleksi Diri', description: 'Jawab soal-soal berikut berdasarkan pemahamanmu tentang Susila.', dueDate: '2026-05-28', type: 'mcq',
        questions: [
          { id: 't1-1-q1', question: 'Apa arti kata "Susila"?', options: ['Perilaku baik dan benar sesuai Dharma', 'Kekuatan fisik', 'Kekayaan materi', 'Kecerdasan akal'], correctIndex: 0 },
          { id: 't1-1-q2', question: 'Dari bahasa apa kata Susila berasal?', options: ['Jawa Kuno', 'Sanskerta', 'Pali', 'Latin'], correctIndex: 1 },
          { id: 't1-1-q3', question: 'Apa sumber utama ajaran Susila dalam Hindu?', options: ['Koran', 'Weda', 'Internet', 'Primbon'], correctIndex: 1 },
        ],
        answer: [] },
    ],
    postTestMandatory: [
      { id: 'post1-1', question: 'Apa arti kata "Sila" dalam Susila?', options: ['Kuat', 'Perilaku', 'Suci', 'Tuhan'], correctIndex: 1 },
      { id: 'post1-2', question: 'Manakah yang BUKAN sumber ajaran Susila?', options: ['Weda Sruti', 'Weda Smerti', 'Itihasa', 'Koran'], correctIndex: 3 },
      { id: 'post1-3', question: 'Apa itu Subha Karma?', options: ['Perbuatan buruk', 'Perbuatan baik', 'Tidak berbuat', 'Hasil perbuatan'], correctIndex: 1 },
      { id: 'post1-4', question: 'Kitab hukum Hindu yang terkenal adalah?', options: ['Ramayana', 'Manawa Dharmasastra', 'Bhagavad Gita', 'Upanishad'], correctIndex: 1 },
      { id: 'post1-5', question: 'Susila menuntun kita hidup selaras dengan?', options: ['Keinginan', 'Dharma', 'Kekuasaan', 'Kekayaan'], correctIndex: 1 },
    ],
    postTestOptional: {
      instruction: `### Tugas Pengayaan: Video Refleksi Susila

1. Pilih satu ajaran Susila dari bab ini
2. Buat video pendek (1-2 menit) tentang:
   - Bagaimana kamu menerapkan ajaran itu
   - Apa manfaat yang kamu rasakan
3. Upload ke YouTube (unlisted) atau Google Drive
4. **Submit link video di sini**`,
      answer: [],
    },
    coverEmoji: '🪷',
    coverColor: 'from-orange-100 to-amber-200',
  },
  {
    id: 'bab-2',
    orderIndex: 2,
    title: 'Tri Kaya Parisudha',
    subtitle: 'Tiga perbuatan yang harus disucikan',
    description: 'Mempelajari tiga jenis perbuatan suci: berpikir baik (Manacika), berkata baik (Wacika), dan berbuat baik (Kayika).',
    materialContent: `## Tri Kaya Parisudha

Tri Kaya Parisudha adalah **tiga perbuatan yang harus disucikan** dalam ajaran Hindu:

### 1. Manacika — Berpikir yang Baik 🙏

Pikiran adalah sumber segala perbuatan. **Apa yang kita pikirkan akan tercermin dalam ucapan dan tindakan.**

- Selalu berpikir positif terhadap sesama
- Menghindari iri hati, dengki, dan prasangka buruk
- Mengisi pikiran dengan hal-hal yang bermanfaat

> "Pikiran adalah pelopor, pikiran adalah pemimpin, segala sesuatu diciptakan oleh pikiran." — *Dhammapada*

### 2. Wacika — Berkata yang Baik 🗣️

Ucapan memiliki kekuatan besar. Kata-kata bisa menyembuhkan atau melukai.

- Berkata jujur (*Satya*)
- Berkata lembut dan sopan (*Priya*)
- Berkata yang bermanfaat (*Hita*)
- Menghindari fitnah, gosip, dan kata-kata kasar

### 3. Kayika — Berbuat yang Baik 🤲

Perbuatan nyata yang mencerminkan Dharma. Pikiran baik + ucapan baik harus diwujudkan dalam tindakan.

- Menolong sesama tanpa pamrih
- Menghormati orang tua dan guru
- Menjaga kebersihan lingkungan
- Rajin bersembahyang dan belajar

### Penerapan Tri Kaya Parisudha

| Aspek | Contoh Baik | Contoh Buruk |
|-------|-------------|--------------|
| Manacika | Memaafkan kesalahan teman | Mendendam |
| Wacika | Memberi semangat pada teman | Mengejek |
| Kayika | Membantu membersihkan pura | Merusak fasilitas umum |`,
    materialVideoUrl: null,
    preTest: [
      { id: 'pre2-1', question: 'Tri Kaya Parisudha terdiri dari berapa bagian?', options: ['2', '3', '4', '5'], correctIndex: 1 },
      { id: 'pre2-2', question: 'Manacika berarti?', options: ['Berkata baik', 'Berpikir baik', 'Berbuat baik', 'Berdoa baik'], correctIndex: 1 },
    ],
    tasks: [
      { id: 't2-1', title: 'Jurnal Tri Kaya', description: 'Jawab soal-soal berikut tentang Tri Kaya Parisudha.', dueDate: '2026-06-02', type: 'mcq',
        questions: [
          { id: 't2-1-q1', question: 'Tri Kaya Parisudha mengajarkan penyucian pada tiga hal, yaitu?', options: ['Pikiran, Ucapan, Perbuatan', 'Doa, Puasa, Sedekah', 'Belajar, Bekerja, Beribadah', 'Makan, Minum, Tidur'], correctIndex: 0 },
          { id: 't2-1-q2', question: 'Seorang siswa yang selalu berpikir positif tentang temannya sedang menerapkan?', options: ['Wacika', 'Kayika', 'Manacika', 'Dharma'], correctIndex: 2 },
          { id: 't2-1-q3', question: 'Membantu membersihkan pura termasuk contoh dari?', options: ['Manacika', 'Wacika', 'Kayika', 'Asubha Karma'], correctIndex: 2 },
        ],
        answer: [] },
    ],
    postTestMandatory: [
      { id: 'post2-1', question: '"Manacika" secara bahasa berarti?', options: ['Pikiran yang baik', 'Ucapan yang baik', 'Perbuatan yang baik', 'Doa yang baik'], correctIndex: 0 },
      { id: 'post2-2', question: 'Berkata jujur dalam Hindu disebut?', options: ['Priya', 'Satya', 'Hita', 'Dharma'], correctIndex: 1 },
      { id: 'post2-3', question: 'Yang termasuk contoh Kayika yang baik adalah?', options: ['Menghina teman', 'Menolong membersihkan pura', 'Berbohong pada guru', 'Iri pada teman'], correctIndex: 1 },
      { id: 'post2-4', question: '"Priya" dalam konteks Wacika berarti?', options: ['Berkata jujur', 'Berkata lembut dan sopan', 'Berkata bermanfaat', 'Berkata keras'], correctIndex: 1 },
      { id: 'post2-5', question: 'Mengapa Manacika dianggap paling penting dalam Tri Kaya Parisudha?', options: ['Karena paling mudah', 'Karena pikiran adalah sumber ucapan dan perbuatan', 'Karena paling terlihat', 'Karena paling sulit'], correctIndex: 1 },
    ],
    postTestOptional: null,
    coverEmoji: '💎',
    coverColor: 'from-emerald-100 to-teal-200',
  },
  {
    id: 'bab-3',
    orderIndex: 3,
    title: 'Subha & Asubha Karma',
    subtitle: 'Memahami hukum karma dalam kehidupan',
    description: 'Mengenal perbuatan baik (Subha Karma) dan buruk (Asubha Karma) serta hukum Karma Phala yang mengajarkan setiap perbuatan berbuah.',
    materialContent: `## Subha Karma & Asubha Karma

Dalam ajaran Hindu, setiap perbuatan akan mendatangkan hasil. Ini disebut **Karma Phala** — hukum sebab-akibat universal.

### Subha Karma — Perbuatan Baik 🌸

Perbuatan yang sesuai Dharma, menghasilkan karma baik (*Subha Karma Phala*):

- Menghormati orang tua dan guru (*Guru Susrusa*)
- Menjaga kebersihan dan melestarikan alam
- Rajin belajar dan bersembahyang
- Berkata jujur dan menolong sesama
- Berdana punia (bersedekah)

### Asubha Karma — Perbuatan Buruk ⚠️

Perbuatan yang melanggar Dharma, menghasilkan karma buruk (*Asubha Karma Phala*):

- Berbohong dan mencuri
- Menyakiti makhluk hidup (*Himsa Karma*)
- Malas belajar dan bermalas-malasan
- Merusak alam dan lingkungan
- Menghina dan merendahkan orang lain

### Hukum Karma Phala 📜

> **"Siapa menanam, dia menuai."**

Hukum karma bukan hukuman, melainkan konsekuensi alami. Seperti menanam padi akan tumbuh padi, bukan jagung. Begitu pula perbuatan kita.

### Tiga Jenis Karma Phala

1. **Sancita Karma Phala** — hasil perbuatan masa lalu yang belum dinikmati
2. **Prarabdha Karma Phala** — hasil perbuatan yang sedang dinikmati sekarang
3. **Kriyamana Karma Phala** — hasil perbuatan yang akan dinikmati di masa depan`,
    materialVideoUrl: null,
    preTest: null, // Guru tidak mengaktifkan pre-test untuk bab ini
    tasks: [],
    postTestMandatory: [
      { id: 'post3-1', question: 'Subha Karma berarti?', options: ['Perbuatan buruk', 'Perbuatan baik', 'Perbuatan netral', 'Tidak berbuat'], correctIndex: 1 },
      { id: 'post3-2', question: 'Apa akibat dari Asubha Karma?', options: ['Kelahiran mulia', 'Kebahagiaan', 'Penderitaan', 'Moksha'], correctIndex: 2 },
      { id: 'post3-3', question: 'Menyakiti makhluk hidup dalam Hindu disebut?', options: ['Subha Karma', 'Himsa Karma', 'Karma Phala', 'Tri Kaya'], correctIndex: 1 },
      { id: 'post3-4', question: '"Siapa menanam, dia menuai" merujuk pada hukum?', options: ['Dharma', 'Karma Phala', 'Punarbhawa', 'Moksha'], correctIndex: 1 },
      { id: 'post3-5', question: 'Karma yang sedang dinikmati saat ini disebut?', options: ['Sancita', 'Prarabdha', 'Kriyamana', 'Asubha'], correctIndex: 1 },
    ],
    postTestOptional: {
      instruction: `### Tugas Pengayaan: Mind Map Karma

1. Buat mind map (peta pikiran) tentang Subha & Asubha Karma
2. Bisa digambar tangan lalu difoto, atau dibuat digital (Canva, dll)
3. Mind map harus mencakup:
   - Definisi Subha Karma + 5 contoh
   - Definisi Asubha Karma + 5 contoh
   - 3 jenis Karma Phala
4. Upload ke Google Drive dan **submit link di sini**`,
      answer: [],
    },
    coverEmoji: '⚖️',
    coverColor: 'from-violet-100 to-purple-200',
  },
  {
    id: 'bab-4',
    orderIndex: 4,
    title: 'Tat Twam Asi',
    subtitle: 'Ajaran welas asih dalam Hindu',
    description: 'Memahami makna "Engkau adalah Aku" dari Chandogya Upanishad dan penerapannya dalam toleransi serta kepemimpinan.',
    materialContent: `## Tat Twam Asi — Engkau adalah Aku

**Tat Twam Asi** berasal dari *Chandogya Upanishad*, salah satu kitab suci Hindu. Secara harfiah berarti **"Itu adalah Kamu"** atau **"Engkau adalah Aku"**.

### Makna Filosofis

Semua makhluk pada hakikatnya adalah bagian dari **Brahman** (Tuhan Yang Maha Esa). Tidak ada perbedaan esensial antara aku, kamu, dan makhluk lain.

Jika kita menyakiti orang lain, pada hakikatnya kita menyakiti diri sendiri. Jika kita menolong orang lain, kita menolong diri sendiri.

### Penerapan Tat Twam Asi 🌏

1. **Toleransi Beragama** — menghormati keyakinan orang lain
2. **Anti Diskriminasi** — tidak membeda-bedakan berdasarkan suku, agama, ras
3. **Empati** — merasakan penderitaan sesama dan terdorong menolong
4. **Kerukunan** — menjaga kedamaian di sekolah, rumah, dan masyarakat

### Ajaran Kepemimpinan dari Itihasa 👑

#### Rama — Pemimpin yang Berkorban
Dalam Ramayana, Rama rela meninggalkan istana dan hidup di hutan selama 14 tahun demi menepati janji ayahnya. Pemimpin sejati mengutamakan kebenaran di atas kenyamanan pribadi.

#### Yudhistira — Pemimpin Dharma
Dalam Mahabharata, Yudhistira memimpin dengan berpegang teguh pada Dharma. Ia tidak pernah berbohong dan selalu mengutamakan keadilan, bahkan di tengah perang.

### Refleksi

> "Jika kamu ingin orang lain memperlakukanmu dengan baik, perlakukanlah mereka dengan baik terlebih dahulu."`,
    materialVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    preTest: [
      { id: 'pre4-1', question: '"Tat Twam Asi" berasal dari kitab?', options: ['Bhagavad Gita', 'Chandogya Upanishad', 'Ramayana', 'Manawa Dharmasastra'], correctIndex: 1 },
    ],
    tasks: [
      { id: 't4-1', title: 'Esai Mini: Tat Twam Asi', description: 'Jawab soal-soal berikut tentang ajaran Tat Twam Asi.', dueDate: '2026-06-04', type: 'mcq',
        questions: [
          { id: 't4-1-q1', question: '"Tat Twam Asi" secara harfiah berarti?', options: ['Aku adalah Brahman', 'Engkau adalah Aku', 'Kebenaran pasti menang', 'Hidup adalah penderitaan'], correctIndex: 1 },
          { id: 't4-1-q2', question: 'Ajaran Tat Twam Asi mengajarkan kita untuk?', options: ['Bersaing dengan orang lain', 'Melihat diri sendiri dalam diri orang lain', 'Menghindari pergaulan', 'Mencari kekayaan'], correctIndex: 1 },
          { id: 't4-1-q3', question: 'Jika kita menyakiti orang lain, menurut Tat Twam Asi artinya?', options: ['Tidak apa-apa', 'Kita menyakiti diri sendiri', 'Itu hak kita', 'Itu karma mereka'], correctIndex: 1 },
        ],
        answer: [] },
    ],
    postTestMandatory: [
      { id: 'post4-1', question: 'Arti harfiah "Tat Twam Asi" adalah?', options: ['Aku adalah Brahman', 'Engkau adalah Aku', 'Kebenaran pasti menang', 'Hidup adalah penderitaan'], correctIndex: 1 },
      { id: 'post4-2', question: 'Dalam Ramayana, siapa yang rela berkorban meninggalkan istana demi janji?', options: ['Laksmana', 'Bharata', 'Rama', 'Hanuman'], correctIndex: 2 },
      { id: 'post4-3', question: 'Yudhistira dikenal sebagai pemimpin yang?', options: ['Gagah berani', 'Kaya raya', 'Berpegang pada Dharma', 'Sakti mandraguna'], correctIndex: 2 },
      { id: 'post4-4', question: 'Penerapan Tat Twam Asi dalam kehidupan sehari-hari adalah?', options: ['Bersaing dengan teman', 'Menghormati semua orang tanpa memandang perbedaan', 'Mementingkan diri sendiri', 'Menghindari interaksi sosial'], correctIndex: 1 },
      { id: 'post4-5', question: 'Mengapa Tat Twam Asi penting untuk toleransi beragama?', options: ['Karena memaksa semua beragama sama', 'Karena mengajarkan bahwa semua manusia adalah bagian dari Brahman', 'Karena melarang beribadah', 'Karena mengajarkan satu agama'], correctIndex: 1 },
    ],
    postTestOptional: {
      instruction: `### Tugas Pengayaan: Video Drama Pendek

1. Bersama 2-3 teman, buat video drama pendek (2-3 menit) tentang penerapan Tat Twam Asi
2. Contoh tema: toleransi di sekolah, menolong tanpa memandang perbedaan
3. Upload ke YouTube (unlisted)
4. **Submit link video di sini**`,
      answer: [],
    },
    coverEmoji: '🕉️',
    coverColor: 'from-rose-100 to-pink-200',
  },
  {
    id: 'bab-5',
    orderIndex: 5,
    title: 'Catur Guru',
    subtitle: 'Empat guru dalam kehidupan',
    description: 'Mengenal empat guru yang wajib dihormati: Guru Rupaka (orang tua), Guru Pengajian (guru sekolah), Guru Wisesa (pemerintah), dan Guru Swadyaya (Tuhan).',
    materialContent: `## Catur Guru — Empat Guru Kehidupan

**Catur** berarti empat, **Guru** berarti yang patut dihormati. Catur Guru adalah ajaran tentang empat sosok yang wajib kita hormati dalam hidup.

---

### 1. Guru Rupaka — Orang Tua 👨‍👩‍👧

Orang tua adalah guru pertama dan utama. Mereka yang melahirkan, membesarkan, dan mendidik kita dengan penuh kasih sayang.

**Kewajiban kita:**
- Hormat dan patuh pada orang tua
- Membantu pekerjaan rumah
- Belajar dengan rajin — membanggakan mereka
- Merawat mereka di masa tua

---

### 2. Guru Pengajian — Guru Sekolah 📚

Guru di sekolah yang memberikan ilmu pengetahuan dan membimbing kita menjadi manusia yang cerdas dan berkarakter.

**Kewajiban kita:**
- Menghormati dan mendengarkan guru
- Mengerjakan tugas tepat waktu
- Tidak menyontek atau berbuat curang
- Menjaga nama baik sekolah

---

### 3. Guru Wisesa — Pemerintah 🏛️

Pemerintah dan pemimpin yang menciptakan ketertiban, keamanan, dan kesejahteraan masyarakat.

**Kewajiban kita:**
- Mematuhi peraturan yang berlaku
- Membayar iuran sekolah tepat waktu
- Ikut menjaga ketertiban lingkungan
- Menggunakan fasilitas umum dengan baik

---

### 4. Guru Swadyaya — Tuhan Yang Maha Esa 🌟

Tuhan sebagai guru tertinggi, sumber segala pengetahuan dan kebijaksanaan.

**Kewajiban kita:**
- Rajin bersembahyang
- Mempelajari kitab suci
- Menjalankan ajaran Dharma
- Percaya pada kekuasaan-Nya`,
    materialVideoUrl: null,
    preTest: null,
    tasks: [],
    postTestMandatory: [
      { id: 'post5-1', question: '"Catur" dalam Catur Guru berarti?', options: ['Dua', 'Tiga', 'Empat', 'Lima'], correctIndex: 2 },
      { id: 'post5-2', question: 'Orang tua termasuk dalam kategori Guru?', options: ['Guru Pengajian', 'Guru Rupaka', 'Guru Wisesa', 'Guru Swadyaya'], correctIndex: 1 },
      { id: 'post5-3', question: 'Pemerintah termasuk dalam kategori?', options: ['Guru Rupaka', 'Guru Pengajian', 'Guru Wisesa', 'Guru Swadyaya'], correctIndex: 2 },
      { id: 'post5-4', question: 'Siapa Guru tertinggi dalam ajaran Catur Guru?', options: ['Orang tua', 'Guru sekolah', 'Pemerintah', 'Tuhan Yang Maha Esa (Guru Swadyaya)'], correctIndex: 3 },
      { id: 'post5-5', question: 'Apa kewajiban murid terhadap Guru Pengajian?', options: ['Memberi uang', 'Menghormati dan mendengarkan', 'Mengabaikan nasihat', 'Tidak perlu datang ke sekolah'], correctIndex: 1 },
    ],
    postTestOptional: null,
    coverEmoji: '👨‍🏫',
    coverColor: 'from-sky-100 to-blue-200',
  },
  {
    id: 'bab-6',
    orderIndex: 6,
    title: 'Kepemimpinan Asta Brata',
    subtitle: 'Delapan sifat pemimpin ideal',
    description: 'Mempelajari delapan sifat kepemimpinan berdasarkan sifat-sifat Dewa: Indra, Yama, Surya, Candra, Bayu, Kuwera, Baruna, dan Agni.',
    materialContent: `## Asta Brata — Delapan Sifat Kepemimpinan Hindu

**Asta Brata** adalah ajaran kepemimpinan Hindu yang mengajarkan delapan sifat ideal seorang pemimpin. Ajaran ini disampaikan oleh Rama kepada Wibhisana setelah perang Ramayana usai.

Masing-masing sifat diambil dari karakter Dewa:

---

### 1. Indra Brata ☔ — Kemakmuran

Seperti Dewa Indra yang menurunkan hujan untuk kesuburan, pemimpin harus **mensejahterakan rakyatnya**. Pemimpin yang baik memastikan semua orang di bawah tanggung jawabnya hidup layak.

---

### 2. Yama Brata ⚖️ — Keadilan

Seperti Dewa Yama yang adil menghakimi tanpa pandang bulu, pemimpin harus **adil dan tidak memihak**. Semua orang diperlakukan sama di depan aturan.

---

### 3. Surya Brata ☀️ — Penerang

Seperti Surya yang menerangi dunia tanpa pamrih, pemimpin harus menjadi **sumber pencerahan** — memberikan ilmu, bimbingan, dan inspirasi dengan ketulusan.

---

### 4. Candra Brata 🌙 — Kesejukan

Seperti bulan yang memberikan kesejukan di malam hari, pemimpin harus **menenangkan dan memberi harapan** di saat sulit.

---

### 5. Bayu Brata 💨 — Ketegasan

Seperti angin yang bisa halus namun juga bisa dahsyat, pemimpin harus bisa **lembut namun tegas** pada saat yang tepat.

---

### 6. Kuwera Brata 💰 — Kemurahan Hati

Seperti Kuwera (Dewa kekayaan) yang dermawan, pemimpin harus **murah hati** — tidak kikir dalam berbagi ilmu, waktu, dan bantuan.

---

### 7. Baruna Brata 🌊 — Ketangguhan

Seperti lautan yang luas dan tangguh, pemimpin harus **berwawasan luas dan tidak mudah goyah** menghadapi masalah.

---

### 8. Agni Brata 🔥 — Semangat Membara

Seperti api yang membakar habis dan tidak bisa ditipu oleh apapun, pemimpin harus **bersemangat, jujur, dan tidak korupsi**. Api juga membersihkan — pemimpin membersihkan dari keburukan.`,
    materialVideoUrl: null,
    preTest: null,
    tasks: [
      { id: 't6-1', title: 'Pemimpin Idolaku', description: 'Jawab soal-soal berikut tentang Asta Brata.', dueDate: '2026-06-07', type: 'mcq',
        questions: [
          { id: 't6-1-q1', question: 'Berapa jumlah sifat dalam Asta Brata?', options: ['Lima', 'Enam', 'Delapan', 'Sepuluh'], correctIndex: 2 },
          { id: 't6-1-q2', question: 'Sifat yang mengajarkan pemimpin menjadi penyejuk seperti hujan adalah?', options: ['Agni Brata', 'Indra Brata', 'Yama Brata', 'Surya Brata'], correctIndex: 1 },
          { id: 't6-1-q3', question: 'Agni Brata mengajarkan pemimpin untuk?', options: ['Bermalas-malasan', 'Berani memberantas kejahatan', 'Menghindari masalah', 'Mencari kekayaan'], correctIndex: 1 },
        ],
        answer: [] },
    ],
    postTestMandatory: [
      { id: 'post6-1', question: 'Asta Brata berarti?', options: ['Lima sifat', 'Enam sifat', 'Delapan sifat', 'Sepuluh sifat'], correctIndex: 2 },
      { id: 'post6-2', question: 'Asta Brata diajarkan oleh Rama kepada?', options: ['Laksmana', 'Wibhisana', 'Hanuman', 'Bharata'], correctIndex: 1 },
      { id: 'post6-3', question: 'Sifat keadilan diambil dari Dewa?', options: ['Indra', 'Surya', 'Yama', 'Agni'], correctIndex: 2 },
      { id: 'post6-4', question: 'Agni Brata mengajarkan pemimpin untuk?', options: ['Bermalas-malasan', 'Bersemangat dan jujur', 'Berpura-pura', 'Menghindari tanggung jawab'], correctIndex: 1 },
      { id: 'post6-5', question: 'Baruna Brata mengajarkan pemimpin untuk?', options: ['Mudah menyerah', 'Tangguh dan berwawasan luas', 'Pendendam', 'Takut menghadapi masalah'], correctIndex: 1 },
    ],
    postTestOptional: {
      instruction: `### Tugas Pengayaan: Infografis Asta Brata

1. Buat infografis tentang 8 sifat Asta Brata
2. Setiap sifat: nama dewa, arti, dan ikon sederhana
3. Bisa dibuat dengan Canva, PPT, atau gambar tangan
4. Upload hasilnya ke Google Drive
5. **Submit link di sini**`,
      answer: [],
    },
    coverEmoji: '👑',
    coverColor: 'from-amber-100 to-yellow-200',
  },
];

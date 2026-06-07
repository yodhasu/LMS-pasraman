-- RESEED: Hapus semua materials lama, insert baru sesuai format 1 video + 1 text + 1 PDF

BEGIN;

-- Hapus semua materials (material_progress kosong, FK aman)
DELETE FROM chapter_materials;

-- ===== BAB 1: Pengantar Susila Hindu =====
INSERT INTO chapter_materials (chapter_id, section_order, type, content, caption)
VALUES
  ('bab-1', 0, 'embed',
   '<iframe width="560" height="315" src="https://www.youtube.com/embed/DDkCA0lFgzI" title="Etika Atau Tata Susila Dalam Agama Hindu" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
   'Video: Etika Atau Tata Susila Dalam Agama Hindu'),

  ('bab-1', 1, 'text',
   '## Apa itu Susila?

Susila berasal dari bahasa Sanskerta: **Su** (baik) dan **Sila** (perilaku). Jadi Susila berarti **perilaku yang baik** atau budi pekerti luhur. Dalam ajaran Hindu, Susila adalah salah satu dari Tiga Kerangka Agama Hindu, bersama dengan Tatwa (filsafat) dan Upacara (ritual).

### Mengapa Susila Penting?

1. **Membentuk karakter mulia** — menuntun manusia untuk hidup sesuai Dharma
2. **Hubungan harmonis** — dengan sesama, alam, dan Tuhan (Tri Hita Karana)
3. **Landasan moral** — membedakan perbuatan baik (Subha Karma) dan buruk (Asubha Karma)

### Sumber Ajaran Susila

- **Weda Sruti** — wahyu suci yang didengar para Rsi
- **Weda Smrti** — kitab yang diingat dan diturunkan, seperti Ramayana, Mahabharata, Bhagavad Gita
- **Sarasamusccaya** — kumpulan 511 sloka tentang ajaran moral
- **Kitab Niti Sastra** — pedoman kepemimpinan dan budi pekerti

### Penerapan Sehari-hari

Susila bukan hanya teori. Setiap hari kita dihadapkan pada pilihan: membantu atau mengabaikan, berkata jujur atau bohong, bersabar atau marah. Ajaran Susila memberi panduan agar setiap pilihan membawa kebaikan bagi diri sendiri dan orang lain. Dengan menerapkan Susila, kita sedang membangun peradaban yang lebih bermoral dan berbudaya.',

  ('bab-1', 2, 'embed',
   '<iframe src="https://parisada.or.id/wp-content/uploads/2022/08/Sarasamuccaya-Terbitan-Ditjen-Bimas-Hindu-2021.pdf" width="100%" height="600px" style="border:none;"></iframe>',
   'Kitab Sarasamusccaya — 511 sloka tentang ajaran moral Hindu');

-- ===== BAB 2: Tri Kaya Parisudha =====
INSERT INTO chapter_materials (chapter_id, section_order, type, content, caption)
VALUES
  ('bab-2', 0, 'embed',
   '<iframe width="560" height="315" src="https://www.youtube.com/embed/CU9Lyke6hPg" title="Tri Kaya Parisudha - Video Pembelajaran Agama Hindu" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
   'Video: Tri Kaya Parisudha'),

  ('bab-2', 1, 'text',
   '## Tri Kaya Parisudha

Tri Kaya Parisudha adalah **tiga perbuatan yang harus disucikan** dalam ajaran Hindu. *Tri* berarti tiga, *Kaya* berarti perbuatan, *Parisudha* berarti menyucikan. Konsep ini mengajarkan bahwa manusia memiliki tiga dimensi perbuatan yang harus dikendalikan dan disucikan.

### 1. Manacika — Berpikir yang Baik

Pikiran adalah sumber segala perbuatan. **Apa yang kita pikirkan akan memengaruhi perkataan dan tindakan kita.** Contoh berpikir baik: niat membantu orang lain, berpikir positif dalam menghadapi masalah, menghargai perbedaan. Pikiran yang bersih menghasilkan kata-kata dan perbuatan yang bersih pula.

### 2. Wacika — Berkata yang Baik

Ucapan memiliki kekuatan besar. Kata-kata bisa menyembuhkan atau melukai. Ajaran Wacika mengajarkan: berkata jujur, tidak berkata kasar, tidak memfitnah, tidak bergosip, dan menggunakan kata-kata yang membangun. Dalam Sarasamusccaya disebutkan bahwa lidah yang tidak terkendali adalah sumber dari banyak kesengsaraan.

### 3. Kayika — Berbuat yang Baik

Perbuatan nyata yang mencerminkan Dharma. Pikiran yang baik dan ucapan yang baik harus diwujudkan dalam tindakan nyata seperti: membantu sesama, bekerja dengan jujur, tidak menyakiti makhluk hidup (Ahimsa), dan menjalankan kewajiban sesuai Dharma masing-masing.

### Refleksi

Tri Kaya Parisudha adalah panduan hidup yang relevan di era modern. Dengan menyucikan pikiran, perkataan, dan perbuatan, kita dapat menciptakan kehidupan yang harmonis dan bermakna. **Om Santih, Santih, Santih Om.**',

  ('bab-2', 2, 'embed',
   '<iframe src="https://parisada.or.id/wp-content/uploads/2022/08/Isi-buku-Dharmika-REV-1.pdf" width="100%" height="600px" style="border:none;"></iframe>',
   'Buku Hindu Bagi Pemula (Dhārmika) — dari Parisada Hindu Dharma Indonesia');

-- ===== BAB 3: Subha & Asubha Karma =====
INSERT INTO chapter_materials (chapter_id, section_order, type, content, caption)
VALUES
  ('bab-3', 0, 'embed',
   '<iframe width="560" height="315" src="https://www.youtube.com/embed/st5rDxZzdNg" title="Subha Asubha Karma - Merdeka Belajar Agama Hindu Kelas IV" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
   'Video: Subha Asubha Karma'),

  ('bab-3', 1, 'text',
   '## Subha & Asubha Karma

Dalam ajaran Hindu, setiap perbuatan akan mendatangkan hasil. **Subha Karma** adalah perbuatan baik yang menghasilkan buah baik, sedangkan **Asubha Karma** adalah perbuatan buruk yang menghasilkan buah buruk. Inilah hukum **Karma Phala** yang mengajarkan bahwa setiap sebab pasti ada akibat.

### Subha Karma — Perbuatan Baik

Perbuatan yang sesuai Dharma, menghasilkan karma baik:
- **Dāna** (berderma) — memberi tanpa pamrih
- **Daya** (welas asih) — memiliki rasa kasih kepada sesama makhluk
- **Ahimsa** — tidak menyakiti makhluk hidup
- **Satya** — jujur dan setia pada kebenaran
- **Yajna** — berkorban dan berbagi dengan tulus

### Asubha Karma — Perbuatan Buruk

Perbuatan yang melanggar Dharma, menghasilkan karma buruk:
- **Himsā** — menyakiti dan membunuh makhluk hidup
- **Mithyā** — berbohong dan menipu
- **Steya** — mencuri dan mengambil milik orang lain
- **Mada** — mabuk dan kehilangan kesadaran
- **Krodha** — marah yang tidak terkendali

### Hukum Karma Phala

> *"Siapa menanam, dia menuai."*

Hukum karma bukan hukuman, melainkan hukum alam semesta yang adil. Karma Phala dibagi menjadi tiga jenis berdasarkan waktu penerimaan buahnya:

1. **Sancita Karma Phala** — hasil perbuatan masa lalu yang masih tersimpan dan akan dinikmati di kehidupan mendatang
2. **Prarabdha Karma Phala** — hasil perbuatan yang dinikmati sekarang, akibat perbuatan di kehidupan sebelumnya
3. **Kriyamana Karma Phala** — hasil perbuatan yang sedang dilakukan sekarang dan akan dinikmati di masa depan

### Refleksi

Setiap tindakan yang kita lakukan hari ini adalah benih untuk masa depan. Dengan memahami Subha dan Asubha Karma, kita dapat memilih jalan Dharma dalam setiap langkah kehidupan.',

  ('bab-3', 2, 'embed',
   '<iframe src="https://parisada.or.id/wp-content/uploads/2022/08/Sarasamuccaya-Terbitan-Ditjen-Bimas-Hindu-2021.pdf" width="100%" height="600px" style="border:none;"></iframe>',
   'Kitab Sarasamusccaya — 511 sloka tentang ajaran moral Hindu');

-- ===== BAB 4: Tat Twam Asi =====
INSERT INTO chapter_materials (chapter_id, section_order, type, content, caption)
VALUES
  ('bab-4', 0, 'embed',
   '<iframe width="560" height="315" src="https://www.youtube.com/embed/t6p1uvdHWPg" title="Tat Twam Asi - Agama Hindu Kelas 6 SD" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
   'Video: Tat Twam Asi Sebagai Ajaran Kesusilaan Hindu'),

  ('bab-4', 1, 'text',
   '## Tat Twam Asi — Engkau adalah Aku

**Tat Twam Asi** berasal dari *Chandogya Upanishad* yang berarti **"Engkau adalah Aku"** atau **"Itu adalah dirimu"**. Ajaran ini merupakan Maha Vakya (sabda agung) dalam filsafat Hindu yang mengajarkan kesatuan semua makhluk. Tat Twam Asi mengajarkan bahwa pada hakikatnya semua makhluk adalah satu — bagian dari Brahman yang sama.

### Makna Filosofis

Semua makhluk pada hakikatnya adalah bagian dari **Brahman** (Tuhan Yang Maha Esa). Ketika kita menyakiti orang lain, sejatinya kita menyakiti diri sendiri. Ketika kita membantu orang lain, kita juga membantu diri sendiri. Inilah dasar dari konsep **Vasudhaiva Kutumbakam** — seluruh dunia adalah satu keluarga.

### Penerapan Tat Twam Asi

1. **Toleransi Beragama** — menghormati keyakinan orang lain karena semua adalah ciptaan Tuhan
2. **Empati dan Peduli** — merasakan penderitaan orang lain dan tergerak membantu
3. **Anti Diskriminasi** — tidak membeda-bedakan suku, agama, ras, dan golongan
4. **Gotong Royong** — bekerja sama dan saling membantu dalam kehidupan bermasyarakat

### Refleksi

> *"Jika kamu ingin orang lain memperlakukanmu dengan baik, perlakukanlah mereka dengan baik pula."*

Tat Twam Asi adalah fondasi moral yang mengajarkan cinta kasih universal. Dalam kehidupan sehari-hari, ajaran ini mengingatkan kita bahwa kebahagiaan sejati tidak bisa dicapai sendiri — kita harus saling menjaga dan mengasihi.',

  ('bab-4', 2, 'embed',
   '<iframe src="https://parisada.or.id/wp-content/uploads/2022/08/Isi-buku-Dharmika-REV-1.pdf" width="100%" height="600px" style="border:none;"></iframe>',
   'Buku Hindu Bagi Pemula (Dhārmika) — dari Parisada Hindu Dharma Indonesia');

-- ===== BAB 5: Catur Guru =====
INSERT INTO chapter_materials (chapter_id, section_order, type, content, caption)
VALUES
  ('bab-5', 0, 'embed',
   '<iframe width="560" height="315" src="https://www.youtube.com/embed/0uVxMhl3zCU" title="Catur Guru - Pelajaran Agama Hindu Kelas 5 SD" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
   'Video: Catur Guru'),

  ('bab-5', 1, 'text',
   '## Apa itu Catur Guru?

**Catur** berarti empat, **Guru** berarti yang patut dihormati dan dijadikan panutan. Catur Guru adalah **empat guru yang wajib dihormati** dalam ajaran Hindu. Guru berasal dari kata *Gu* (kegelapan) dan *Ru* (penerangan), jadi guru berarti penghilang kegelapan menuju pencerahan.

### 1. Guru Rupaka — Orang Tua

Orang tua adalah guru pertama dan utama. Mereka yang melahirkan, merawat, dan mendidik kita sejak kecil. Bentuk hormat kepada Guru Rupaka: berbakti kepada orang tua, mendengarkan nasihat mereka, merawat mereka di usia senja, dan tidak menyakiti hati mereka.

### 2. Guru Pengajian — Guru Sekolah

Guru di sekolah yang memberikan ilmu pengetahuan dan membimbing kita menjadi pribadi yang cerdas dan berkarakter. Bentuk hormat kepada Guru Pengajian: belajar dengan tekun, menghormati dan mendengarkan saat mengajar, serta menerapkan ilmu yang diberikan.

### 3. Guru Wisesa — Pemerintah

Pemerintah dan pemimpin yang menciptakan ketertiban dan kesejahteraan masyarakat. Bentuk hormat kepada Guru Wisesa: mematuhi peraturan dan hukum, membayar pajak, mengikuti pemilu, serta berpartisipasi dalam pembangunan negara.

### 4. Guru Swadyaya — Tuhan Yang Maha Esa

Tuhan sebagai guru tertinggi, sumber segala pengetahuan dan kebijaksanaan. Bentuk hormat kepada Guru Swadyaya: rajin beribadah, berdoa, menjalankan ajaran agama, dan bersyukur atas segala anugerah-Nya.',

  ('bab-5', 2, 'embed',
   '<iframe src="https://parisada.or.id/wp-content/uploads/2022/08/Sarasamuccaya-Terbitan-Ditjen-Bimas-Hindu-2021.pdf" width="100%" height="600px" style="border:none;"></iframe>',
   'Kitab Sarasamusccaya — 511 sloka tentang ajaran moral Hindu');

-- ===== BAB 6: Kepemimpinan Asta Brata =====
INSERT INTO chapter_materials (chapter_id, section_order, type, content, caption)
VALUES
  ('bab-6', 0, 'embed',
   '<iframe width="560" height="315" src="https://www.youtube.com/embed/d2zy1Ij93g8" title="Kepemimpinan Hindu Asta Brata" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
   'Video: Kepemimpinan Hindu (Asta Brata)'),

  ('bab-6', 1, 'text',
   '## Asta Brata — Delapan Sifat Kepemimpinan

**Asta Brata** adalah ajaran kepemimpinan dalam Hindu yang terdiri dari delapan sifat pemimpin ideal, berdasarkan sifat-sifat para Dewa. Ajaran ini terdapat dalam Itihasa Ramayana, diajarkan oleh Sri Rama kepada Wibhisana.

### 1. Indra Brata — Kemakmuran (Dewa Indra)
Seperti Indra yang menurunkan hujan untuk kesejahteraan bumi, pemimpin harus menghadirkan kemakmuran bagi rakyatnya.

### 2. Yama Brata — Keadilan (Dewa Yama)
Seperti Yama yang adil menghakimi tanpa pandang bulu, pemimpin harus tegas dan adil dalam mengambil keputusan.

### 3. Surya Brata — Penerang (Dewa Surya)
Seperti Surya yang menerangi dunia tanpa pamrih, pemimpin harus menjadi teladan dan inspirasi bagi yang dipimpin.

### 4. Candra Brata — Kesejukan (Dewa Candra)
Seperti bulan yang memberikan kesejukan, pemimpin harus bersikap lembut, meneduhkan, dan mudah didekati rakyat.

### 5. Bayu Brata — Ketegasan (Dewa Bayu)
Seperti angin yang bisa halus namun dahsyat, pemimpin harus memiliki ketegasan prinsip tanpa kehilangan kebijaksanaan.

### 6. Kuwera Brata — Kemurahan Hati (Dewa Kuwera)
Seperti Kuwera yang dermawan, pemimpin harus murah hati, tidak serakah, dan mengutamakan kesejahteraan bersama.

### 7. Baruna Brata — Ketangguhan (Dewa Baruna)
Seperti lautan yang luas dan tangguh, pemimpin harus berwawasan luas, sabar, dan tidak mudah goyah.

### 8. Agni Brata — Semangat Membara (Dewa Agni)
Seperti api yang membakar habis, pemimpin harus memiliki semangat juang tinggi, berani memberantas ketidakadilan, dan pantang menyerah.',

  ('bab-6', 2, 'embed',
   '<iframe src="https://parisada.or.id/wp-content/uploads/2022/08/Isi-buku-Dharmika-REV-1.pdf" width="100%" height="600px" style="border:none;"></iframe>',
   'Buku Hindu Bagi Pemula (Dhārmika) — dari Parisada Hindu Dharma Indonesia');

COMMIT;

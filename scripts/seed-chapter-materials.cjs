// Seed chapter_materials by splitting the old material_content into sections
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const sections = {
  'bab-1': [
    { title: 'Apa itu Susila?', content: 'Susila berasal dari bahasa Sanskerta: **Su** (baik) dan **Sila** (perilaku). Susila adalah ajaran tentang tingkah laku yang baik dan benar sesuai Dharma.' },
    { title: 'Mengapa Mempelajari Susila Penting?', content: '1. **Membentuk karakter mulia** — menuntun kita menjadi pribadi yang berakhlak\n2. **Hidup selaras dengan Dharma** — membedakan yang benar dan salah\n3. **Subha & Asubha Karma** — memahami bahwa setiap perbuatan berbuah' },
    { title: 'Sumber Ajaran Susila', content: '- **Weda Sruti** — wahyu suci yang didengar para Rsi\n- **Weda Smerti** — kitab hukum seperti Manawa Dharmasastra\n- **Itihasa** — Ramayana & Mahabharata (khususnya Bhagavad Gita)' },
    { title: 'Penerapan Sehari-hari', content: 'Susila bukan hanya teori. Setiap hari kita dihadapkan pada pilihan:\n- Berkata jujur atau berbohong\n- Menolong teman atau bersikap acuh\n- Menghormati orang tua atau membantah\n\nPilihan-pilihan kecil inilah yang membentuk karma kita.' },
  ],
  'bab-2': [
    { title: 'Tri Kaya Parisudha', content: 'Tri Kaya Parisudha adalah **tiga perbuatan yang harus disucikan** dalam ajaran Hindu: berpikir baik (Manacika), berkata baik (Wacika), dan berbuat baik (Kayika).' },
    { title: 'Manacika — Berpikir yang Baik', content: 'Pikiran adalah sumber segala perbuatan. **Apa yang kita pikirkan akan tercermin dalam ucapan dan tindakan.**\n\n- Selalu berpikir positif terhadap sesama\n- Menghindari iri hati, dengki, dan prasangka buruk\n- Mengisi pikiran dengan hal-hal yang bermanfaat\n\n> "Pikiran adalah pelopor, pikiran adalah pemimpin, segala sesuatu diciptakan oleh pikiran." — *Dhammapada*' },
    { title: 'Wacika — Berkata yang Baik', content: 'Ucapan memiliki kekuatan besar. Kata-kata bisa menyembuhkan atau melukai.\n\n- Berkata jujur (*Satya*)\n- Berkata lembut dan sopan (*Priya*)\n- Berkata yang bermanfaat (*Hita*)\n- Menghindari fitnah, gosip, dan kata-kata kasar' },
    { title: 'Kayika — Berbuat yang Baik', content: 'Perbuatan nyata yang mencerminkan Dharma. Pikiran baik + ucapan baik harus diwujudkan dalam tindakan.\n\n- Menolong sesama tanpa pamrih\n- Menghormati orang tua dan guru\n- Menjaga kebersihan lingkungan\n- Rajin bersembahyang dan belajar' },
  ],
  'bab-3': [
    { title: 'Subha & Asubha Karma', content: 'Dalam ajaran Hindu, setiap perbuatan akan mendatangkan hasil. Ini disebut **Karma Phala** — hukum sebab-akibat universal.' },
    { title: 'Subha Karma — Perbuatan Baik', content: 'Perbuatan yang sesuai Dharma, menghasilkan karma baik (*Subha Karma Phala*):\n\n- Menghormati orang tua dan guru (*Guru Susrusa*)\n- Menjaga kebersihan dan melestarikan alam\n- Rajin belajar dan bersembahyang\n- Berkata jujur dan menolong sesama\n- Berdana punia (bersedekah)' },
    { title: 'Asubha Karma — Perbuatan Buruk', content: 'Perbuatan yang melanggar Dharma, menghasilkan karma buruk (*Asubha Karma Phala*):\n\n- Berbohong dan mencuri\n- Menyakiti makhluk hidup (*Himsa Karma*)\n- Malas belajar dan bermalas-malasan\n- Merusak alam dan lingkungan\n- Menghina dan merendahkan orang lain' },
    { title: 'Hukum Karma Phala', content: '> **"Siapa menanam, dia menuai."**\n\nHukum karma bukan hukuman, melainkan konsekuensi alami. Seperti menanam padi akan tumbuh padi, bukan jagung. Begitu pula perbuatan kita.' },
    { title: 'Tiga Jenis Karma Phala', content: '1. **Sancita Karma Phala** — hasil perbuatan masa lalu yang belum dinikmati\n2. **Prarabdha Karma Phala** — hasil perbuatan yang sedang dinikmati sekarang\n3. **Kriyamana Karma Phala** — hasil perbuatan yang akan dinikmati di masa depan' },
  ],
  'bab-4': [
    { title: 'Tat Twam Asi — Engkau adalah Aku', content: '**Tat Twam Asi** berasal dari *Chandogya Upanishad*, salah satu kitab suci Hindu. Secara harfiah berarti **"Itu adalah Kamu"** atau **"Engkau adalah Aku"**.' },
    { title: 'Makna Filosofis', content: 'Semua makhluk pada hakikatnya adalah bagian dari **Brahman** (Tuhan Yang Maha Esa). Tidak ada perbedaan esensial antara aku, kamu, dan makhluk lain.\n\nJika kita menyakiti orang lain, pada hakikatnya kita menyakiti diri sendiri. Jika kita menolong orang lain, kita menolong diri sendiri.' },
    { title: 'Penerapan Tat Twam Asi', content: '1. **Toleransi Beragama** — menghormati keyakinan orang lain\n2. **Anti Diskriminasi** — tidak membeda-bedakan berdasarkan suku, agama, ras\n3. **Empati** — merasakan penderitaan sesama dan terdorong menolong\n4. **Kerukunan** — menjaga kedamaian di sekolah, rumah, dan masyarakat' },
    { title: 'Ajaran Kepemimpinan dari Itihasa', content: '**Rama — Pemimpin yang Berkorban**\nDalam Ramayana, Rama rela meninggalkan istana dan hidup di hutan selama 14 tahun demi menepati janji ayahnya. Pemimpin sejati mengutamakan kebenaran di atas kenyamanan pribadi.\n\n**Yudhistira — Pemimpin Dharma**\nDalam Mahabharata, Yudhistira memimpin dengan berpegang teguh pada Dharma. Ia tidak pernah berbohong dan selalu mengutamakan keadilan, bahkan di tengah perang.' },
    { title: 'Refleksi', content: '> "Jika kamu ingin orang lain memperlakukanmu dengan baik, perlakukanlah mereka dengan baik terlebih dahulu."' },
  ],
  'bab-5': [
    { title: 'Apa itu Catur Guru?', content: '**Catur** berarti empat, **Guru** berarti yang patut dihormati. Catur Guru adalah ajaran tentang empat sosok yang wajib kita hormati dalam hidup.' },
    { title: 'Guru Rupaka — Orang Tua', content: 'Orang tua adalah guru pertama dan utama. Mereka yang melahirkan, membesarkan, dan mendidik kita dengan penuh kasih sayang.\n\n**Kewajiban kita:**\n- Hormat dan patuh pada orang tua\n- Membantu pekerjaan rumah\n- Belajar dengan rajin — membanggakan mereka\n- Merawat mereka di masa tua' },
    { title: 'Guru Pengajian — Guru Sekolah', content: 'Guru di sekolah yang memberikan ilmu pengetahuan dan membimbing kita menjadi manusia yang cerdas dan berkarakter.\n\n**Kewajiban kita:**\n- Menghormati dan mendengarkan guru\n- Mengerjakan tugas tepat waktu\n- Tidak menyontek atau berbuat curang\n- Menjaga nama baik sekolah' },
    { title: 'Guru Wisesa — Pemerintah', content: 'Pemerintah dan pemimpin yang menciptakan ketertiban, keamanan, dan kesejahteraan masyarakat.\n\n**Kewajiban kita:**\n- Mematuhi peraturan yang berlaku\n- Membayar iuran sekolah tepat waktu\n- Ikut menjaga ketertiban lingkungan\n- Menggunakan fasilitas umum dengan baik' },
    { title: 'Guru Swadyaya — Tuhan Yang Maha Esa', content: 'Tuhan sebagai guru tertinggi, sumber segala pengetahuan dan kebijaksanaan.\n\n**Kewajiban kita:**\n- Rajin bersembahyang\n- Mempelajari kitab suci\n- Menjalankan ajaran Dharma\n- Percaya pada kekuasaan-Nya' },
  ],
  'bab-6': [
    { title: 'Asta Brata — Delapan Sifat Kepemimpinan', content: '**Asta Brata** adalah ajaran kepemimpinan Hindu yang mengajarkan delapan sifat ideal seorang pemimpin. Ajaran ini disampaikan oleh Rama kepada Wibhisana setelah perang Ramayana usai.\n\nMasing-masing sifat diambil dari karakter Dewa:' },
    { title: 'Indra Brata — Kemakmuran', content: 'Seperti Dewa Indra yang menurunkan hujan untuk kesuburan, pemimpin harus **mensejahterakan rakyatnya**. Pemimpin yang baik memastikan semua orang di bawah tanggung jawabnya hidup layak.' },
    { title: 'Yama Brata — Keadilan', content: 'Seperti Dewa Yama yang adil menghakimi tanpa pandang bulu, pemimpin harus **adil dan tidak memihak**. Semua orang diperlakukan sama di depan aturan.' },
    { title: 'Surya Brata — Penerang', content: 'Seperti Surya yang menerangi dunia tanpa pamrih, pemimpin harus menjadi **sumber pencerahan** — memberikan ilmu, bimbingan, dan inspirasi dengan ketulusan.' },
    { title: 'Candra Brata — Kesejukan', content: 'Seperti bulan yang memberikan kesejukan di malam hari, pemimpin harus **menenangkan dan memberi harapan** di saat sulit.' },
    { title: 'Bayu Brata — Ketegasan', content: 'Seperti angin yang bisa halus namun juga bisa dahsyat, pemimpin harus bisa **lembut namun tegas** pada saat yang tepat.' },
    { title: 'Kuwera Brata — Kemurahan Hati', content: 'Seperti Kuwera (Dewa kekayaan) yang dermawan, pemimpin harus **murah hati** — tidak kikir dalam berbagi ilmu, waktu, dan bantuan.' },
    { title: 'Baruna Brata — Ketangguhan', content: 'Seperti lautan yang luas dan tangguh, pemimpin harus **berwawasan luas dan tidak mudah goyah** menghadapi masalah.' },
    { title: 'Agni Brata — Semangat Membara', content: 'Seperti api yang membakar habis dan tidak bisa ditipu oleh apapun, pemimpin harus **bersemangat, jujur, dan tidak korupsi**. Api juga membersihkan — pemimpin membersihkan dari keburukan.' },
  ],
};

async function main() {
  // Clear existing materials
  const { error: clearErr } = await supabase.from('chapter_materials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearErr) console.warn('Clear error (ok if first run):', clearErr.message);

  let total = 0;
  for (const [chapterId, sectionList] of Object.entries(sections)) {
    for (let i = 0; i < sectionList.length; i++) {
      const section = sectionList[i];
      const { error } = await supabase.from('chapter_materials').insert({
        chapter_id: chapterId,
        section_order: i,
        type: 'text',
        content: `## ${section.title}\n\n${section.content}`,
        caption: null,
      }).select('id').single();

      if (error) {
        console.error(`Error ${chapterId}[${i}]:`, error.message);
      } else {
        total++;
      }
    }
    console.log(`✅ ${chapterId} — ${sectionList.length} materials`);
  }

  console.log(`\n🎉 Done! ${total} total chapter_materials seeded.`);
}

main().catch(console.error);

-- Prototype reset: one-call reseed for LMS Pasraman
-- Intended for rapid prototyping. Teacher/admin can restore baseline data in one RPC call.

create or replace function public.reset_lms_prototype_data()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is not null and not public.is_teacher_or_admin() then
    raise exception 'teacher/admin only';
  end if;

  delete from public.material_progress where true;
  delete from public.pengayaan_submissions where true;
  delete from public.task_submissions where true;
  delete from public.scores where true;
  delete from public.chapter_progress where true;
  delete from public.pengayaan_prompts where true;
  delete from public.mcq_questions where true;
  delete from public.chapter_tasks where true;
  delete from public.chapters where true;
  insert into public.chapters (id, order_index, title, subtitle, description, material_content, material_video_url, cover_emoji, cover_color) values ('bab-1', 1, 'Pengantar Susila Hindu', 'Apa itu Susila dan mengapa penting?', 'Memahami konsep dasar Susila dalam Hindu: arti, sumber ajaran, dan penerapannya dalam kehidupan sehari-hari.', '', null, '🪷', 'from-orange-100 to-amber-200');
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('pre1-1', 'bab-1', null, 'pretest', 0, 'Apa arti kata "Su" dalam Susila?', '["Kuat","Baik","Suci","Agung"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('pre1-2', 'bab-1', null, 'pretest', 1, 'Manawa Dharmasastra termasuk golongan kitab?', '["Weda Sruti","Weda Smerti","Itihasa","Purana"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('pre1-3', 'bab-1', null, 'pretest', 2, 'Sebutan untuk wahyu suci yang didengar para Rsi adalah?', '["Weda Smerti","Weda Sruti","Bhagavad Gita","Nitisastra"]'::jsonb, 1);
  insert into public.chapter_tasks (id, chapter_id, title, description, due_date, task_order) values ('t1-1', 'bab-1', 'Refleksi Diri', 'Jawab soal-soal berikut berdasarkan pemahamanmu tentang Susila.', '2026-05-28', 0);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t1-1-q1', 'bab-1', 't1-1', 'tugas', 0, 'Apa arti kata "Susila"?', '["Perilaku baik dan benar sesuai Dharma","Kekuatan fisik","Kekayaan materi","Kecerdasan akal"]'::jsonb, 0);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t1-1-q2', 'bab-1', 't1-1', 'tugas', 1, 'Dari bahasa apa kata Susila berasal?', '["Jawa Kuno","Sanskerta","Pali","Latin"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t1-1-q3', 'bab-1', 't1-1', 'tugas', 2, 'Apa sumber utama ajaran Susila dalam Hindu?', '["Koran","Weda","Internet","Primbon"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post1-1', 'bab-1', null, 'posttest', 0, 'Apa arti kata "Sila" dalam Susila?', '["Kuat","Perilaku","Suci","Tuhan"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post1-2', 'bab-1', null, 'posttest', 1, 'Manakah yang BUKAN sumber ajaran Susila?', '["Weda Sruti","Weda Smerti","Itihasa","Koran"]'::jsonb, 3);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post1-3', 'bab-1', null, 'posttest', 2, 'Apa itu Subha Karma?', '["Perbuatan buruk","Perbuatan baik","Tidak berbuat","Hasil perbuatan"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post1-4', 'bab-1', null, 'posttest', 3, 'Kitab hukum Hindu yang terkenal adalah?', '["Ramayana","Manawa Dharmasastra","Bhagavad Gita","Upanishad"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post1-5', 'bab-1', null, 'posttest', 4, 'Susila menuntun kita hidup selaras dengan?', '["Keinginan","Dharma","Kekuasaan","Kekayaan"]'::jsonb, 1);
  insert into public.pengayaan_prompts (chapter_id, instruction) values ('bab-1', '### Tugas Pengayaan: Video Refleksi Susila
  1. Pilih satu ajaran Susila dari bab ini
  2. Buat video pendek (1-2 menit) tentang:
  - Bagaimana kamu menerapkan ajaran itu
  - Apa manfaat yang kamu rasakan
  3. Upload ke YouTube (unlisted) atau Google Drive
  4. **Submit link video di sini**');
  insert into public.chapters (id, order_index, title, subtitle, description, material_content, material_video_url, cover_emoji, cover_color) values ('bab-2', 2, 'Tri Kaya Parisudha', 'Tiga perbuatan yang harus disucikan', 'Mempelajari tiga jenis perbuatan suci: berpikir baik (Manacika), berkata baik (Wacika), dan berbuat baik (Kayika).', '', null, '💎', 'from-emerald-100 to-teal-200');
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('pre2-1', 'bab-2', null, 'pretest', 0, 'Tri Kaya Parisudha terdiri dari berapa bagian?', '["2","3","4","5"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('pre2-2', 'bab-2', null, 'pretest', 1, 'Manacika berarti?', '["Berkata baik","Berpikir baik","Berbuat baik","Berdoa baik"]'::jsonb, 1);
  insert into public.chapter_tasks (id, chapter_id, title, description, due_date, task_order) values ('t2-1', 'bab-2', 'Jurnal Tri Kaya', 'Jawab soal-soal berikut tentang Tri Kaya Parisudha.', '2026-06-02', 0);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t2-1-q1', 'bab-2', 't2-1', 'tugas', 0, 'Tri Kaya Parisudha mengajarkan penyucian pada tiga hal, yaitu?', '["Pikiran, Ucapan, Perbuatan","Doa, Puasa, Sedekah","Belajar, Bekerja, Beribadah","Makan, Minum, Tidur"]'::jsonb, 0);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t2-1-q2', 'bab-2', 't2-1', 'tugas', 1, 'Seorang siswa yang selalu berpikir positif tentang temannya sedang menerapkan?', '["Wacika","Kayika","Manacika","Dharma"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t2-1-q3', 'bab-2', 't2-1', 'tugas', 2, 'Membantu membersihkan pura termasuk contoh dari?', '["Manacika","Wacika","Kayika","Asubha Karma"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post2-1', 'bab-2', null, 'posttest', 0, '"Manacika" secara bahasa berarti?', '["Pikiran yang baik","Ucapan yang baik","Perbuatan yang baik","Doa yang baik"]'::jsonb, 0);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post2-2', 'bab-2', null, 'posttest', 1, 'Berkata jujur dalam Hindu disebut?', '["Priya","Satya","Hita","Dharma"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post2-3', 'bab-2', null, 'posttest', 2, 'Yang termasuk contoh Kayika yang baik adalah?', '["Menghina teman","Menolong membersihkan pura","Berbohong pada guru","Iri pada teman"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post2-4', 'bab-2', null, 'posttest', 3, '"Priya" dalam konteks Wacika berarti?', '["Berkata jujur","Berkata lembut dan sopan","Berkata bermanfaat","Berkata keras"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post2-5', 'bab-2', null, 'posttest', 4, 'Mengapa Manacika dianggap paling penting dalam Tri Kaya Parisudha?', '["Karena paling mudah","Karena pikiran adalah sumber ucapan dan perbuatan","Karena paling terlihat","Karena paling sulit"]'::jsonb, 1);
  insert into public.chapters (id, order_index, title, subtitle, description, material_content, material_video_url, cover_emoji, cover_color) values ('bab-3', 3, 'Subha & Asubha Karma', 'Memahami hukum karma dalam kehidupan', 'Mengenal perbuatan baik (Subha Karma) dan buruk (Asubha Karma) serta hukum Karma Phala yang mengajarkan setiap perbuatan berbuah.', '', null, '⚖️', 'from-violet-100 to-purple-200');
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post3-1', 'bab-3', null, 'posttest', 0, 'Subha Karma berarti?', '["Perbuatan buruk","Perbuatan baik","Perbuatan netral","Tidak berbuat"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post3-2', 'bab-3', null, 'posttest', 1, 'Apa akibat dari Asubha Karma?', '["Kelahiran mulia","Kebahagiaan","Penderitaan","Moksha"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post3-3', 'bab-3', null, 'posttest', 2, 'Menyakiti makhluk hidup dalam Hindu disebut?', '["Subha Karma","Himsa Karma","Karma Phala","Tri Kaya"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post3-4', 'bab-3', null, 'posttest', 3, '"Siapa menanam, dia menuai" merujuk pada hukum?', '["Dharma","Karma Phala","Punarbhawa","Moksha"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post3-5', 'bab-3', null, 'posttest', 4, 'Karma yang sedang dinikmati saat ini disebut?', '["Sancita","Prarabdha","Kriyamana","Asubha"]'::jsonb, 1);
  insert into public.pengayaan_prompts (chapter_id, instruction) values ('bab-3', '### Tugas Pengayaan: Mind Map Karma
  1. Buat mind map (peta pikiran) tentang Subha & Asubha Karma
  2. Bisa digambar tangan lalu difoto, atau dibuat digital (Canva, dll)
  3. Mind map harus mencakup:
  - Definisi Subha Karma + 5 contoh
  - Definisi Asubha Karma + 5 contoh
  - 3 jenis Karma Phala
  4. Upload ke Google Drive dan **submit link di sini**');
  insert into public.chapters (id, order_index, title, subtitle, description, material_content, material_video_url, cover_emoji, cover_color) values ('bab-4', 4, 'Tat Twam Asi', 'Ajaran welas asih dalam Hindu', 'Memahami makna "Engkau adalah Aku" dari Chandogya Upanishad dan penerapannya dalam toleransi serta kepemimpinan.', '', null, '🕉️', 'from-rose-100 to-pink-200');
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('pre4-1', 'bab-4', null, 'pretest', 0, '"Tat Twam Asi" berasal dari kitab?', '["Bhagavad Gita","Chandogya Upanishad","Ramayana","Manawa Dharmasastra"]'::jsonb, 1);
  insert into public.chapter_tasks (id, chapter_id, title, description, due_date, task_order) values ('t4-1', 'bab-4', 'Esai Mini: Tat Twam Asi', 'Jawab soal-soal berikut tentang ajaran Tat Twam Asi.', '2026-06-04', 0);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t4-1-q1', 'bab-4', 't4-1', 'tugas', 0, '"Tat Twam Asi" secara harfiah berarti?', '["Aku adalah Brahman","Engkau adalah Aku","Kebenaran pasti menang","Hidup adalah penderitaan"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t4-1-q2', 'bab-4', 't4-1', 'tugas', 1, 'Ajaran Tat Twam Asi mengajarkan kita untuk?', '["Bersaing dengan orang lain","Melihat diri sendiri dalam diri orang lain","Menghindari pergaulan","Mencari kekayaan"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t4-1-q3', 'bab-4', 't4-1', 'tugas', 2, 'Jika kita menyakiti orang lain, menurut Tat Twam Asi artinya?', '["Tidak apa-apa","Kita menyakiti diri sendiri","Itu hak kita","Itu karma mereka"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post4-1', 'bab-4', null, 'posttest', 0, 'Arti harfiah "Tat Twam Asi" adalah?', '["Aku adalah Brahman","Engkau adalah Aku","Kebenaran pasti menang","Hidup adalah penderitaan"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post4-2', 'bab-4', null, 'posttest', 1, 'Dalam Ramayana, siapa yang rela berkorban meninggalkan istana demi janji?', '["Laksmana","Bharata","Rama","Hanuman"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post4-3', 'bab-4', null, 'posttest', 2, 'Yudhistira dikenal sebagai pemimpin yang?', '["Gagah berani","Kaya raya","Berpegang pada Dharma","Sakti mandraguna"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post4-4', 'bab-4', null, 'posttest', 3, 'Penerapan Tat Twam Asi dalam kehidupan sehari-hari adalah?', '["Bersaing dengan teman","Menghormati semua orang tanpa memandang perbedaan","Mementingkan diri sendiri","Menghindari interaksi sosial"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post4-5', 'bab-4', null, 'posttest', 4, 'Mengapa Tat Twam Asi penting untuk toleransi beragama?', '["Karena memaksa semua beragama sama","Karena mengajarkan bahwa semua manusia adalah bagian dari Brahman","Karena melarang beribadah","Karena mengajarkan satu agama"]'::jsonb, 1);
  insert into public.pengayaan_prompts (chapter_id, instruction) values ('bab-4', '### Tugas Pengayaan: Video Drama Pendek
  1. Bersama 2-3 teman, buat video drama pendek (2-3 menit) tentang penerapan Tat Twam Asi
  2. Contoh tema: toleransi di sekolah, menolong tanpa memandang perbedaan
  3. Upload ke YouTube (unlisted)
  4. **Submit link video di sini**');
  insert into public.chapters (id, order_index, title, subtitle, description, material_content, material_video_url, cover_emoji, cover_color) values ('bab-5', 5, 'Catur Guru', 'Empat guru dalam kehidupan', 'Mengenal empat guru yang wajib dihormati: Guru Rupaka (orang tua), Guru Pengajian (guru sekolah), Guru Wisesa (pemerintah), dan Guru Swadyaya (Tuhan).', '', null, '👨‍🏫', 'from-sky-100 to-blue-200');
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post5-1', 'bab-5', null, 'posttest', 0, '"Catur" dalam Catur Guru berarti?', '["Dua","Tiga","Empat","Lima"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post5-2', 'bab-5', null, 'posttest', 1, 'Orang tua termasuk dalam kategori Guru?', '["Guru Pengajian","Guru Rupaka","Guru Wisesa","Guru Swadyaya"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post5-3', 'bab-5', null, 'posttest', 2, 'Pemerintah termasuk dalam kategori?', '["Guru Rupaka","Guru Pengajian","Guru Wisesa","Guru Swadyaya"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post5-4', 'bab-5', null, 'posttest', 3, 'Siapa Guru tertinggi dalam ajaran Catur Guru?', '["Orang tua","Guru sekolah","Pemerintah","Tuhan Yang Maha Esa (Guru Swadyaya)"]'::jsonb, 3);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post5-5', 'bab-5', null, 'posttest', 4, 'Apa kewajiban murid terhadap Guru Pengajian?', '["Memberi uang","Menghormati dan mendengarkan","Mengabaikan nasihat","Tidak perlu datang ke sekolah"]'::jsonb, 1);
  insert into public.chapters (id, order_index, title, subtitle, description, material_content, material_video_url, cover_emoji, cover_color) values ('bab-6', 6, 'Kepemimpinan Asta Brata', 'Delapan sifat pemimpin ideal', 'Mempelajari delapan sifat kepemimpinan berdasarkan sifat-sifat Dewa: Indra, Yama, Surya, Candra, Bayu, Kuwera, Baruna, dan Agni.', '', null, '👑', 'from-amber-100 to-yellow-200');
  insert into public.chapter_tasks (id, chapter_id, title, description, due_date, task_order) values ('t6-1', 'bab-6', 'Pemimpin Idolaku', 'Jawab soal-soal berikut tentang Asta Brata.', '2026-06-07', 0);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t6-1-q1', 'bab-6', 't6-1', 'tugas', 0, 'Berapa jumlah sifat dalam Asta Brata?', '["Lima","Enam","Delapan","Sepuluh"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t6-1-q2', 'bab-6', 't6-1', 'tugas', 1, 'Sifat yang mengajarkan pemimpin menjadi penyejuk seperti hujan adalah?', '["Agni Brata","Indra Brata","Yama Brata","Surya Brata"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('t6-1-q3', 'bab-6', 't6-1', 'tugas', 2, 'Agni Brata mengajarkan pemimpin untuk?', '["Bermalas-malasan","Berani memberantas kejahatan","Menghindari masalah","Mencari kekayaan"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post6-1', 'bab-6', null, 'posttest', 0, 'Asta Brata berarti?', '["Lima sifat","Enam sifat","Delapan sifat","Sepuluh sifat"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post6-2', 'bab-6', null, 'posttest', 1, 'Asta Brata diajarkan oleh Rama kepada?', '["Laksmana","Wibhisana","Hanuman","Bharata"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post6-3', 'bab-6', null, 'posttest', 2, 'Sifat keadilan diambil dari Dewa?', '["Indra","Surya","Yama","Agni"]'::jsonb, 2);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post6-4', 'bab-6', null, 'posttest', 3, 'Agni Brata mengajarkan pemimpin untuk?', '["Bermalas-malasan","Bersemangat dan jujur","Berpura-pura","Menghindari tanggung jawab"]'::jsonb, 1);
  insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values ('post6-5', 'bab-6', null, 'posttest', 4, 'Baruna Brata mengajarkan pemimpin untuk?', '["Mudah menyerah","Tangguh dan berwawasan luas","Pendendam","Takut menghadapi masalah"]'::jsonb, 1);
  insert into public.pengayaan_prompts (chapter_id, instruction) values ('bab-6', '### Tugas Pengayaan: Infografis Asta Brata
  1. Buat infografis tentang 8 sifat Asta Brata
  2. Setiap sifat: nama dewa, arti, dan ikon sederhana
  3. Bisa dibuat dengan Canva, PPT, atau gambar tangan
  4. Upload hasilnya ke Google Drive
  5. **Submit link di sini**');
  delete from public.chapter_materials where true;
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-1', 0, 'text', '## Apa itu Susila?
  Susila berasal dari bahasa Sanskerta: **Su** (baik) dan **Sila** (perilaku). Susila adalah ajaran tentang tingkah laku yang baik dan benar sesuai Dharma.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-1', 1, 'text', '## Mengapa Mempelajari Susila Penting?
  1. **Membentuk karakter mulia** — menuntun kita menjadi pribadi yang berakhlak
  2. **Hidup selaras dengan Dharma** — membedakan yang benar dan salah
  3. **Subha & Asubha Karma** — memahami bahwa setiap perbuatan berbuah', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-1', 2, 'text', '## Sumber Ajaran Susila
  - **Weda Sruti** — wahyu suci yang didengar para Rsi
  - **Weda Smerti** — kitab hukum seperti Manawa Dharmasastra
  - **Itihasa** — Ramayana & Mahabharata (khususnya Bhagavad Gita)', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-1', 3, 'text', '## Penerapan Sehari-hari
  Susila bukan hanya teori. Setiap hari kita dihadapkan pada pilihan:
  - Berkata jujur atau berbohong
  - Menolong teman atau bersikap acuh
  - Menghormati orang tua atau membantah
  Pilihan-pilihan kecil inilah yang membentuk karma kita.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-2', 0, 'text', '## Tri Kaya Parisudha
  Tri Kaya Parisudha adalah **tiga perbuatan yang harus disucikan** dalam ajaran Hindu: berpikir baik (Manacika), berkata baik (Wacika), dan berbuat baik (Kayika).', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-2', 1, 'text', '## Manacika — Berpikir yang Baik
  Pikiran adalah sumber segala perbuatan. **Apa yang kita pikirkan akan tercermin dalam ucapan dan tindakan.**
  - Selalu berpikir positif terhadap sesama
  - Menghindari iri hati, dengki, dan prasangka buruk
  - Mengisi pikiran dengan hal-hal yang bermanfaat
  > "Pikiran adalah pelopor, pikiran adalah pemimpin, segala sesuatu diciptakan oleh pikiran." — *Dhammapada*', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-2', 2, 'text', '## Wacika — Berkata yang Baik
  Ucapan memiliki kekuatan besar. Kata-kata bisa menyembuhkan atau melukai.
  - Berkata jujur (*Satya*)
  - Berkata lembut dan sopan (*Priya*)
  - Berkata yang bermanfaat (*Hita*)
  - Menghindari fitnah, gosip, dan kata-kata kasar', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-2', 3, 'text', '## Kayika — Berbuat yang Baik
  Perbuatan nyata yang mencerminkan Dharma. Pikiran baik + ucapan baik harus diwujudkan dalam tindakan.
  - Menolong sesama tanpa pamrih
  - Menghormati orang tua dan guru
  - Menjaga kebersihan lingkungan
  - Rajin bersembahyang dan belajar', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-3', 0, 'text', '## Subha & Asubha Karma
  Dalam ajaran Hindu, setiap perbuatan akan mendatangkan hasil. Ini disebut **Karma Phala** — hukum sebab-akibat universal.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-3', 1, 'text', '## Subha Karma — Perbuatan Baik
  Perbuatan yang sesuai Dharma, menghasilkan karma baik (*Subha Karma Phala*):
  - Menghormati orang tua dan guru (*Guru Susrusa*)
  - Menjaga kebersihan dan melestarikan alam
  - Rajin belajar dan bersembahyang
  - Berkata jujur dan menolong sesama
  - Berdana punia (bersedekah)', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-3', 2, 'text', '## Asubha Karma — Perbuatan Buruk
  Perbuatan yang melanggar Dharma, menghasilkan karma buruk (*Asubha Karma Phala*):
  - Berbohong dan mencuri
  - Menyakiti makhluk hidup (*Himsa Karma*)
  - Malas belajar dan bermalas-malasan
  - Merusak alam dan lingkungan
  - Menghina dan merendahkan orang lain', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-3', 3, 'text', '## Hukum Karma Phala
  > **"Siapa menanam, dia menuai."**
  Hukum karma bukan hukuman, melainkan konsekuensi alami. Seperti menanam padi akan tumbuh padi, bukan jagung. Begitu pula perbuatan kita.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-3', 4, 'text', '## Tiga Jenis Karma Phala
  1. **Sancita Karma Phala** — hasil perbuatan masa lalu yang belum dinikmati
  2. **Prarabdha Karma Phala** — hasil perbuatan yang sedang dinikmati sekarang
  3. **Kriyamana Karma Phala** — hasil perbuatan yang akan dinikmati di masa depan', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-4', 0, 'text', '## Tat Twam Asi — Engkau adalah Aku
  **Tat Twam Asi** berasal dari *Chandogya Upanishad*, salah satu kitab suci Hindu. Secara harfiah berarti **"Itu adalah Kamu"** atau **"Engkau adalah Aku"**.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-4', 1, 'text', '## Makna Filosofis
  Semua makhluk pada hakikatnya adalah bagian dari **Brahman** (Tuhan Yang Maha Esa). Tidak ada perbedaan esensial antara aku, kamu, dan makhluk lain.
  Jika kita menyakiti orang lain, pada hakikatnya kita menyakiti diri sendiri. Jika kita menolong orang lain, kita menolong diri sendiri.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-4', 2, 'text', '## Penerapan Tat Twam Asi
  1. **Toleransi Beragama** — menghormati keyakinan orang lain
  2. **Anti Diskriminasi** — tidak membeda-bedakan berdasarkan suku, agama, ras
  3. **Empati** — merasakan penderitaan sesama dan terdorong menolong
  4. **Kerukunan** — menjaga kedamaian di sekolah, rumah, dan masyarakat', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-4', 3, 'text', '## Ajaran Kepemimpinan dari Itihasa
  **Rama — Pemimpin yang Berkorban**
  Dalam Ramayana, Rama rela meninggalkan istana dan hidup di hutan selama 14 tahun demi menepati janji ayahnya. Pemimpin sejati mengutamakan kebenaran di atas kenyamanan pribadi.
  **Yudhistira — Pemimpin Dharma**
  Dalam Mahabharata, Yudhistira memimpin dengan berpegang teguh pada Dharma. Ia tidak pernah berbohong dan selalu mengutamakan keadilan, bahkan di tengah perang.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-4', 4, 'text', '## Refleksi
  > "Jika kamu ingin orang lain memperlakukanmu dengan baik, perlakukanlah mereka dengan baik terlebih dahulu."', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-5', 0, 'text', '## Apa itu Catur Guru?
  **Catur** berarti empat, **Guru** berarti yang patut dihormati. Catur Guru adalah ajaran tentang empat sosok yang wajib kita hormati dalam hidup.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-5', 1, 'text', '## Guru Rupaka — Orang Tua
  Orang tua adalah guru pertama dan utama. Mereka yang melahirkan, membesarkan, dan mendidik kita dengan penuh kasih sayang.
  **Kewajiban kita:**
  - Hormat dan patuh pada orang tua
  - Membantu pekerjaan rumah
  - Belajar dengan rajin — membanggakan mereka
  - Merawat mereka di masa tua', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-5', 2, 'text', '## Guru Pengajian — Guru Sekolah
  Guru di sekolah yang memberikan ilmu pengetahuan dan membimbing kita menjadi manusia yang cerdas dan berkarakter.
  **Kewajiban kita:**
  - Menghormati dan mendengarkan guru
  - Mengerjakan tugas tepat waktu
  - Tidak menyontek atau berbuat curang
  - Menjaga nama baik sekolah', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-5', 3, 'text', '## Guru Wisesa — Pemerintah
  Pemerintah dan pemimpin yang menciptakan ketertiban, keamanan, dan kesejahteraan masyarakat.
  **Kewajiban kita:**
  - Mematuhi peraturan yang berlaku
  - Membayar iuran sekolah tepat waktu
  - Ikut menjaga ketertiban lingkungan
  - Menggunakan fasilitas umum dengan baik', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-5', 4, 'text', '## Guru Swadyaya — Tuhan Yang Maha Esa
  Tuhan sebagai guru tertinggi, sumber segala pengetahuan dan kebijaksanaan.
  **Kewajiban kita:**
  - Rajin bersembahyang
  - Mempelajari kitab suci
  - Menjalankan ajaran Dharma
  - Percaya pada kekuasaan-Nya', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-6', 0, 'text', '## Asta Brata — Delapan Sifat Kepemimpinan
  **Asta Brata** adalah ajaran kepemimpinan Hindu yang mengajarkan delapan sifat ideal seorang pemimpin. Ajaran ini disampaikan oleh Rama kepada Wibhisana setelah perang Ramayana usai.
  Masing-masing sifat diambil dari karakter Dewa:', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-6', 1, 'text', '## Indra Brata — Kemakmuran
  Seperti Dewa Indra yang menurunkan hujan untuk kesuburan, pemimpin harus **mensejahterakan rakyatnya**. Pemimpin yang baik memastikan semua orang di bawah tanggung jawabnya hidup layak.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-6', 2, 'text', '## Yama Brata — Keadilan
  Seperti Dewa Yama yang adil menghakimi tanpa pandang bulu, pemimpin harus **adil dan tidak memihak**. Semua orang diperlakukan sama di depan aturan.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-6', 3, 'text', '## Surya Brata — Penerang
  Seperti Surya yang menerangi dunia tanpa pamrih, pemimpin harus menjadi **sumber pencerahan** — memberikan ilmu, bimbingan, dan inspirasi dengan ketulusan.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-6', 4, 'text', '## Candra Brata — Kesejukan
  Seperti bulan yang memberikan kesejukan di malam hari, pemimpin harus **menenangkan dan memberi harapan** di saat sulit.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-6', 5, 'text', '## Bayu Brata — Ketegasan
  Seperti angin yang bisa halus namun juga bisa dahsyat, pemimpin harus bisa **lembut namun tegas** pada saat yang tepat.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-6', 6, 'text', '## Kuwera Brata — Kemurahan Hati
  Seperti Kuwera (Dewa kekayaan) yang dermawan, pemimpin harus **murah hati** — tidak kikir dalam berbagi ilmu, waktu, dan bantuan.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-6', 7, 'text', '## Baruna Brata — Ketangguhan
  Seperti lautan yang luas dan tangguh, pemimpin harus **berwawasan luas dan tidak mudah goyah** menghadapi masalah.', null);
  insert into public.chapter_materials (chapter_id, section_order, type, content, caption) values ('bab-6', 8, 'text', '## Agni Brata — Semangat Membara
  Seperti api yang membakar habis dan tidak bisa ditipu oleh apapun, pemimpin harus **bersemangat, jujur, dan tidak korupsi**. Api juga membersihkan — pemimpin membersihkan dari keburukan.', null);

  return jsonb_build_object(
    'ok', true,
    'message', 'Prototype data reset complete',
    'chapter_count', (select count(*) from public.chapters),
    'material_count', (select count(*) from public.chapter_materials)
  );
end;
$$;

revoke execute on function public.reset_lms_prototype_data() from public;
revoke execute on function public.reset_lms_prototype_data() from anon;
grant execute on function public.reset_lms_prototype_data() to authenticated;

// Seed teacher account — ensures guru001 exists with teacher role.
// Run: env $(grep -v '^#' .env.local | xargs) node scripts/seed-teacher.cjs
//
// For first-time setup where no teacher exists yet, use service_role key:
//   SUPABASE_SERVICE_ROLE_KEY=xxx env $(grep -v '^#' .env.local | xargs) node scripts/seed-teacher.cjs

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing env vars. For first-time: set SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const TEACHER_USERNAME = 'guru001';
const TEACHER_DISPLAY = 'Guru';

async function main() {
  // Check if guru001 already exists
  const { data: existing, error: selectErr } = await supabase
    .from('app_users')
    .select('id, username, role')
    .eq('username', TEACHER_USERNAME)
    .maybeSingle();

  if (selectErr) {
    console.error('❌ Failed to query app_users:', selectErr.message);
    console.log('This script needs service_role key for admin operations.');
    console.log('Set SUPABASE_SERVICE_ROLE_KEY env var and retry.');
    process.exit(1);
  }

  if (existing) {
    if (existing.role !== 'teacher') {
      const { error } = await supabase
        .from('app_users')
        .update({ role: 'teacher' })
        .eq('username', TEACHER_USERNAME);
      if (error) {
        console.error('❌ Failed to update role:', error.message);
        console.log('Use SQL in Supabase dashboard:');
        console.log(`  update public.app_users set role = 'teacher' where username = '${TEACHER_USERNAME}';`);
        process.exit(1);
      }
      console.log(`✅ guru001 role updated to teacher (was ${existing.role})`);
    } else {
      console.log('✅ guru001 is already a teacher');
    }
  } else {
    console.log('⚠️  guru001 not found. Create manually via Supabase dashboard SQL:');
    console.log(`  SELECT public.create_app_user('${TEACHER_USERNAME}', '<password>', '${TEACHER_DISPLAY}', 'teacher');`);
    console.log('  (Replace <password> with a secure password)');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'firebase-admin-lmspasraman.json');
const accountsPath = path.join(process.cwd(), 'accounts.json');

function loadAccounts() {
  const data = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
  if (Array.isArray(data)) return data;
  return data.users || data.accounts || [];
}

function parseClaims(account) {
  if (account.customAttributes) {
    try {
      const parsed = JSON.parse(account.customAttributes);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (error) {
      throw new Error(`Invalid customAttributes for ${account.email || account.localId}: ${error.message}`);
    }
  }

  const email = account.email || '';
  if (email.startsWith('guru')) return { role: 'teacher' };
  return { role: 'student' };
}

async function main() {
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Missing service account key: ${keyPath}`);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
  }

  const auth = admin.auth();
  const accounts = loadAccounts();
  if (!accounts.length) throw new Error(`No accounts found in ${accountsPath}`);

  const results = [];
  for (const account of accounts) {
    const uid = account.localId || account.uid;
    if (!uid && !account.email) {
      results.push({ status: 'skipped', reason: 'missing uid/email' });
      continue;
    }

    const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(account.email);
    const claims = parseClaims(account);
    await auth.setCustomUserClaims(user.uid, claims);

    const refreshed = await auth.getUser(user.uid);
    results.push({
      status: 'updated',
      uid: user.uid,
      email: user.email,
      claims: refreshed.customClaims || {},
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

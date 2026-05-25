const fs = require('fs');
const path = require('path');

const projectId = 'lmspasraman';
const accountId = 'lms-pasraman-supabase-claims';
const keyPath = path.join(process.cwd(), 'firebase-admin-lmspasraman.json');
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.config/configstore/firebase-tools.json'), 'utf8'));
const token = firebaseConfig.tokens?.access_token;

if (!token) throw new Error('No Firebase CLI access token found');

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const msg = body?.error?.message || body?.raw || res.statusText;
    const err = new Error(`${res.status} ${res.statusText}: ${msg}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function enableService(service) {
  try {
    await api(`https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${service}:enable`, { method: 'POST', body: '{}' });
  } catch (error) {
    if (error.status !== 403 && error.status !== 400) throw error;
    console.warn(`Could not enable ${service}: ${error.message}`);
  }
}

async function main() {
  await enableService('iam.googleapis.com');
  await enableService('iamcredentials.googleapis.com');

  let serviceAccount;
  const list = await api(`https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts`);
  serviceAccount = (list.accounts || []).find((account) => account.email.startsWith(`${accountId}@`));

  if (!serviceAccount) {
    try {
      serviceAccount = await api(`https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts`, {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          serviceAccount: { displayName: 'LMS Pasraman Supabase claim setter' },
        }),
      });
    } catch (error) {
      if (error.status === 409) {
        const refreshed = await api(`https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts`);
        serviceAccount = (refreshed.accounts || []).find((account) => account.email.startsWith(`${accountId}@`));
      } else {
        throw error;
      }
    }
  }

  if (!serviceAccount?.email) throw new Error('Service account missing email');

  // Firebase Admin SDK custom claims need firebaseauth.users.update.
  // Grant Firebase Admin to this SA if caller is owner/editor.
  try {
    const policy = await api(`https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`, {
      method: 'POST', body: '{}'
    });
    policy.bindings = policy.bindings || [];
    const member = `serviceAccount:${serviceAccount.email}`;
    let binding = policy.bindings.find((b) => b.role === 'roles/firebase.admin');
    if (!binding) {
      binding = { role: 'roles/firebase.admin', members: [] };
      policy.bindings.push(binding);
    }
    if (!binding.members.includes(member)) {
      binding.members.push(member);
      await api(`https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:setIamPolicy`, {
        method: 'POST',
        body: JSON.stringify({ policy }),
      });
    }
  } catch (error) {
    console.warn(`Could not update IAM policy automatically: ${error.message}`);
  }

  const key = await api(`https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts/${encodeURIComponent(serviceAccount.email)}/keys`, {
    method: 'POST',
    body: JSON.stringify({ privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE' }),
  });

  if (!key.privateKeyData) throw new Error('No privateKeyData returned');
  fs.writeFileSync(keyPath, Buffer.from(key.privateKeyData, 'base64'));
  console.log(JSON.stringify({ serviceAccount: serviceAccount.email, keyPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

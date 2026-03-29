// Temporary debug function — DELETE after troubleshooting
// GET /.netlify/functions/debug-icloud-sync?tenant_id=<uuid>
// Returns: mailbox list + recent email subjects from INBOX

const { ImapFlow } = require('imapflow');
const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

exports.handler = async (event) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { statusCode: 500, body: 'Missing SUPABASE_SERVICE_ROLE_KEY' };

  const tenantId = event.queryStringParameters?.tenant_id;
  if (!tenantId) return { statusCode: 400, body: 'Missing tenant_id' };

  // Load sync record
  const syncRes = await fetch(
    `${SUPABASE_URL}/rest/v1/turo_email_syncs?tenant_id=eq.${tenantId}&provider=eq.icloud&select=*`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const syncs = await syncRes.json();
  if (!syncs.length) return { statusCode: 404, body: 'No iCloud sync found for tenant' };
  const sync = syncs[0];

  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: sync.gmail_address, pass: sync.app_specific_password },
    logger: false,
  });

  const result = { email: sync.gmail_address, mailboxes: [], recentSubjects: [], turoSubjects: [] };

  try {
    await client.connect();

    // List all mailboxes
    for await (const mailbox of client.list()) {
      result.mailboxes.push(mailbox.path);
    }

    // Search INBOX broadly (last 60 days, no from filter)
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const uids = await client.search({ since: since60 }, { uid: true });
      result.totalInboxSince60Days = uids.length;

      // Fetch subjects of last 20
      const recentUids = uids.slice(-20);
      for (const uid of recentUids) {
        try {
          const msg = await client.fetchOne(String(uid), { envelope: true }, { uid: true });
          const subject = msg.envelope?.subject || '(no subject)';
          const from = msg.envelope?.from?.[0]?.address || '';
          result.recentSubjects.push({ uid, from, subject });
          if (/turo/i.test(subject) || /turo/i.test(from)) {
            result.turoSubjects.push({ uid, from, subject });
          }
        } catch (e) {
          result.recentSubjects.push({ uid, error: e.message });
        }
      }

      // Also specifically search for turo sender
      const turoUids = await client.search(
        { from: 'noreply@mail.turo.com', since: since60 },
        { uid: true }
      );
      result.turoUidsFromSearch = turoUids.length;
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    result.error = err.message;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result, null, 2),
  };
};

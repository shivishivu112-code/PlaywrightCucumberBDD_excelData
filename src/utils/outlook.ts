import { env } from '../config/env';

interface GraphMessage {
  id: string;
  subject?: string;
  receivedDateTime: string;
  from?: { emailAddress?: { address?: string } };
  body?: { content?: string };
}

let cachedToken: { value: string; expiresAt: number } | undefined;

// App-only sign-in to Microsoft Graph (client credentials). Cached until shortly before it expires.
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const response = await fetch(`https://login.microsoftonline.com/${env.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not get a Microsoft Graph token (${response.status}): ${await response.text()}`);
  }
  const json = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cachedToken.value;
}

// Newest messages received at or after `since`, as plain text.
async function getMessagesSince(since: Date): Promise<GraphMessage[]> {
  const token = await getAccessToken();
  const query = [
    `$filter=${encodeURIComponent(`receivedDateTime ge ${since.toISOString()}`)}`,
    `$orderby=${encodeURIComponent('receivedDateTime desc')}`,
    '$top=10',
    '$select=subject,from,receivedDateTime,body',
  ].join('&');

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env.otpMailbox)}/messages?${query}`,
    { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' } },
  );
  if (!response.ok) {
    throw new Error(`Could not read the mailbox (${response.status}): ${await response.text()}`);
  }
  return ((await response.json()) as { value: GraphMessage[] }).value;
}

/** Pulls the code out of an email body. The first capture group is used if the pattern has one. */
export function extractCode(text: string, pattern: string = env.otpRegex): string | undefined {
  const match = new RegExp(pattern).exec(text);
  return match ? (match[1] ?? match[0]) : undefined;
}

export interface WaitOptions {
  since: Date;          // when the code was requested
  timeoutMs?: number;   // give up after this long (default 90 s)
  intervalMs?: number;  // how often to check the mailbox (default 3 s)
}

/** Polls the test mailbox until a verification email arrives, then returns the code. */
export async function waitForVerificationCode(options: WaitOptions): Promise<string> {
  const { since, timeoutMs = 90_000, intervalMs = 3_000 } = options;
  const searchFrom = new Date(since.getTime() - 5_000); // small margin for clock differences
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const messages = await getMessagesSince(searchFrom);
    for (const message of messages) {
      const sender = message.from?.emailAddress?.address ?? '';
      if (env.otpSender && !sender.toLowerCase().includes(env.otpSender.toLowerCase())) continue;
      const code = extractCode(`${message.subject ?? ''}\n${message.body?.content ?? ''}`);
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `No verification email arrived in ${env.otpMailbox} within ${timeoutMs / 1000}s of requesting the code.`,
  );
}

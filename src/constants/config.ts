// Domain configured in SendGrid Inbound Parse (MX records point here).
// Change this to your actual parse subdomain once SendGrid is set up.
export const INGEST_DOMAIN = 'parse.yourapp.com';

/** Builds a user's unique email-in address from their ingest token. */
export function ingestAddress(token: string | null | undefined): string | null {
  return token ? `ingest-${token}@${INGEST_DOMAIN}` : null;
}

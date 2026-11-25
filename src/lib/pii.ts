const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;
const CARD = /\b(?:\d[ -]*?){13,19}\b/g;

export function maskPii(value: string): string {
  return value
    .replace(EMAIL, (email) => {
      const [user, domain] = email.split("@");
      return `${user.slice(0, 1)}***@${domain}`;
    })
    .replace(PHONE, "***-***-****")
    .replace(CARD, "[card]");
}

export function logSafe(scope: string, detail: string) {
  console.info(`[driftwood] ${scope} ${maskPii(detail)}`);
}

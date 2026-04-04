/**
 * Basic email format validation using simple string checks.
 * Avoids regex-based approaches that can be vulnerable to ReDoS.
 */
export function isValidEmail(email: string): boolean {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return false; // must have characters before @
  if (atIndex === email.length - 1) return false; // must have characters after @
  const domain = email.slice(atIndex + 1);
  const dotIndex = domain.lastIndexOf(".");
  if (dotIndex <= 0) return false; // domain must have a dot after at least one char
  if (dotIndex === domain.length - 1) return false; // must have characters after the dot
  return true;
}

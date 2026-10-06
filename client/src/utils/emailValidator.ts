/**
 * Client-side email validation and disposable domain detection.
 */

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'sharklasers.com',
  'mailinator.com', 'yopmail.com', 'trashmail.com', 'dispostable.com',
  'temp-mail.org', 'fakeinbox.com', 'getnada.com', 'mohmal.com', 'crazymailing.com',
  'throwawaymail.com', 'mytemp.email', 'tempinbox.com', 'maildrop.cc', 'inboxkitten.com',
  'burnermail.io', 'generator.email', 'dropmail.me', 'getairmail.com', 'mailcatch.com'
]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(normalized);
}

export function isDisposableDomain(email: string): boolean {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

export interface PasswordStrength {
  score: number; // 0 to 4
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUppercase || hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  // Valid as long as it has at least 8 characters of any combination (letters, numbers, punctuation)
  const isValid = hasMinLength;

  return {
    score,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    isValid
  };
}

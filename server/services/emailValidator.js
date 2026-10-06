import dns from 'dns';
import disposableDomains from 'disposable-email-domains' with { type: 'json' };

// Create a fast lookup Set of disposable domains
const disposableSet = new Set(disposableDomains);

// Additional well-known temporary/throwaway email providers
const extraDisposableDomains = [
  'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'sharklasers.com',
  'mailinator.com', 'yopmail.com', 'trashmail.com', 'dispostable.com',
  'temp-mail.org', 'fakeinbox.com', 'getnada.com', 'mohmal.com', 'crazymailing.com'
];
extraDisposableDomains.forEach(d => disposableSet.add(d.toLowerCase()));

/**
 * Normalizes email by trimming and lowercasing.
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validates standard email format using RFC 5322 regex pattern.
 */
export function isValidEmailFormat(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 254) return false;
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(normalized);
}

/**
 * Checks if the domain is a known disposable / temporary email provider.
 */
export function isDisposableEmail(email) {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return true;

  const domain = parts[1].toLowerCase();
  return disposableSet.has(domain);
}

/**
 * Checks if the domain has valid Mail Exchange (MX) DNS records.
 * Returns true if reachable, false if domain cannot receive mail.
 */
export async function checkMxRecords(email) {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1];

  try {
    const mxRecords = await Promise.race([
      dns.promises.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS Timeout')), 4000))
    ]);
    return Array.isArray(mxRecords) && mxRecords.length > 0;
  } catch (err) {
    // If DNS resolution fails completely (e.g. ENOTFOUND or no MX), return false
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return false;
    }
    // For network timeouts during local offline development, allow gracefully
    console.warn(`[EmailValidator] MX check warning for ${domain}:`, err.message);
    return true;
  }
}

/**
 * Comprehensive email validator combining format, disposable blacklist, and MX verification.
 */
export async function validateEmailComprehensive(email) {
  const normalized = normalizeEmail(email);

  if (!isValidEmailFormat(normalized)) {
    return {
      isValid: false,
      reason: 'INVALID_FORMAT',
      message: 'Please provide a valid email address format (e.g. name@domain.com).'
    };
  }

  if (isDisposableEmail(normalized)) {
    return {
      isValid: false,
      reason: 'DISPOSABLE_DOMAIN',
      message: 'Disposable and temporary email domains are not permitted. Please use a permanent email address.'
    };
  }

  const hasMx = await checkMxRecords(normalized);
  if (!hasMx) {
    return {
      isValid: false,
      reason: 'NO_MX_RECORDS',
      message: 'The email domain provided cannot receive mail. Please check for spelling mistakes or use a valid email.'
    };
  }

  return {
    isValid: true,
    normalizedEmail: normalized
  };
}

import crypto from 'crypto';
import logger from './logger';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = (() => {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || 'supersmartx-fallback-secret-at-least-32-chars';
  
  // Always derive a 32-byte key from whatever secret we have
  return crypto.scryptSync(secret, 'salt', 32);
})();
const IV_LENGTH = 12;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(text: string): string {
  try {
    const [ivHex, authTagHex, encrypted] = text.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted format');
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Log decryption errors in development
    if (process.env.NODE_ENV === 'development') {
      logger.error({ error }, "Decryption error");
    }
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Masking Rule: Partially mask sensitive strings (e.g., API keys)
 * Example: sk-ant-api...abcd
 */
export function maskSensitiveData(text: string, visibleChars: number = 4): string {
  if (!text || text.length <= visibleChars * 2) return "********";
  const start = text.slice(0, visibleChars);
  const end = text.slice(-visibleChars);
  return `${start}...${end}`;
}

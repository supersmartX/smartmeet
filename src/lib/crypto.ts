import crypto from 'crypto';
import logger from './logger';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = (() => {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET or NEXTAUTH_SECRET is required for encryption operations');
  }
  if (!process.env.ENCRYPTION_SECRET && process.env.NODE_ENV === 'production') {
    logger.warn('ENCRYPTION_SECRET is not set. Falling back to NEXTAUTH_SECRET. It is recommended to use a dedicated ENCRYPTION_SECRET.');
  }
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

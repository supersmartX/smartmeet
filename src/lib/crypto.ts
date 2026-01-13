import crypto from 'crypto';
import logger from './logger';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = (() => {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is required for encryption operations');
  }
  return crypto.createHash('sha256').update(process.env.NEXTAUTH_SECRET).digest();
})();
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // Log decryption errors in development
    if (process.env.NODE_ENV === 'development') {
      logger.error({ error }, "Decryption error");
    }
    throw new Error('Failed to decrypt data');
  }
}

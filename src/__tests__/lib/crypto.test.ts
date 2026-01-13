import { encrypt, decrypt } from '@/lib/crypto';

describe('Crypto Library', () => {
  const plainText = 'Hello, this is a secret message!';

  it('should encrypt and decrypt text correctly', () => {
    const encrypted = encrypt(plainText);
    expect(encrypted).not.toBe(plainText);
    expect(encrypted).toContain(':');

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should produce different ciphertexts for the same plaintext (IV randomness)', () => {
    const encrypted1 = encrypt(plainText);
    const encrypted2 = encrypt(plainText);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should throw an error for invalid decryption data', () => {
    const invalidData = 'invalid:data';
    expect(() => decrypt(invalidData)).toThrow('Failed to decrypt data');
  });

  it('should throw an error for malformed encrypted strings', () => {
    const malformed = 'not-a-valid-encrypted-string';
    expect(() => decrypt(malformed)).toThrow('Failed to decrypt data');
  });
});

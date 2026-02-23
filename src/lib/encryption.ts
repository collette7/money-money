import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const saltLength = 64;
const tagLength = 16;
const ivLength = 16;
const iterations = 100000;
const keyLength = 32;

function getKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  const decodedKey = Buffer.from(encryptionKey, 'base64');
  if (decodedKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes when base64 decoded');
  }
  
  return decodedKey;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const salt = crypto.randomBytes(saltLength);
  const derivedKey = crypto.pbkdf2Sync(key, salt, iterations, keyLength, 'sha256');
  const iv = crypto.randomBytes(ivLength);
  
  const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

export function decrypt(encryptedData: string): string {
  const key = getKey();
  const data = Buffer.from(encryptedData, 'base64');
  
  const salt = data.slice(0, saltLength);
  const iv = data.slice(saltLength, saltLength + ivLength);
  const tag = data.slice(saltLength + ivLength, saltLength + ivLength + tagLength);
  const encrypted = data.slice(saltLength + ivLength + tagLength);
  
  const derivedKey = crypto.pbkdf2Sync(key, salt, iterations, keyLength, 'sha256');
  
  const decipher = crypto.createDecipheriv(algorithm, derivedKey, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}
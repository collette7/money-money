#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const saltLength = 64;
const tagLength = 16;
const ivLength = 16;
const iterations = 100000;
const keyLength = 32;

function encrypt(plaintext) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  const key = Buffer.from(encryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes when base64 decoded');
  }
  
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

async function encryptExistingTokens() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  if (!process.env.ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, simplefin_access_url')
    .eq('sync_method', 'simplefin')
    .not('simplefin_access_url', 'is', null);

  if (error) {
    console.error('Failed to fetch accounts:', error);
    process.exit(1);
  }

  if (!accounts || accounts.length === 0) {
    console.log('No SimpleFIN accounts found');
    return;
  }

  console.log(`Found ${accounts.length} SimpleFIN accounts to encrypt`);

  let encrypted = 0;
  let failed = 0;

  for (const account of accounts) {
    if (account.simplefin_access_url.length > 200) {
      console.log(`Skipping account ${account.id} - appears already encrypted`);
      continue;
    }

    try {
      const encryptedUrl = encrypt(account.simplefin_access_url);
      
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ simplefin_access_url: encryptedUrl })
        .eq('id', account.id);

      if (updateError) {
        console.error(`Failed to update account ${account.id}:`, updateError);
        failed++;
      } else {
        encrypted++;
      }
    } catch (err) {
      console.error(`Failed to encrypt account ${account.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\nEncryption complete:`);
  console.log(`  Encrypted: ${encrypted}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${accounts.length - encrypted - failed}`);
}

encryptExistingTokens().catch(console.error);
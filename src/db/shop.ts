import type { SQLiteDatabase } from 'expo-sqlite';

const PIN_SALT = 'suuqpos_2024_pin_salt';

async function hashPin(pin: string): Promise<string> {
  // Simple but effective hash using SubtleCrypto (available in Hermes/JSC)
  // Falls back to basic hash if not available
  const data = PIN_SALT + pin;
  try {
    const encoder = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple non-reversible hash for environments without SubtleCrypto
    let h = 0;
    for (let i = 0; i < data.length; i++) {
      h = ((h << 5) - h + data.charCodeAt(i)) | 0;
    }
    return 'h1_' + (h >>> 0).toString(16).padStart(8, '0');
  }
}

export async function getShopValue(db: SQLiteDatabase, key: string): Promise<string | null> {
  try {
    const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM shop WHERE key=?', key);
    return r?.value ?? null;
  } catch {
    return null;
  }
}

export async function setShopValue(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT OR REPLACE INTO shop (key, value) VALUES (?,?)', key, value);
}

export async function isRegistered(db: SQLiteDatabase): Promise<boolean> {
  const phone = await getShopValue(db, 'phone');
  return !!phone;
}

export async function setPin(db: SQLiteDatabase, pin: string) {
  const hashed = await hashPin(pin);
  await setShopValue(db, 'pin', hashed);
}

export async function verifyPin(db: SQLiteDatabase, pin: string): Promise<boolean> {
  const saved = await getShopValue(db, 'pin');
  if (!saved) return false;

  // Migrate plaintext PIN (4 chars = plaintext, longer = already hashed)
  if (saved.length <= 4) {
    if (saved !== pin) return false;
    // Hash it in-place on successful login
    const hashed = await hashPin(pin);
    await setShopValue(db, 'pin', hashed);
    return true;
  }

  const hashed = await hashPin(pin);
  return saved === hashed;
}

interface CacheEntry {
  value: any;
  expiresAt: number;
}

const configCache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export async function getConfig(dataSource: any, key: string, defaultValue: any): Promise<any> {
  const now = Date.now();
  const cached = configCache.get(key);
  if (cached && now < cached.expiresAt) {
    return cached.value;
  }
  try {
    const rows = await dataSource.query(
      `SELECT value FROM configurations WHERE key = $1`,
      [key],
    );
    const value = rows.length > 0 ? rows[0].value : defaultValue;
    configCache.set(key, { value, expiresAt: now + TTL_MS });
    return value;
  } catch {
    return defaultValue;
  }
}

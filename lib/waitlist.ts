import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Persist waitlist signups to a JSON file under /data. Kept intentionally simple:
// the file is small and append-heavy, fits the MVP without pulling in a DB.
const DATA_DIR = path.join(process.cwd(), 'data');
const WAITLIST_FILE = path.join(DATA_DIR, 'waitlist.json');

export type WaitlistEntry = {
  email: string;
  addedAt: string; // ISO timestamp
  reason?: string; // e.g. "rate-limit-hit"
};

async function readWaitlist(): Promise<WaitlistEntry[]> {
  try {
    const raw = await readFile(WAITLIST_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: unknown) {
    // File or directory not existing is fine — we'll create it on first write
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Appends an email to the waitlist. Idempotent: duplicates are ignored to avoid
 * users accidentally spamming themselves in.
 */
export async function addToWaitlist(email: string, reason?: string): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const list = await readWaitlist();
  if (list.some((entry) => entry.email.toLowerCase() === email.toLowerCase())) return;
  list.push({ email, addedAt: new Date().toISOString(), reason });
  await writeFile(WAITLIST_FILE, JSON.stringify(list, null, 2), 'utf8');
}

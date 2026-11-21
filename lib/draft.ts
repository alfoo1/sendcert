// Browser-only autosave of the certificate design (not the recipient list).
// IndexedDB instead of localStorage because template images and logos are
// data URLs that easily exceed localStorage's ~5 MB limit.

const DB_NAME = 'sendcert';
const STORE = 'drafts';
// Bump when the saved shape changes so old drafts are ignored, not misread.
const DRAFT_KEY = 'design-v1';

export type DesignDraft = {
  savedAt: number;
  templateDataUrl: string | null;
  templateId: string | null;
  renderedTemplateDataUrl: string | null;
  textConfig: unknown;
  content: unknown;
  extraFields: unknown;
  emailConfig: unknown;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

// All three swallow errors: private browsing or blocked storage must never
// break the wizard — the draft is a convenience.
export async function loadDraft(): Promise<DesignDraft | null> {
  try {
    return (await run<DesignDraft | undefined>('readonly', (s) => s.get(DRAFT_KEY))) ?? null;
  } catch {
    return null;
  }
}

export async function saveDraft(draft: DesignDraft): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(draft, DRAFT_KEY));
  } catch {
    // ignore
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(DRAFT_KEY));
  } catch {
    // ignore
  }
}

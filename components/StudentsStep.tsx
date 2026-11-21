'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { isValidEmail } from '@/lib/validation';
import { trackEvent } from './Analytics';

export type Recipient = { name: string; email: string };

type Props = {
  recipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
};

type Mode = 'file' | 'manual';

// Common header aliases we accept (case-insensitive, trimmed).
const NAME_KEYS = ['name', 'nombre', 'nombre completo', 'full name'];
const EMAIL_KEYS = ['email', 'correo', 'mail', 'e-mail'];

const EMAIL_IN_TEXT = /[^\s<>,;"']+@[^\s<>,;"']+/;

function pickValue(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

function normalizeRow(row: Record<string, unknown>): Recipient {
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    normalized[k.trim().toLowerCase()] = v;
  }
  return {
    name: pickValue(normalized, NAME_KEYS),
    email: pickValue(normalized, EMAIL_KEYS),
  };
}

/**
 * Parses pasted text: one recipient per line, copied from a spreadsheet
 * (tab-separated), a CSV (comma/semicolon) or an email client
 * ("Maria Johnson <maria@example.com>"). The email is found anywhere on the
 * line; everything else becomes the name.
 */
function parsePasted(text: string): Recipient[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const email = line.match(EMAIL_IN_TEXT)?.[0] ?? '';
      const name = line
        .replace(email, ' ')
        .replace(/[<>,;\t"']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return { name, email };
    })
    .filter((r) => !(r.name.toLowerCase() === 'name' && !r.email));
}

/** Appends rows, skipping emails already in the list (case-insensitive). */
function mergeUnique(
  existing: Recipient[],
  incoming: Recipient[],
): { list: Recipient[]; skipped: number } {
  const seen = new Set(existing.map((r) => r.email.trim().toLowerCase()).filter(Boolean));
  const list = [...existing];
  let skipped = 0;
  for (const r of incoming) {
    const key = r.email.trim().toLowerCase();
    if (key && seen.has(key)) {
      skipped += 1;
      continue;
    }
    if (key) seen.add(key);
    list.push({ name: r.name.trim(), email: r.email.trim() });
  }
  return { list, skipped };
}

// Step 3: add recipients from a file, by typing, or by pasting a list. The
// table is editable so bad rows can be fixed without re-uploading.
export default function StudentsStep({ recipients, onRecipientsChange }: Props) {
  const [mode, setMode] = useState<Mode>('file');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [pasteText, setPasteText] = useState('');

  function addRecipients(incoming: Recipient[], method: 'file' | 'manual' | 'paste', replace = false) {
    const { list, skipped } = mergeUnique(replace ? [] : recipients, incoming);
    onRecipientsChange(list);
    const added = list.length - (replace ? 0 : recipients.length);
    setNotice(
      skipped > 0
        ? `Added ${added}. Skipped ${skipped} duplicate email${skipped === 1 ? '' : 's'}.`
        : null,
    );
    trackEvent('recipients_added', { method, count: added });
  }

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setNotice(null);
      const ext = file.name.split('.').pop()?.toLowerCase();

      try {
        let rows: Record<string, unknown>[];
        if (ext === 'csv') {
          rows = await new Promise((resolve, reject) => {
            Papa.parse<Record<string, string>>(file, {
              header: true,
              skipEmptyLines: true,
              transformHeader: (h) => h.trim().toLowerCase(),
              complete: (res) =>
                res.errors.length > 0
                  ? reject(new Error(`CSV parse error: ${res.errors[0].message}`))
                  : resolve(res.data),
            });
          });
        } else if (ext === 'xlsx' || ext === 'xls') {
          // First sheet only: the conventional choice and simplest UX.
          const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            setError('The Excel file appears to be empty.');
            return;
          }
          rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            workbook.Sheets[sheetName],
            { defval: '' },
          );
        } else {
          setError('Unsupported file type. Please upload a CSV or Excel file.');
          return;
        }

        const parsed = rows.map(normalizeRow).filter((r) => r.name || r.email);
        if (parsed.length === 0) {
          setError('No rows found. Make sure the first row has "name" and "email" columns.');
          return;
        }
        addRecipients(parsed, 'file', true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read the file.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipients, onRecipientsChange],
  );

  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0]) void handleFile(files[0]);
    },
    [handleFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv', '.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  function handleAddOne(e: React.FormEvent) {
    e.preventDefault();
    if (!draftName.trim() || !isValidEmail(draftEmail)) return;
    addRecipients([{ name: draftName, email: draftEmail }], 'manual');
    setDraftName('');
    setDraftEmail('');
    // Keep the cursor in the name field for fast entry of the next person.
    document.getElementById('recipient-name')?.focus();
  }

  function handleAddPasted() {
    const parsed = parsePasted(pasteText);
    if (parsed.length === 0) return;
    addRecipients(parsed, 'paste');
    setPasteText('');
  }

  function updateRow(index: number, patch: Partial<Recipient>) {
    onRecipientsChange(recipients.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    onRecipientsChange(recipients.filter((_, i) => i !== index));
  }

  const validCount = recipients.filter((r) => r.name.trim() && isValidEmail(r.email)).length;
  const invalidCount = recipients.length - validCount;
  const pastedCount = pasteText.trim() ? parsePasted(pasteText).length : 0;
  const canAddOne = Boolean(draftName.trim()) && isValidEmail(draftEmail);

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
      active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Add your recipients</h2>
        <p className="mt-1 text-gray-600">
          Upload a spreadsheet, or type and paste names and emails.
        </p>
      </div>

      <div className="flex max-w-md rounded-lg bg-gray-100 p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          onClick={() => setMode('file')}
          className={tabClass(mode === 'file')}
        >
          Upload a file
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'manual'}
          onClick={() => setMode('manual')}
          className={tabClass(mode === 'manual')}
        >
          Type or paste
        </button>
      </div>

      {mode === 'file' ? (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
            isDragActive
              ? 'border-brand-600 bg-brand-50'
              : 'border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-3xl">📄</div>
          <p className="mt-2 font-medium text-gray-900">
            {isDragActive ? 'Drop the file here' : 'Drag a file here or click to upload'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            CSV or Excel (.csv, .xlsx, .xls) with <code>name</code> and{' '}
            <code>email</code> columns. Uploading replaces the current list.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <form onSubmit={handleAddOne} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="sr-only" htmlFor="recipient-name">Name</label>
            <input
              id="recipient-name"
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Full name"
              autoComplete="off"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <label className="sr-only" htmlFor="recipient-email">Email</label>
            <input
              id="recipient-email"
              type="email"
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="off"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!canAddOne}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add
            </button>
          </form>

          <div>
            <label htmlFor="recipient-paste" className="block text-sm font-medium text-gray-700">
              Or paste a list
            </label>
            <p className="text-xs text-gray-500">
              One person per line. Copy straight from Excel or Google Sheets, or use{' '}
              <code>Name, email</code>.
            </p>
            <textarea
              id="recipient-paste"
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'Maria Johnson, maria@example.com\nJohn Martinez\tjohn@example.com'}
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            />
            <button
              type="button"
              onClick={handleAddPasted}
              disabled={pastedCount === 0}
              className="mt-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pastedCount > 0 ? `Add ${pastedCount} from the list` : 'Add from the list'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {notice}
        </div>
      )}

      {recipients.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-800">
              ✓ {validCount} ready to send
            </span>
            {invalidCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
                {invalidCount} need a fix
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                onRecipientsChange([]);
                setNotice(null);
              }}
              className="ml-auto text-sm text-gray-500 underline hover:text-gray-700"
            >
              Clear list
            </button>
          </div>

          <div className="max-h-96 overflow-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="w-10 px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="w-10 px-3 py-2">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipients.map((r, i) => {
                  const nameMissing = !r.name.trim();
                  const emailInvalid = !isValidEmail(r.email);
                  return (
                    <tr key={i} className={nameMissing || emailInvalid ? 'bg-red-50/60' : ''}>
                      <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5">
                        <input
                          value={r.name}
                          onChange={(e) => updateRow(i, { name: e.target.value })}
                          placeholder="Missing name"
                          aria-label={`Name for row ${i + 1}`}
                          className={`w-full rounded border bg-transparent px-2 py-1 ${
                            nameMissing
                              ? 'border-red-300 placeholder:text-red-400'
                              : 'border-transparent hover:border-gray-200 focus:border-gray-300'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={r.email}
                          onChange={(e) => updateRow(i, { email: e.target.value })}
                          placeholder="Missing email"
                          aria-label={`Email for row ${i + 1}`}
                          className={`w-full rounded border bg-transparent px-2 py-1 font-mono text-xs ${
                            emailInvalid
                              ? 'border-red-300 text-red-700 placeholder:text-red-400'
                              : 'border-transparent hover:border-gray-200 focus:border-gray-300'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          aria-label={`Remove row ${i + 1}`}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="flex items-start gap-2 text-xs text-gray-500">
            <span aria-hidden>🔒</span>
            Your list stays in this browser until you click Send. Guest sends aren&apos;t
            stored.
          </p>
        </>
      )}
    </div>
  );
}

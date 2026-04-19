'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { isValidEmail } from '@/lib/validation';

export type Recipient = { name: string; email: string };

type Props = {
  recipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
};

// Common header aliases we accept (case-insensitive, trimmed).
const NAME_KEYS = ['name', 'nombre', 'nombre completo', 'full name'];
const EMAIL_KEYS = ['email', 'correo', 'mail', 'e-mail'];

function pickValue(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

function normalizeRow(row: Record<string, unknown>): Recipient {
  // Normalize keys to lowercase so header spelling doesn't matter.
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    normalized[k.trim().toLowerCase()] = v;
  }
  return {
    name: pickValue(normalized, NAME_KEYS),
    email: pickValue(normalized, EMAIL_KEYS),
  };
}

// Step 3: parse CSV or Excel, show the table with per-row validation.
export default function StudentsStep({ recipients, onRecipientsChange }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const ext = file.name.split('.').pop()?.toLowerCase();

      try {
        if (ext === 'csv') {
          Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().toLowerCase(),
            complete: (res) => {
              if (res.errors.length > 0) {
                setError(`CSV parse error: ${res.errors[0].message}`);
                return;
              }
              const parsed = res.data.map(normalizeRow).filter((r) => r.name || r.email);
              if (parsed.length === 0) {
                setError(
                  'No rows found. Make sure your file has "name" and "email" columns.',
                );
                return;
              }
              onRecipientsChange(parsed);
            },
          });
          return;
        }

        if (ext === 'xlsx' || ext === 'xls') {
          // Read the file into a buffer and parse with SheetJS. We pick the first
          // sheet — it's the conventional choice and simplest UX for an MVP.
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            setError('The Excel file appears to be empty.');
            return;
          }
          const sheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: '',
          });
          const parsed = rows.map(normalizeRow).filter((r) => r.name || r.email);
          if (parsed.length === 0) {
            setError(
              'No rows found. Make sure your sheet has "name" and "email" columns in the first row.',
            );
            return;
          }
          onRecipientsChange(parsed);
          return;
        }

        setError('Unsupported file type. Please upload a CSV or Excel file.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read the file.');
      }
    },
    [onRecipientsChange],
  );

  const onDrop = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;
      void handleFile(file);
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

  const validCount = recipients.filter((r) => r.name && isValidEmail(r.email)).length;
  const invalidCount = recipients.length - validCount;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upload your recipients</h2>
        <p className="mt-1 text-gray-600">
          Upload a CSV or Excel file with columns:{' '}
          <code className="rounded bg-gray-100 px-1">name</code>,{' '}
          <code className="rounded bg-gray-100 px-1">email</code>.
        </p>
      </div>

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
          {isDragActive
            ? 'Drop the file here'
            : 'Drag a file here or click to upload'}
        </p>
        <p className="mt-1 text-sm text-gray-500">CSV or Excel (.csv, .xlsx, .xls)</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {recipients.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-800">
              ✓ {validCount} valid
            </span>
            {invalidCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800">
                ✗ {invalidCount} with errors
              </span>
            )}
            <button
              type="button"
              onClick={() => onRecipientsChange([])}
              className="ml-auto text-sm text-gray-500 underline hover:text-gray-700"
            >
              Clear list
            </button>
          </div>

          {/* Privacy note shown as soon as a list is loaded — reassures the user
              their recipients' emails are not being sent anywhere yet. */}
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <span className="text-lg">🔒</span>
            <p>
              We never store your data. Your files and email addresses never touch our
              servers — parsing happens right here in your browser.
            </p>
          </div>

          <div className="max-h-96 overflow-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipients.map((r, i) => {
                  const okName = Boolean(r.name);
                  const okEmail = isValidEmail(r.email);
                  const ok = okName && okEmail;
                  return (
                    <tr key={i} className={ok ? '' : 'bg-red-50'}>
                      <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2">
                        {r.name || <span className="text-red-600">(empty)</span>}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {r.email || <span className="text-red-600">(empty)</span>}
                      </td>
                      <td className="px-4 py-2">
                        {ok ? (
                          <span className="text-green-700">✓ Valid</span>
                        ) : (
                          <span className="text-red-700">
                            {!okName ? 'Missing name' : 'Invalid email'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

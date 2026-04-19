'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PRESET_TEMPLATES } from '@/lib/templates';
import { trackEvent } from './Analytics';

type Props = {
  templateDataUrl: string | null;
  templateId: string | null;
  onTemplateChange: (payload: {
    templateDataUrl: string | null;
    templateId: string | null;
  }) => void;
};

// Step 1: user uploads their own image OR picks one of the 3 presets.
export default function TemplateStep({ templateDataUrl, templateId, onTemplateChange }: Props) {
  // Convert the file to a data URL so the whole flow stays client-side; we only
  // send the encoded payload to the server when we actually need a PDF.
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onTemplateChange({ templateDataUrl: reader.result, templateId: null });
          trackEvent('template_selected', { source: 'upload' });
        }
      };
      reader.readAsDataURL(file);
    },
    [onTemplateChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: 1,
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Choose your template</h2>
        <p className="mt-1 text-gray-600">
          Upload your own design or pick one of our included templates.
        </p>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
          isDragActive
            ? 'border-brand-600 bg-brand-50'
            : 'border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl">📁</div>
        <p className="mt-2 font-medium text-gray-900">
          {isDragActive ? 'Drop the image here' : 'Drag an image here or click to upload'}
        </p>
        <p className="mt-1 text-sm text-gray-500">Formats: JPG, PNG · max 1 file</p>
      </div>

      {/* Live preview of the uploaded image — so the user can see the actual
          certificate they just chose, not just a confirmation line. */}
      {templateDataUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
              ✓
            </span>
            Template loaded — this is how it looks:
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={templateDataUrl}
              alt="Uploaded template preview"
              className="block w-full"
            />
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-sm text-gray-500">
            or choose an included template
          </span>
        </div>
      </div>

      {/* Presets */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PRESET_TEMPLATES.map((tpl) => {
          const isSelected = templateId === tpl.id && !templateDataUrl;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                onTemplateChange({ templateDataUrl: null, templateId: tpl.id });
                trackEvent('template_selected', { source: 'preset', templateId: tpl.id });
              }}
              className={`group overflow-hidden rounded-xl border-2 bg-white text-left transition ${
                isSelected
                  ? 'border-brand-600 ring-2 ring-brand-200'
                  : 'border-gray-200 hover:border-brand-300'
              }`}
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tpl.path}
                  alt={tpl.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{tpl.name}</span>
                  {isSelected && (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                      Selected
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{tpl.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

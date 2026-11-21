'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PRESET_TEMPLATES } from '@/lib/templates';
import { TemplateThumbnail } from './CertificateRenderer';
import { trackEvent } from './Analytics';

type Props = {
  templateDataUrl: string | null;
  templateId: string | null;
  onTemplateChange: (payload: {
    templateDataUrl: string | null;
    templateId: string | null;
  }) => void;
};

// Step 1: pick a built-in design (most people) or upload your own image.
export default function TemplateStep({ templateDataUrl, templateId, onTemplateChange }: Props) {
  // Keep the upload client-side as a data URL; it only goes to the server
  // when a PDF is generated.
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
          Pick a design — you can change every word, the color and add your logo in the
          next step.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRESET_TEMPLATES.map((tpl) => {
          const isSelected = templateId === tpl.id && !templateDataUrl;
          return (
            <button
              key={tpl.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                onTemplateChange({ templateDataUrl: null, templateId: tpl.id });
                trackEvent('template_selected', { source: 'preset', templateId: tpl.id });
              }}
              className={`group overflow-hidden rounded-xl border-2 bg-white text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                isSelected
                  ? 'border-brand-600 ring-2 ring-brand-100'
                  : 'border-gray-200 hover:border-brand-500/50 hover:shadow-md'
              }`}
            >
              <div className="border-b border-gray-100 bg-gray-50 p-3">
                <div className="overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
                  <TemplateThumbnail templateId={tpl.id} />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
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

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-sm text-gray-500">or use your own design</span>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragActive
            ? 'border-brand-600 bg-brand-50'
            : 'border-gray-300 bg-gray-50 hover:border-brand-500/60 hover:bg-brand-50'
        }`}
      >
        <input {...getInputProps()} />
        <svg
          className="mx-auto h-8 w-8 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 16V4m0 0-4 4m4-4 4 4" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <p className="mt-2 font-medium text-gray-900">
          {isDragActive ? 'Drop the image here' : 'Drag an image here or click to upload'}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          JPG or PNG from Canva, Figma or any design tool. Leave space for the name.
        </p>
      </div>

      {templateDataUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
              ✓
            </span>
            Your design is loaded — this is how it looks:
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={templateDataUrl} alt="Uploaded template preview" className="block w-full" />
          </div>
        </div>
      )}
    </div>
  );
}

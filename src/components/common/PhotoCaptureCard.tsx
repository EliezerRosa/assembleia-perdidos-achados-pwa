import React, { useRef, useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, Trash2, ZoomIn } from 'lucide-react';
import { compressImageFile, estimateDataUrlKB } from '../../services/photoService';

interface PhotoCaptureCardProps {
  title: string;
  subtitle: string;
  stepBadge: string;
  value: string;
  onChange: (dataUrl: string) => void;
  watermarkTag?: string;
  required?: boolean;
  accent?: 'sky' | 'amber' | 'emerald';
}

export const PhotoCaptureCard: React.FC<PhotoCaptureCardProps> = ({
  title,
  subtitle,
  stepBadge,
  value,
  onChange,
  watermarkTag,
  required,
  accent = 'sky',
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const result = await compressImageFile(file, {
        maxDimension: 900,
        quality: 0.72,
        watermarkTag,
      });
      onChange(result.dataUrl);
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  const accentClasses = {
    sky: 'border-sky-200 bg-sky-50/50',
    amber: 'border-amber-200 bg-amber-50/50',
    emerald: 'border-emerald-200 bg-emerald-50/50',
  }[accent];

  const badgeClasses = {
    sky: 'bg-sky-700 text-white',
    amber: 'bg-amber-600 text-white',
    emerald: 'bg-emerald-700 text-white',
  }[accent];

  const sizeKB = value.startsWith('data:') ? estimateDataUrlKB(value) : null;

  return (
    <div className={`rounded-2xl border-2 border-dashed p-3.5 transition ${value ? 'border-emerald-400 bg-emerald-50/30' : accentClasses}`}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${badgeClasses}`}>
              {stepBadge}
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              {title}
              {required && <span className="ml-1 text-rose-600">*</span>}
            </h4>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>
        </div>
        {value && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {sizeKB ? `${sizeKB} KB` : 'Foto OK'}
          </span>
        )}
      </div>

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
          <img
            src={value}
            alt={title}
            className="h-44 w-full object-contain bg-slate-950"
          />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/80 text-white hover:bg-slate-900"
              title="Ampliar foto"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600/90 text-white hover:bg-rose-700"
              title="Remover foto"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={processing}
          onClick={() => cameraInputRef.current?.click()}
          className="touch-target flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#162d4b] active:scale-[0.99] transition"
        >
          <Camera className="h-4 w-4" />
          {processing ? 'Comprimindo...' : value ? 'Nova Foto (Câmera)' : 'Fotografar Agora'}
        </button>
        <button
          type="button"
          disabled={processing}
          onClick={() => fileInputRef.current?.click()}
          className="touch-target flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition"
        >
          <ImagePlus className="h-4 w-4" />
          Galeria / Arquivo
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {zoomOpen && value && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <img src={value} alt={title} className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
};

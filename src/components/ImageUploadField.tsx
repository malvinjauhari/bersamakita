import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, UploadCloud, X } from 'lucide-react';
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE_BYTES,
  uploadImageToCloudinary,
  validateImageFile,
} from '../integrations/cloudinary/upload';

export interface ImageUploadFieldProps {
  /** Field label rendered above the control. */
  label?: string;
  /** Current stored image URL. Legacy external URLs are previewed as-is. */
  value?: string;
  /** Cloudinary public_id belonging to `value` (empty for legacy URLs). */
  publicId?: string;
  /** Cloudinary folder whitelisted by the backend sign endpoint. */
  folder: string;
  /** Called after a successful upload, or with empty values when removed. */
  onChange: (url: string, publicId?: string) => void;
  /** Lets the parent disable its submit button while an upload is in flight. */
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
  hint?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  publicId,
  folder,
  onChange,
  onUploadingChange,
  disabled = false,
  hint,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const settleUploading = () => {
    setUploading(false);
    setProgress(0);
    onUploadingChange?.(false);
  };

  const handlePickClick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so the same file can be re-picked after a failure.
    event.target.value = '';
    if (!file) return;

    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);
    onUploadingChange?.(true);
    try {
      const uploaded = await uploadImageToCloudinary(file, folder, setProgress);
      onChange(uploaded.secureUrl, uploaded.publicId);
    } catch (err: any) {
      setError(err?.message || 'Upload gambar gagal. Silakan coba lagi.');
    } finally {
      settleUploading();
    }
  };

  const handleRemove = () => {
    if (disabled || uploading) return;
    setError(null);
    onChange('', undefined);
  };

  const busy = uploading || disabled;

  return (
    <div className="space-y-1.5">
      {label && <label className="block font-semibold text-slate-700 mb-1">{label}</label>}

      <div
        className={`rounded-xl border ${
          error ? 'border-rose-300' : 'border-slate-200'
        } bg-slate-50 overflow-hidden`}
      >
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt="Pratinjau gambar"
              className="w-full h-40 object-cover bg-slate-100"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0.35';
              }}
            />
            {!busy && (
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={handlePickClick}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-[11px] font-bold text-slate-700 border border-slate-200 shadow-sm cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Ganti</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-rose-50 text-[11px] font-bold text-rose-600 border border-slate-200 shadow-sm cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePickClick}
            disabled={busy}
            className="w-full h-32 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ImagePlus className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-semibold">Pilih Gambar dari Perangkat</span>
            <span className="text-[10px] text-slate-400">
              {ACCEPTED_IMAGE_EXTENSIONS} · maks {MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB
            </span>
          </button>
        )}
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Mengunggah gambar... {progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!uploading && error && (
        <p className="text-[11px] font-semibold text-rose-600">{error}</p>
      )}

      {!uploading && !value && !error && hint && (
        <p className="text-[10px] text-slate-400">{hint}</p>
      )}

      {publicId && !uploading && (
        <p className="text-[10px] text-slate-400 font-mono truncate">ID: {publicId}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={busy}
      />
    </div>
  );
};

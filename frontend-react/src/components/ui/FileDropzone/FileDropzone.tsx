import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface FileDropzoneProps {
  accept?:       string;          // ex. ".pdf,.jpg,.png"
  maxSizeMb?:    number;
  onFileChange?: (file: File | null) => void;
  error?:        string;
  disabled?:     boolean;
  className?:    string;
}

export function FileDropzone({
  accept         = '.pdf,.jpg,.jpeg,.png',
  maxSizeMb      = 10,
  onFileChange,
  error,
  disabled,
  className,
}: FileDropzoneProps) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [isDragging, setDrag] = useState(false);
  const [file, setFile]       = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = error ?? localError;

  const validate = (f: File): string | null => {
    const mbSize = f.size / 1024 / 1024;
    if (mbSize > maxSizeMb) return `Taille maximale : ${maxSizeMb} Mo. Votre fichier : ${mbSize.toFixed(1)} Mo`;
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    const accepted = accept.split(',').map((a) => a.trim().toLowerCase());
    if (!accepted.includes(ext)) return `Format non accepté. Formats valides : ${accept}`;
    return null;
  };

  const handleFile = (f: File) => {
    const err = validate(f);
    if (err) { setLocalError(err); setFile(null); onFileChange?.(null); return; }
    setLocalError(null);
    setFile(f);
    onFileChange?.(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const clear = () => {
    setFile(null);
    setLocalError(null);
    onFileChange?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
            'p-8 text-center transition-all duration-150',
            'focus-visible:ring-2 focus-visible:ring-primary-500',
            isDragging
              ? 'border-primary-400 bg-primary-50 scale-[1.01]'
              : displayedError
                ? 'border-status-danger bg-status-danger-bg/30'
                : 'border-ink-300 bg-ink-50 hover:border-primary-400 hover:bg-primary-50',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Upload className="h-6 w-6 text-primary-600" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-700">
              Glissez-déposez votre fichier ici
            </p>
            <p className="text-xs text-primary-600 font-medium mt-0.5">
              ou cliquez pour parcourir
            </p>
          </div>
          <p className="text-xs text-ink-400">
            Formats acceptés : {accept.replace(/\./g, '').toUpperCase()} — Taille maximale : {maxSizeMb} Mo
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={onChange}
            className="sr-only"
            aria-hidden
          />
        </button>
      ) : (
        /* Fichier sélectionné */
        <div className="flex items-center gap-3 rounded-xl border border-status-success/30 bg-status-success-bg p-4">
          <CheckCircle className="h-5 w-5 shrink-0 text-status-success" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-800 truncate">{file.name}</p>
            <p className="text-xs text-ink-500">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="rounded-md p-1 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
            aria-label="Supprimer le fichier"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {displayedError && (
        <div className="flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-status-danger mt-0.5" aria-hidden />
          <p role="alert" className="text-xs text-status-danger font-medium">
            {displayedError}
          </p>
        </div>
      )}
    </div>
  );
}

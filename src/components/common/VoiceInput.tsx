import React, { useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { isSpeechRecognitionSupported, startSingleUtteranceRecognition } from '../../services/voiceService';

interface VoiceInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  helperText?: string;
  appendMode?: boolean;
  className?: string;
}

/**
 * Campo de texto acessível com botão de ditado por voz integrado (Web Speech API pt-BR).
 */
export const VoiceInput: React.FC<VoiceInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  multiline = false,
  rows = 3,
  helperText,
  appendMode = false,
  className = '',
}) => {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const stopRef = useRef<(() => void) | null>(null);
  const supported = isSpeechRecognitionSupported();

  const toggleVoice = () => {
    setErrorMsg('');
    if (listening) {
      stopRef.current?.();
      setListening(false);
      setInterim('');
      return;
    }

    stopRef.current = startSingleUtteranceRecognition({
      onStart: () => setListening(true),
      onInterim: (txt) => setInterim(txt),
      onFinal: (txt) => {
        const clean = txt.trim();
        if (clean) {
          onChange(appendMode && value.trim() ? `${value.trim()} ${clean}` : clean);
        }
        setInterim('');
      },
      onEnd: () => {
        setListening(false);
        setInterim('');
      },
      onError: (msg) => {
        setErrorMsg(msg);
        setListening(false);
      },
    });
  };

  const baseInputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition';

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span>
            {label}
            {required && <span className="ml-1 text-rose-600">*</span>}
          </span>
          {listening && <span className="text-[11px] font-bold text-rose-600 animate-pulse">Ouvindo ditado...</span>}
        </label>
      )}
      <div className="relative">
        {multiline ? (
          <textarea
            id={id}
            rows={rows}
            value={listening && interim ? (value ? `${value} ${interim}` : interim) : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className={baseInputClass}
          />
        ) : (
          <input
            id={id}
            type="text"
            value={listening && interim ? (value ? `${value} ${interim}` : interim) : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className={`${baseInputClass} min-h-[44px]`}
          />
        )}
        <button
          type="button"
          onClick={toggleVoice}
          disabled={!supported}
          title={
            supported
              ? listening
                ? 'Parar ditado por voz'
                : `Ditar "${label ?? 'campo'}" por voz`
              : 'Ditado por voz não suportado neste navegador'
          }
          aria-label={listening ? 'Parar ditado por voz' : `Ditar ${label ?? 'campo'} por voz`}
          className={`absolute right-2 ${multiline ? 'top-2' : 'top-1/2 -translate-y-1/2'} flex h-9 w-9 items-center justify-center rounded-lg transition ${
            listening
              ? 'bg-rose-600 text-white voice-listening'
              : supported
                ? 'bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-700'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
      </div>
      {helperText && !errorMsg && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      {errorMsg && <p className="mt-1 text-xs font-medium text-rose-600">{errorMsg}</p>}
    </div>
  );
};

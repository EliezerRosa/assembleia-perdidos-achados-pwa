import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { ORIENTACOES_OFICIAIS } from '../../constants/catalog';

interface PolicyModalProps {
  open: boolean;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  const toneMap = {
    info: 'border-sky-200 bg-sky-50/70 text-sky-950',
    warning: 'border-orange-200 bg-orange-50/80 text-orange-950',
    danger: 'border-rose-300 bg-rose-50 text-rose-950',
    amber: 'border-amber-300 bg-amber-50 text-amber-950',
    teal: 'border-teal-200 bg-teal-50/80 text-teal-950',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
      <div className="hc-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-300" />
            <div>
              <h2 className="text-base font-bold">Orientações Oficiais do Departamento</h2>
              <p className="text-xs text-sky-200">Achados e Perdidos & Guarda-Volumes (Parágrafos 54 a 58)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
            aria-label="Fechar orientações"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-5">
          {ORIENTACOES_OFICIAIS.map((item) => (
            <div key={item.paragrafo} className={`rounded-xl border p-4 ${toneMap[item.destaque]}`}>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-md bg-slate-900/10 px-2 py-0.5 text-xs font-extrabold">
                  § {item.paragrafo}
                </span>
                <h3 className="text-sm font-bold">{item.titulo}</h3>
              </div>
              <p className="text-sm leading-relaxed">{item.texto}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-xl bg-[#1e3a5f] px-5 py-2 text-sm font-bold text-white hover:bg-[#152a45]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

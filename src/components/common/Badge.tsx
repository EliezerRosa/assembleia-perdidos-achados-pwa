import React from 'react';
import { DESTINO_STYLE, STATUS_STYLE, VALOR_STYLE } from '../../constants/catalog';
import type { CategoriaItem, DestinoSA, StatusItem, ValorItem } from '../../types/domain';
import { AlertTriangle, Lock, ShieldAlert, UserRound } from 'lucide-react';

export const StatusBadge: React.FC<{ status: StatusItem }> = ({ status }) => {
  const st = STATUS_STYLE[status] ?? STATUS_STYLE['Ainda Guardado'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.bg} ${st.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
      {status}
    </span>
  );
};

export const ValorBadge: React.FC<{ valor: ValorItem }> = ({ valor }) => {
  const st = VALOR_STYLE[valor] ?? VALOR_STYLE.Baixo;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${st.bg} ${st.text} ${st.border}`}
      title={st.restricted ? 'Política #55: Artigo de valor não deve ficar exposto' : undefined}
    >
      {st.restricted && <Lock className="h-3 w-3" />}
      Valor {valor}
    </span>
  );
};

export const CategoriaBadge: React.FC<{ categoria: CategoriaItem }> = ({ categoria }) => {
  const isPerson = categoria === 'Criança' || categoria === 'Idoso' || categoria === 'Adulto';
  const cls = isPerson
    ? 'bg-rose-600 text-white'
    : categoria === 'Guardado'
      ? 'bg-blue-100 text-blue-900 border border-blue-200'
      : 'bg-slate-100 text-slate-800 border border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {isPerson && <UserRound className="h-3 w-3" />}
      {categoria === 'Guardado' ? 'Guarda-Volumes' : categoria}
    </span>
  );
};

export const DestinoBadge: React.FC<{ destino: DestinoSA }> = ({ destino }) => {
  if (!destino) return null;
  const st = DESTINO_STYLE[destino];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${st.bg} ${st.text}`}>
      SA: {st.label}
    </span>
  );
};

export const SecurityBadge: React.FC<{ kind: 'restricted' | 'lost-person' | 'retained'; label?: string }> = ({
  kind,
  label,
}) => {
  if (kind === 'lost-person') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white animate-pulse">
        <ShieldAlert className="h-3.5 w-3.5" />
        {label ?? 'Protocolo #56 — Avisar Indicadores/SA/SC'}
      </span>
    );
  }
  if (kind === 'retained') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
        <AlertTriangle className="h-3.5 w-3.5" />
        {label ?? 'Retido (>60d)'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-800">
      <Lock className="h-3 w-3" />
      {label ?? 'Não Expor (#55)'}
    </span>
  );
};

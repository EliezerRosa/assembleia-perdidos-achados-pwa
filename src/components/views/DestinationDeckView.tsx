import React, { useMemo, useState } from 'react';
import {
  Archive,
  Banknote,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gift,
  Send,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { getMesesGuardadoTexto, isCashItem, isItemRetido } from '../../services/trackingService';
import { useAppStore } from '../../store/useAppStore';
import type { DestinoSA, Item } from '../../types/domain';
import { DestinoBadge, StatusBadge, ValorBadge } from '../common/Badge';

interface DestinationDeckViewProps {
  onSelectItem: (item: Item) => void;
}

export const DestinationDeckView: React.FC<DestinationDeckViewProps> = ({ onSelectItem }) => {
  const { db, dispatchItemSA, setPoliciesOpen } = useAppStore();

  const [mode, setMode] = useState<'retidos' | 'despachados'>('retidos');
  const [includeRecent, setIncludeRecent] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [selectedDestino, setSelectedDestino] = useState<Exclude<DestinoSA, ''>>('DOAR');

  const eventsById = useMemo(() => new Map(db.eventos.map((e) => [e.id, e])), [db.eventos]);

  const retidos = useMemo(() => {
    return db.itens
      .filter((i) => {
        if (i.status !== 'Ainda Guardado' && i.status !== 'Em Conferência') return false;
        if (includeRecent) return true;
        return isItemRetido(i, db.config.prazoRetencaoDias);
      })
      .sort((a, b) => a.dataHoraGuardado.localeCompare(b.dataHoraGuardado));
  }, [db.itens, db.config.prazoRetencaoDias, includeRecent]);

  const despachados = useMemo(
    () =>
      db.itens
        .filter((i) => i.status === 'DESPACHADO' || i.destino === 'CONTAS')
        .sort((a, b) => (b.dataHoraDespachado || '').localeCompare(a.dataHoraDespachado || '')),
    [db.itens],
  );

  const safeIndex = retidos.length > 0 ? Math.min(cardIndex, retidos.length - 1) : 0;
  const currentItem = retidos[safeIndex];
  const currentEvent = currentItem ? eventsById.get(currentItem.eventoId) : undefined;

  const handleDispatchCurrent = () => {
    if (!currentItem) return;
    dispatchItemSA(
      currentItem.id,
      selectedDestino,
      `Destinado pelo Superintendente de Assembleia via painel Destinar (${getMesesGuardadoTexto(currentItem.dataHoraGuardado)} em guarda).`,
    );
    setCardIndex((prev) => Math.max(0, Math.min(prev, retidos.length - 2)));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Botão vermelho de Orientações (fiel ao Glide!) */}
      <button
        type="button"
        onClick={() => setPoliciesOpen(true)}
        className="touch-target flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-extrabold text-white shadow-md hover:bg-rose-700 transition"
      >
        <BookOpen className="h-4 w-4" />
        ORIENTAÇÕES OFICIAIS (§54–58 • Regras de Destinação SA)
      </button>

      {/* Contadores RETIDO vs DESPACHADO */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode('retidos')}
          className={`touch-target rounded-2xl border-2 px-4 py-3 text-sm font-extrabold transition ${
            mode === 'retidos'
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          RETIDO ({retidos.length})
        </button>
        <button
          type="button"
          onClick={() => setMode('despachados')}
          className={`touch-target rounded-2xl border-2 px-4 py-3 text-sm font-extrabold transition ${
            mode === 'despachados'
              ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-md'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          DESPACHADO ({despachados.length})
        </button>
      </div>

      {/* Filtro opcional para antecipar destinação */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs text-emerald-950">
        <p>
          <strong>O que são itens RETIDOS?</strong> Itens <em>Ainda Guardados</em> há mais de{' '}
          <strong>{db.config.prazoRetencaoDias} dias</strong> (2 meses), prontos para destinação pelo SA.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={includeRecent}
            onChange={(e) => {
              setIncludeRecent(e.target.checked);
              setCardIndex(0);
            }}
            className="h-4 w-4 accent-[#1e3a5f]"
          />
          Mostrar também itens recentes (&lt;{db.config.prazoRetencaoDias}d)
        </label>
      </div>

      {mode === 'retidos' ? (
        currentItem ? (
          <div className="hc-card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
            {/* Cabeçalho do Cartão */}
            <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">
              <span>
                {currentEvent
                  ? `${currentEvent.tipo.toUpperCase()} | ${currentEvent.codigo} | ${currentEvent.data.split('-').reverse().join('/')}`
                  : 'EVENTO'}
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5">
                {safeIndex + 1} de {retidos.length}
              </span>
            </div>

            {/* Imagem com overlay estilo Glide Deck */}
            <div className="relative h-64 w-full bg-slate-950">
              {currentItem.fotoEntrada ? (
                <img
                  src={currentItem.fotoEntrada}
                  alt={currentItem.tipoItem}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">Sem foto</div>
              )}

              {/* Setas de navegação do deck */}
              {retidos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCardIndex((i) => (i - 1 + retidos.length) % retidos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-slate-900 shadow-lg"
                    aria-label="Item anterior"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardIndex((i) => (i + 1) % retidos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-slate-900 shadow-lg"
                    aria-label="Próximo item"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-4 text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-amber-400 px-2.5 py-0.5 text-xs font-black text-slate-950">
                    Etiqueta #{currentItem.etiquetaCodigo}
                  </span>
                  <span className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-bold">
                    Guardado há {getMesesGuardadoTexto(currentItem.dataHoraGuardado)}
                  </span>
                  <ValorBadge valor={currentItem.valor} />
                </div>
                <h3 className="mt-1.5 text-lg font-extrabold">{currentItem.tipoItem}</h3>
                <p className="text-xs text-slate-200">{currentItem.descricao}</p>
              </div>
            </div>

            {/* Seleção de Destino SA */}
            <div className="space-y-4 p-5">
              {isCashItem(currentItem) && (
                <div className="rounded-xl border border-blue-300 bg-blue-50 p-3 text-xs font-semibold text-blue-900">
                  Política #57: Dinheiro não procurado deve ser encaminhado ao <strong>Departamento de Contas</strong>.
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Destino do Item — Definido pelo SA *
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {(
                    [
                      ['DESCARTAR', 'Descartar', Trash2, 'rose'],
                      ['DOAR', 'Doar', Gift, 'emerald'],
                      ['VENDER', 'Vender', ShoppingBag, 'amber'],
                      ['CONTAS', 'Contas', Banknote, 'blue'],
                    ] as const
                  ).map(([val, label, Icon, tone]) => {
                    const active = selectedDestino === val;
                    const activeCls = {
                      rose: 'border-rose-600 bg-rose-600 text-white',
                      emerald: 'border-emerald-600 bg-emerald-600 text-white',
                      amber: 'border-amber-600 bg-amber-600 text-white',
                      blue: 'border-blue-700 bg-blue-700 text-white',
                    }[tone];
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSelectedDestino(val)}
                        className={`touch-target flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-xs font-extrabold transition ${
                          active ? `${activeCls} shadow-md` : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDispatchCurrent}
                  className="touch-target flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
                >
                  <Send className="h-4 w-4" />
                  DESPACHAR ITEM ACIMA ({selectedDestino})
                </button>
                <button
                  type="button"
                  onClick={() => onSelectItem(currentItem)}
                  className="touch-target rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Ver Rastreio Completo
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-emerald-300 bg-white p-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-3 text-base font-extrabold text-slate-900">Nenhum item retido pendente de destinação!</h3>
            <p className="mt-1 text-xs text-slate-500">
              Todos os itens com mais de {db.config.prazoRetencaoDias} dias já foram entregues ou destinados pelo SA.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {despachados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
              <Archive className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2">Nenhum item despachado pelo SA ainda.</p>
            </div>
          ) : (
            despachados.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item)}
                className="hc-card flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left hover:border-sky-400 transition"
              >
                {item.fotoEntrada && (
                  <img src={item.fotoEntrada} alt={item.tipoItem} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-950">
                      #{item.etiquetaCodigo}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">{item.tipoItem}</span>
                    <DestinoBadge destino={item.destino} />
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{item.descricao}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Despachado em{' '}
                    {item.dataHoraDespachado ? new Date(item.dataHoraDespachado).toLocaleString('pt-BR') : '-'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

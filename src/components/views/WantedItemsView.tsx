import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Item, ItemProcurado } from '../../types/domain';
import { StatusBadge, ValorBadge } from '../common/Badge';
import { PhotoCaptureCard } from '../common/PhotoCaptureCard';
import { VoiceInput } from '../common/VoiceInput';

interface WantedItemsViewProps {
  onSelectItem: (item: Item) => void;
  forceOpenNew?: boolean;
  onResetForceOpen?: () => void;
}

function computeMatchScore(wanted: string, item: Item): number {
  const words = wanted
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
  if (words.length === 0) return 0;
  const hay = `${item.tipoItem} ${item.descricao} ${item.categoria} ${item.valor}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  let hits = 0;
  for (const w of words) {
    if (hay.includes(w)) hits++;
  }
  return Math.round((hits / words.length) * 100);
}

export const WantedItemsView: React.FC<WantedItemsViewProps> = ({
  onSelectItem,
  forceOpenNew,
  onResetForceOpen,
}) => {
  const { db, activeEvento, createProcurado, updateProcurado, deleteProcurado, notify } = useAppStore();

  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // New wanted form
  const [nomeTelefone, setNomeTelefone] = useState('');
  const [congregacao, setCongregacao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [foto, setFoto] = useState('');

  const isNewOpen = showNew || Boolean(forceOpenNew);

  const filteredProcurados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.procurados.filter((p) => {
      if (!q) return true;
      return `${p.nomeTelefone} ${p.congregacao} ${p.descricao}`.toLowerCase().includes(q);
    });
  }, [db.procurados, search]);

  const selectedWanted: ItemProcurado | undefined = db.procurados.find((p) => p.id === selectedId);

  const suggestedMatches = useMemo(() => {
    if (!selectedWanted) return [];
    return db.itens
      .map((item) => ({ item, score: computeMatchScore(selectedWanted.descricao, item) }))
      .sort((a, b) => b.score - a.score);
  }, [selectedWanted, db.itens]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeTelefone.trim() || !descricao.trim()) {
      notify('Informe o nome/telefone de quem procura e a descrição do item.', 'warning');
      return;
    }
    const autoMatches = db.itens
      .filter((i) => computeMatchScore(descricao, i) >= 40)
      .slice(0, 5)
      .map((i) => i.id);

    const created = createProcurado({
      eventoId: activeEvento?.id ?? db.eventos[0]?.id ?? 'geral',
      nomeTelefone: nomeTelefone.trim(),
      congregacao: congregacao.trim(),
      descricao: descricao.trim(),
      foto,
      provaveisItensIds: autoMatches,
      status: autoMatches.length > 0 ? 'LOCALIZADO' : 'PROCURANDO',
    });
    setNomeTelefone('');
    setCongregacao('');
    setDescricao('');
    setFoto('');
    setShowNew(false);
    onResetForceOpen?.();
    setSelectedId(created.id);
  };

  const toggleCandidate = (wanted: ItemProcurado, itemId: string) => {
    const exists = wanted.provaveisItensIds.includes(itemId);
    const nextIds = exists
      ? wanted.provaveisItensIds.filter((id) => id !== itemId)
      : [...wanted.provaveisItensIds, itemId];
    updateProcurado({
      ...wanted,
      provaveisItensIds: nextIds,
      status: nextIds.length > 0 && wanted.status === 'PROCURANDO' ? 'LOCALIZADO' : wanted.status,
    });
  };

  return (
    <div className="space-y-4">
      <div className="hc-card flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Itens Procurados</h2>
          <p className="text-xs text-slate-500">
            Registre solicitações de itens que ainda não apareceram no balcão e vincule automaticamente prováveis
            correspondências (incluindo itens já entregues para rastreio).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="touch-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#152b47]"
        >
          <Plus className="h-4 w-4" />
          Novo Item Procurado
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pessoa, telefone ou descrição do item procurado..."
          className="min-h-[44px] w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm focus:border-sky-600 focus:outline-none"
        />
      </div>

      {/* Formulário Novo Item Procurado */}
      {isNewOpen && (
        <form
          onSubmit={handleCreate}
          className="hc-card space-y-3.5 rounded-2xl border-2 border-sky-400 bg-white p-5 shadow-md"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase text-[#1e3a5f]">Cadastrar Novo Item Procurado</h3>
            <button
              type="button"
              onClick={() => {
                setShowNew(false);
                onResetForceOpen?.();
              }}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <VoiceInput
              label="Nome e Telefone de Quem Procura"
              required
              value={nomeTelefone}
              onChange={setNomeTelefone}
              placeholder="Nome completo e WhatsApp"
            />
            <VoiceInput
              label="Congregação"
              value={congregacao}
              onChange={setCongregacao}
              placeholder="Nome da congregação"
            />
          </div>

          <VoiceInput
            label="Descrição do Item Procurado"
            required
            multiline
            rows={3}
            value={descricao}
            onChange={setDescricao}
            placeholder="Descreva cor, marca, tamanho, local provável onde perdeu..."
          />

          <PhotoCaptureCard
            stepBadge="Referência"
            title="Foto de Referência (opcional)"
            subtitle="Se o dono tiver uma foto do item (ex.: enviada por WhatsApp), anexe aqui."
            value={foto}
            onChange={setFoto}
            accent="sky"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowNew(false);
                onResetForceOpen?.();
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="touch-target rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
            >
              Salvar e Buscar Correspondências
            </button>
          </div>
        </form>
      )}

      {/* Split View: Lista à esquerda + Detalhe/Correspondências à direita */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-2.5 lg:col-span-5">
          {filteredProcurados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
              Nenhum item procurado cadastrado.
            </div>
          ) : (
            filteredProcurados.map((p) => {
              const active = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`hc-card flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                    active ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {p.foto ? (
                    <img src={p.foto} alt={p.descricao} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <UserRound className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-extrabold text-slate-900">{p.nomeTelefone}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.status === 'ENTREGUE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'LOCALIZADO'
                              ? 'bg-sky-100 text-sky-900'
                              : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{p.descricao}</p>
                    <p className="mt-1 text-[11px] font-semibold text-sky-700">
                      {p.provaveisItensIds.length} provável(is) selecionado(s) •{' '}
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Painel de Correspondência */}
        <div className="lg:col-span-7">
          {selectedWanted ? (
            <div className="hc-card space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase text-sky-700">Solicitação Selecionada</span>
                  <h3 className="text-base font-extrabold text-slate-900">{selectedWanted.nomeTelefone}</h3>
                  {selectedWanted.congregacao && (
                    <p className="text-xs text-slate-500">Congregação: {selectedWanted.congregacao}</p>
                  )}
                  <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{selectedWanted.descricao}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Remover este registro de item procurado?')) {
                      deleteProcurado(selectedWanted.id);
                      setSelectedId(null);
                    }
                  }}
                  className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                  title="Remover item procurado"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {selectedWanted.foto && (
                <img
                  src={selectedWanted.foto}
                  alt="Referência"
                  className="max-h-48 w-full rounded-xl bg-slate-900 object-contain"
                />
              )}

              {/* Status */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Situação:</span>
                {(['PROCURANDO', 'LOCALIZADO', 'ENTREGUE', 'CANCELADO'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateProcurado({ ...selectedWanted, status: st })}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      selectedWanted.status === st
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Prováveis Itens Localizados */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Vincular Prováveis Itens Cadastrados (Todos os Status)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Itens com palavras parecidas aparecem primeiro. Clique na caixa para vincular ou em "Abrir Item" para
                  ver fotos, rastreio e registrar entrega.
                </p>

                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {suggestedMatches.map(({ item, score }) => {
                    const checked = selectedWanted.provaveisItensIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                          checked ? 'border-emerald-400 bg-emerald-50/60' : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCandidate(selectedWanted, item.id)}
                          className="h-5 w-5 shrink-0 accent-emerald-600"
                          aria-label={`Selecionar item ${item.etiquetaCodigo}`}
                        />
                        {item.fotoEntrada && (
                          <img
                            src={item.fotoEntrada}
                            alt={item.tipoItem}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-slate-900">ETQ #{item.etiquetaCodigo}</span>
                            <span className="font-bold text-slate-800">{item.tipoItem}</span>
                            <StatusBadge status={item.status} />
                            <ValorBadge valor={item.valor} />
                            {score >= 30 && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                <Link2 className="h-3 w-3" /> {score}% similar
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-slate-600">{item.descricao}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectItem(item)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white border border-slate-300 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-800"
                        >
                          Abrir
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                  {suggestedMatches.length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-400">Nenhum item cadastrado no sistema ainda.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">Selecione um item procurado à esquerda</p>
              <p className="mt-1 text-xs text-slate-500">
                Você verá sugestões automáticas de itens localizados para confirmar com o dono.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

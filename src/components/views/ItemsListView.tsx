import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Lock,
  PackagePlus,
  Plus,
  Search,
  ShieldAlert,
  Tag,
  X,
} from 'lucide-react';
import { CATEGORIAS_ITEM } from '../../constants/catalog';
import {
  getMesesGuardadoTexto,
  isItemRetido,
  isLostPerson,
  isRestrictedDisplay,
} from '../../services/trackingService';
import { useAppStore } from '../../store/useAppStore';
import type { Item } from '../../types/domain';
import { CategoriaBadge, DestinoBadge, SecurityBadge, StatusBadge, ValorBadge } from '../common/Badge';

interface ItemsListViewProps {
  onSelectItem: (item: Item) => void;
}

export const ItemsListView: React.FC<ItemsListViewProps> = ({ onSelectItem }) => {
  const {
    db,
    activeEvento,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoriaFilter,
    setCategoriaFilter,
    showAllEventsInList,
    setShowAllEventsInList,
    openNewItemModal,
    getNextTagForEvent,
    retidosCount,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [onlyRestricted, setOnlyRestricted] = useState(false);

  const eventsById = useMemo(() => new Map(db.eventos.map((e) => [e.id, e])), [db.eventos]);

  const scopedItems = useMemo(() => {
    if (showAllEventsInList || !activeEvento) return db.itens;
    return db.itens.filter((i) => i.eventoId === activeEvento.id);
  }, [db.itens, showAllEventsInList, activeEvento]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedItems
      .filter((item) => {
        if (statusFilter === 'RETIDOS') {
          if (!isItemRetido(item, db.config.prazoRetencaoDias)) return false;
        } else if (statusFilter !== 'TODOS' && item.status !== statusFilter) {
          return false;
        }
        if (categoriaFilter !== 'TODAS' && item.categoria !== categoriaFilter) return false;
        if (onlyRestricted && !isRestrictedDisplay(item)) return false;
        if (q) {
          const ev = eventsById.get(item.eventoId);
          const haystack = [
            item.etiquetaCodigo,
            String(item.etiqueta),
            item.tipoItem,
            item.descricao,
            item.valor,
            item.categoria,
            item.status,
            item.destino,
            item.quemTrouxe,
            item.localAchado,
            item.quemPegou,
            item.donoNomeTels,
            item.congregacao,
            ev?.codigo ?? '',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.dataHoraGuardado.localeCompare(a.dataHoraGuardado));
  }, [scopedItems, statusFilter, categoriaFilter, onlyRestricted, searchQuery, eventsById, db.config.prazoRetencaoDias]);

  const stats = useMemo(() => {
    const guardados = scopedItems.filter((i) => i.status === 'Ainda Guardado' || i.status === 'Em Conferência').length;
    const entregues = scopedItems.filter((i) => i.status === 'Já Entregue').length;
    const despachados = scopedItems.filter((i) => i.status === 'DESPACHADO').length;
    const restritos = scopedItems.filter((i) => i.status === 'Ainda Guardado' && isRestrictedDisplay(i)).length;
    return { total: scopedItems.length, guardados, entregues, despachados, restritos };
  }, [scopedItems]);

  const nextTag = activeEvento ? getNextTagForEvent(activeEvento.id) : null;

  return (
    <div className="space-y-4">
      {/* Cabeçalho Operacional do Evento (espelho aprimorado do Glide) */}
      <div className="hc-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            {activeEvento ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-900">
                    {activeEvento.tipo} • {activeEvento.codigo} • {activeEvento.data.split('-').reverse().join('/')}
                  </span>
                  {nextTag && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-950">
                      <Tag className="h-3.5 w-3.5" />
                      Próxima Etiqueta: #{nextTag.codigo}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Cada item exige: <strong>1) Foto com Etiqueta no Item</strong> → <strong>2) Etiqueta gêmea no Formulário</strong> →{' '}
                  <strong>3) Foto da Etiqueta / Comprovante</strong>.
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-amber-800">
                Nenhum evento ativo. Vá em "Eventos" para criar ou selecionar um evento.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openNewItemModal()}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-rose-700 active:scale-[0.99] transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              ADICIONAR ITEM / PESSOA
            </button>
            <button
              type="button"
              onClick={() => openNewItemModal({ presetCategoria: 'Guardado' })}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition"
            >
              <PackagePlus className="h-4 w-4" />
              Guarda-Volumes
            </button>
            <button
              type="button"
              onClick={() => openNewItemModal({ presetCategoria: 'Criança', presetValor: 'Precioso' })}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition"
            >
              <ShieldAlert className="h-4 w-4" />
              Criança / Pessoa
            </button>
          </div>
        </div>

        {/* Atalhos rápidos estilo Glide */}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('relatorio')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-900 hover:bg-teal-100"
          >
            <FileText className="h-3.5 w-3.5" />
            Encaminhar / Imprimir Relatório Final
          </button>
          {retidosCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('destinar')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100"
            >
              <Archive className="h-3.5 w-3.5" />
              Ainda Não Destinados ({retidosCount})
            </button>
          )}
        </div>
      </div>

      {/* KPIs clicáveis */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatusFilter('TODOS')}
          className={`hc-card rounded-2xl border p-3 text-left transition ${
            statusFilter === 'TODOS' ? 'border-sky-500 bg-sky-50/70' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-[11px] font-bold uppercase text-slate-500">Total ({showAllEventsInList ? 'Geral' : 'Evento'})</p>
          <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{stats.total}</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('Ainda Guardado')}
          className={`hc-card rounded-2xl border p-3 text-left transition ${
            statusFilter === 'Ainda Guardado' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-[11px] font-bold uppercase text-amber-700">Ainda Guardados</p>
          <p className="mt-0.5 text-2xl font-extrabold text-amber-900">{stats.guardados}</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('Já Entregue')}
          className={`hc-card rounded-2xl border p-3 text-left transition ${
            statusFilter === 'Já Entregue' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-[11px] font-bold uppercase text-emerald-700">Já Entregues</p>
          <p className="mt-0.5 text-2xl font-extrabold text-emerald-900">{stats.entregues}</p>
        </button>
        <button
          type="button"
          onClick={() => setOnlyRestricted((v) => !v)}
          className={`hc-card rounded-2xl border p-3 text-left transition ${
            onlyRestricted ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase text-rose-700">
            <Lock className="h-3 w-3" /> Área Restrita (#55)
          </p>
          <p className="mt-0.5 text-2xl font-extrabold text-rose-900">{stats.restritos}</p>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="hc-card flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por etiqueta, tipo, descrição, quem trouxe, dono, congregação..."
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-9 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllEventsInList(!showAllEventsInList)}
              className={`touch-target rounded-xl border px-3 py-2 text-xs font-bold transition ${
                showAllEventsInList
                  ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                  : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {showAllEventsInList ? 'Todos Eventos' : 'Só Evento Ativo'}
            </button>

            <div className="hidden rounded-xl border border-slate-300 p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`rounded-lg p-2 ${viewMode === 'cards' ? 'bg-[#1e3a5f] text-white' : 'text-slate-600'}`}
                title="Visualização em Cartões"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-lg p-2 ${viewMode === 'table' ? 'bg-[#1e3a5f] text-white' : 'text-slate-600'}`}
                title="Visualização em Tabela (PC)"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chips de Filtro */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="mr-1 h-3.5 w-3.5 text-slate-400" />
          {(['TODOS', 'Ainda Guardado', 'Em Conferência', 'Já Entregue', 'DESPACHADO', 'RETIDOS'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                statusFilter === st
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'TODOS' ? 'Todos Status' : st === 'RETIDOS' ? 'Retidos (>60d)' : st}
            </button>
          ))}

          <select
            aria-label="Filtrar por categoria"
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value as typeof categoriaFilter)}
            className="ml-auto rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700"
          >
            <option value="TODAS">Todas Categorias</option>
            {CATEGORIAS_ITEM.map((c) => (
              <option key={c} value={c}>
                {c === 'Guardado' ? 'Guarda-Volumes' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Itens */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Camera className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">Nenhum item encontrado com esses filtros.</p>
          <p className="mt-1 text-xs text-slate-500">
            Cadastre um novo item clicando em "+ Novo Item" ou falando <strong>"Novo item"</strong> no microfone!
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const ev = eventsById.get(item.eventoId);
            const retido = isItemRetido(item, db.config.prazoRetencaoDias);
            const restricted = isRestrictedDisplay(item);
            const lostPerson = isLostPerson(item.categoria);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item)}
                className={`hc-card group flex flex-col overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                  lostPerson && item.status !== 'Já Entregue'
                    ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Foto de Capa + Etiqueta */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  {item.fotoEntrada ? (
                    <img
                      src={item.fotoEntrada}
                      alt={`${item.tipoItem} etiqueta ${item.etiquetaCodigo}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400">
                      <Camera className="h-8 w-8" />
                      <span className="mt-1 text-xs font-semibold">Sem foto de entrada</span>
                    </div>
                  )}

                  {/* Etiqueta Pill */}
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    <span className="rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-black text-slate-950 shadow-md">
                      ETQ #{item.etiquetaCodigo}
                    </span>
                    <span className="rounded-lg bg-slate-950/75 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-xs">
                      Pág. {item.formPagina}
                    </span>
                  </div>

                  {/* Indicador Foto-Etiqueta-Foto */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                    <span className={item.fotoEntrada ? 'text-emerald-300' : 'text-slate-400'}>F1</span>
                    <span>•</span>
                    <span className={item.etiquetaConfirmadaNoItem ? 'text-amber-300' : 'text-slate-400'}>ETQ</span>
                    <span>•</span>
                    <span className={item.fotoEtiqueta ? 'text-emerald-300' : 'text-slate-400'}>F2</span>
                  </div>

                  {ev && showAllEventsInList && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/75 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                      {ev.codigo}
                    </span>
                  )}
                </div>

                {/* Corpo do Card */}
                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={item.status} />
                      <ValorBadge valor={item.valor} />
                      <CategoriaBadge categoria={item.categoria} />
                    </div>

                    <h3 className="mt-2 line-clamp-1 text-base font-extrabold text-slate-900">
                      {item.tipoItem}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{item.descricao}</p>

                    {/* Alertas de Política */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lostPerson && item.status !== 'Já Entregue' && <SecurityBadge kind="lost-person" />}
                      {restricted && item.status === 'Ainda Guardado' && !lostPerson && (
                        <SecurityBadge kind="restricted" />
                      )}
                      {retido && (
                        <SecurityBadge kind="retained" label={`Retido (${getMesesGuardadoTexto(item.dataHoraGuardado)})`} />
                      )}
                      <DestinoBadge destino={item.destino} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 truncate">
                      {item.status === 'Já Entregue' ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span className="truncate">Retirado: {item.quemPegou || item.donoNomeTels || 'Dono'}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">
                            {new Date(item.dataHoraGuardado).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="shrink-0 font-bold text-sky-700">
                      {item.rastreio.length} etapa{item.rastreio.length === 1 ? '' : 's'} →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Tabela PC (alta densidade ergonômica) */
        <div className="hc-card overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
              <tr>
                <th className="px-3 py-3">Foto</th>
                <th className="px-3 py-3">Etiqueta</th>
                <th className="px-3 py-3">Item & Descrição</th>
                <th className="px-3 py-3">Classificação</th>
                <th className="px-3 py-3">Status / Destino</th>
                <th className="px-3 py-3">Recepção / Entrega</th>
                <th className="px-3 py-3">Rastreio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const retido = isItemRetido(item, db.config.prazoRetencaoDias);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="cursor-pointer hover:bg-sky-50/50 transition"
                  >
                    <td className="px-3 py-2">
                      {item.fotoEntrada ? (
                        <img
                          src={item.fotoEntrada}
                          alt={item.tipoItem}
                          className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <Camera className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-black text-slate-900">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-950">#{item.etiquetaCodigo}</span>
                      <div className="mt-0.5 text-[10px] font-normal text-slate-500">Pág. {item.formPagina}</div>
                    </td>
                    <td className="max-w-xs px-3 py-2">
                      <div className="font-bold text-slate-900">{item.tipoItem}</div>
                      <div className="line-clamp-2 text-slate-600">{item.descricao}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-start gap-1">
                        <ValorBadge valor={item.valor} />
                        <CategoriaBadge categoria={item.categoria} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={item.status} />
                        <DestinoBadge destino={item.destino} />
                        {retido && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <AlertTriangle className="h-3 w-3" /> Retido ({getMesesGuardadoTexto(item.dataHoraGuardado)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[200px] px-3 py-2 text-slate-600">
                      <div className="truncate">
                        <strong>Trouxe:</strong> {item.quemTrouxe || '-'}
                      </div>
                      {item.quemPegou && (
                        <div className="truncate text-emerald-700">
                          <strong>Pegou:</strong> {item.quemPegou}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-bold text-sky-700">{item.rastreio.length} eventos →</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

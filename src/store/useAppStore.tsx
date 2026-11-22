import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_ITEM_TYPES } from '../constants/catalog';
import { importFromSpreadsheetBuffer } from '../services/excelService';
import { executeMerge } from '../services/mergeService';
import {
  createDemoSeedData,
  createEmptyDatabase,
  getStorageUsage,
  loadDatabase,
  saveDatabase,
} from '../services/storageService';
import {
  createTrackingEvent,
  formatEtiquetaCodigo,
  generateId,
  getSuggestedCustodyLocation,
  isItemRetido,
  transitionItemReopen,
  transitionItemToConference,
  transitionItemToDelivered,
  transitionItemToDispatchedSA,
} from '../services/trackingService';
import { speakPtBr } from '../services/voiceService';
import type {
  AppDatabase,
  CategoriaItem,
  ConfiguracaoDispositivo,
  DestinoSA,
  EstrategiaColisaoEtiqueta,
  EstrategiaConflitoId,
  Evento,
  Item,
  ItemProcurado,
  NavTab,
  RelatorioFinal,
  StatusItem,
  SyncBundle,
  SyncLogEntry,
  ValorItem,
} from '../types/domain';

export interface ToastMessage {
  id: string;
  kind: 'success' | 'info' | 'warning' | 'error';
  text: string;
}

export interface NewItemInput {
  eventoId: string;
  etiqueta?: number;
  formPagina: number;
  tipoItem: string;
  descricao: string;
  valor: ValorItem;
  categoria: CategoriaItem;
  fotoEntrada: string;
  etiquetaConfirmadaNoItem: boolean;
  etiquetaConfirmadaNoFormulario: boolean;
  fotoEtiqueta: string;
  quemTrouxe: string;
  localAchado: string;
  donoNomeTels: string;
  congregacao: string;
  endereco: string;
  // Entrega imediata opcional (igual ao Glide quando alguém já retira no ato)
  entregarAgora?: boolean;
  quemPegou?: string;
  fotoEntrega?: string;
}

interface AppContextValue {
  db: AppDatabase;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeEvento: Evento | null;
  allItemTypes: string[];
  storageUsage: ReturnType<typeof getStorageUsage>;
  toasts: ToastMessage[];
  notify: (text: string, kind?: ToastMessage['kind'], speak?: boolean) => void;
  dismissToast: (id: string) => void;

  // Global search / filter state (controllable by UI & Voice!)
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: StatusItem | 'TODOS' | 'RETIDOS';
  setStatusFilter: (s: StatusItem | 'TODOS' | 'RETIDOS') => void;
  categoriaFilter: CategoriaItem | 'TODAS';
  setCategoriaFilter: (c: CategoriaItem | 'TODAS') => void;
  showAllEventsInList: boolean;
  setShowAllEventsInList: (v: boolean) => void;

  // Global modal triggers (controllable by UI & Voice!)
  newItemModal: { open: boolean; presetCategoria?: CategoriaItem; presetValor?: ValorItem; voiceDraft?: Partial<Item> };
  openNewItemModal: (opts?: { presetCategoria?: CategoriaItem; presetValor?: ValorItem; voiceDraft?: Partial<Item> }) => void;
  closeNewItemModal: () => void;
  updateVoiceDraft: (fields: Partial<Item>) => void;
  policiesOpen: boolean;
  setPoliciesOpen: (v: boolean) => void;

  // Mutations
  setActiveEvento: (eventoId: string) => void;
  createEvento: (input: Omit<Evento, 'id' | 'proximaEtiqueta' | 'createdAt' | 'updatedAt' | 'deviceId'>) => Evento;
  updateEvento: (evento: Evento) => void;
  deleteEvento: (eventoId: string) => void;

  createItem: (input: NewItemInput) => Item;
  updateItem: (item: Item, changeNote?: string) => void;
  deleteItem: (itemId: string) => void;
  markItemConference: (itemId: string, obs: string) => void;
  deliverItem: (
    itemId: string,
    payload: {
      quemPegou: string;
      donoNomeTels: string;
      congregacao: string;
      endereco: string;
      fotoEntrega?: string;
      observacaoEntrega?: string;
      entregueContas?: boolean;
    },
  ) => boolean;
  dispatchItemSA: (itemId: string, destino: Exclude<DestinoSA, ''>, obs?: string) => void;
  reopenItem: (itemId: string, motivo: string) => void;

  createProcurado: (input: Omit<ItemProcurado, 'id' | 'createdAt' | 'updatedAt' | 'deviceId' | 'deviceName'>) => ItemProcurado;
  updateProcurado: (p: ItemProcurado) => void;
  deleteProcurado: (id: string) => void;

  saveRelatorio: (rel: RelatorioFinal) => void;
  updateConfig: (patch: Partial<ConfiguracaoDispositivo>) => void;

  // Sync / Excel / Demo / Reset
  applySyncMerge: (
    bundle: SyncBundle,
    opts: { estrategiaColisaoEtiqueta: EstrategiaColisaoEtiqueta; estrategiaConflitoId: EstrategiaConflitoId },
  ) => SyncLogEntry;
  importSpreadsheet: (buffer: ArrayBuffer, fileName: string) => {
    rowsProcessed: number;
    eventosCriados: number;
    itensImportados: number;
    itensIgnoradosDuplicados: number;
  };
  recordExportLog: (tipo: SyncLogEntry['tipo'], detalhes: string) => void;
  loadDemoData: () => void;
  clearAllData: () => void;

  // Derived metrics
  retidosCount: number;
  procuradosAbertosCount: number;
  getNextTagForEvent: (eventoId: string) => { numero: number; codigo: string };
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [activeTab, setActiveTab] = useState<NavTab>(() => (loadDatabase().activeEventoId ? 'itens' : 'evento'));
  const [storageUsage, setStorageUsage] = useState(() => getStorageUsage());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusItem | 'TODOS' | 'RETIDOS'>('TODOS');
  const [categoriaFilter, setCategoriaFilter] = useState<CategoriaItem | 'TODAS'>('TODAS');
  const [showAllEventsInList, setShowAllEventsInList] = useState(false);

  const [newItemModal, setNewItemModal] = useState<{
    open: boolean;
    presetCategoria?: CategoriaItem;
    presetValor?: ValorItem;
    voiceDraft?: Partial<Item>;
  }>({ open: false });
  const [policiesOpen, setPoliciesOpen] = useState(false);

  const notify = useCallback(
    (text: string, kind: ToastMessage['kind'] = 'info', speak = false) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, kind, text }]);
      if (speak) {
        speakPtBr(text, db.config.vozFeedbackFalado);
      }
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    [db.config.vozFeedbackFalado],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persiste no localStorage sempre que o estado mudar
  useEffect(() => {
    const res = saveDatabase(db);
    if (!res.ok && res.error) {
      notify(res.error, 'error');
    }
    setStorageUsage(getStorageUsage());
  }, [db, notify]);

  // Aplica tema e tamanho de fonte acessíveis no HTML
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast');
    root.classList.add(`theme-${db.config.tema}`);
    root.classList.remove('font-normal', 'font-grande', 'font-extra');
    root.classList.add(`font-${db.config.tamanhoFonte}`);
  }, [db.config.tema, db.config.tamanhoFonte]);

  const activeEvento = useMemo(
    () => db.eventos.find((e) => e.id === db.activeEventoId) ?? db.eventos[0] ?? null,
    [db.eventos, db.activeEventoId],
  );

  const allItemTypes = useMemo(() => {
    const set = new Set([...DEFAULT_ITEM_TYPES, ...db.tiposPersonalizados]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [db.tiposPersonalizados]);

  const retidosCount = useMemo(
    () => db.itens.filter((i) => isItemRetido(i, db.config.prazoRetencaoDias)).length,
    [db.itens, db.config.prazoRetencaoDias],
  );

  const procuradosAbertosCount = useMemo(
    () => db.procurados.filter((p) => p.status === 'PROCURANDO' || p.status === 'LOCALIZADO').length,
    [db.procurados],
  );

  const getNextTagForEvent = useCallback(
    (eventoId: string) => {
      const ev = db.eventos.find((e) => e.id === eventoId);
      const maxExisting = db.itens
        .filter((i) => i.eventoId === eventoId)
        .reduce((acc, i) => Math.max(acc, i.etiqueta), 0);
      const numero = Math.max(ev?.proximaEtiqueta ?? 1, maxExisting + 1, db.config.etiquetaInicial);
      return {
        numero,
        codigo: formatEtiquetaCodigo(numero, db.config.prefixoEtiqueta),
      };
    },
    [db.eventos, db.itens, db.config.etiquetaInicial, db.config.prefixoEtiqueta],
  );

  const openNewItemModal = useCallback(
    (opts?: { presetCategoria?: CategoriaItem; presetValor?: ValorItem; voiceDraft?: Partial<Item> }) => {
      if (!activeEvento) {
        notify('Selecione ou crie um evento primeiro antes de cadastrar um item.', 'warning', true);
        setActiveTab('evento');
        return;
      }
      setNewItemModal({ open: true, ...opts });
    },
    [activeEvento, notify],
  );

  const closeNewItemModal = useCallback(() => {
    setNewItemModal({ open: false });
  }, []);

  const updateVoiceDraft = useCallback((fields: Partial<Item>) => {
    setNewItemModal((prev) => ({
      ...prev,
      voiceDraft: { ...(prev.voiceDraft ?? {}), ...fields },
    }));
  }, []);

  const setActiveEvento = useCallback((eventoId: string) => {
    setDb((prev) => ({ ...prev, activeEventoId: eventoId }));
  }, []);

  const createEvento: AppContextValue['createEvento'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const novo: Evento = {
        ...input,
        id: generateId('evt'),
        proximaEtiqueta: db.config.etiquetaInicial,
        createdAt: now,
        updatedAt: now,
        deviceId: db.config.deviceId,
      };
      setDb((prev) => ({
        ...prev,
        activeEventoId: novo.id,
        eventos: [novo, ...prev.eventos],
      }));
      notify(`Evento ${novo.tipo} ${novo.codigo} criado e selecionado!`, 'success', true);
      return novo;
    },
    [db.config.deviceId, db.config.etiquetaInicial, notify],
  );

  const updateEvento = useCallback(
    (evento: Evento) => {
      setDb((prev) => ({
        ...prev,
        eventos: prev.eventos.map((e) => (e.id === evento.id ? { ...evento, updatedAt: new Date().toISOString() } : e)),
      }));
      notify(`Evento ${evento.codigo} atualizado.`, 'success');
    },
    [notify],
  );

  const deleteEvento = useCallback(
    (eventoId: string) => {
      setDb((prev) => {
        const remainingEvents = prev.eventos.filter((e) => e.id !== eventoId);
        return {
          ...prev,
          eventos: remainingEvents,
          itens: prev.itens.filter((i) => i.eventoId !== eventoId),
          procurados: prev.procurados.filter((p) => p.eventoId !== eventoId),
          relatorios: prev.relatorios.filter((r) => r.eventoId !== eventoId),
          activeEventoId: prev.activeEventoId === eventoId ? (remainingEvents[0]?.id ?? null) : prev.activeEventoId,
        };
      });
      notify('Evento e seus itens locais foram removidos.', 'info');
    },
    [notify],
  );

  const createItem: AppContextValue['createItem'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const next = getNextTagForEvent(input.eventoId);
      const etiquetaNum = input.etiqueta ?? next.numero;
      const etiquetaCodigo = formatEtiquetaCodigo(etiquetaNum, db.config.prefixoEtiqueta);
      const localCustodia = getSuggestedCustodyLocation(input.valor, input.categoria);

      const rastreio = [
        createTrackingEvent({
          etapa: 'RECEBIDO',
          titulo:
            input.categoria === 'Guardado'
              ? 'Volume Guardado (Guarda-Volumes)'
              : input.categoria === 'Criança' || input.categoria === 'Idoso' || input.categoria === 'Adulto'
                ? `Pessoa Perdida Registrada (${input.categoria}) — Política #56`
                : 'Item Achado/Perdido Recebido',
          detalhes: `Etiqueta #${etiquetaCodigo} (Pág. ${input.formPagina}) • Recebido de: ${
            input.quemTrouxe || 'Não informado'
          }${input.localAchado ? ` • Local: ${input.localAchado}` : ''}.`,
          operador: db.config.operadorPadrao,
          dispositivo: db.config.deviceName,
          localizacao: localCustodia,
          timestamp: now,
        }),
      ];

      if (input.etiquetaConfirmadaNoItem || input.etiquetaConfirmadaNoFormulario) {
        rastreio.push(
          createTrackingEvent({
            etapa: 'ETIQUETADO',
            titulo: 'Etiqueta Dupla Confirmada',
            detalhes: `No item: ${input.etiquetaConfirmadaNoItem ? 'Sim' : 'Pendente'} • No formulário pág. ${
              input.formPagina
            }: ${input.etiquetaConfirmadaNoFormulario ? 'Sim' : 'Pendente'}.`,
            operador: db.config.operadorPadrao,
            dispositivo: db.config.deviceName,
            localizacao: localCustodia,
            timestamp: now,
          }),
        );
      }

      if (input.fotoEntrada || input.fotoEtiqueta) {
        rastreio.push(
          createTrackingEvent({
            etapa: 'FOTO_REGISTRADA',
            titulo: 'Registro Fotográfico (Foto • Etiqueta • Foto)',
            detalhes: `Foto 1 (Item): ${input.fotoEntrada ? 'OK' : 'Sem foto'} • Foto 2 (Etiqueta/Form): ${
              input.fotoEtiqueta ? 'OK' : 'Sem foto'
            }.`,
            operador: db.config.operadorPadrao,
            dispositivo: db.config.deviceName,
            timestamp: now,
          }),
        );
      }

      let status: StatusItem = 'Ainda Guardado';
      let dataHoraDespachado = '';
      if (input.entregarAgora && input.quemPegou?.trim()) {
        status = 'Já Entregue';
        dataHoraDespachado = now;
        rastreio.push(
          createTrackingEvent({
            etapa: 'ENTREGUE',
            titulo: 'Entregue no Ato do Cadastro',
            detalhes: `Retirado por: ${input.quemPegou.trim()}`,
            operador: db.config.operadorPadrao,
            dispositivo: db.config.deviceName,
            localizacao: 'Balcão de Entrega',
            timestamp: now,
          }),
        );
      }

      const novoItem: Item = {
        id: generateId('itm'),
        eventoId: input.eventoId,
        etiqueta: etiquetaNum,
        etiquetaCodigo,
        formPagina: input.formPagina || 1,
        tipoItem: input.tipoItem.trim() || 'Diversos Itens',
        descricao: input.descricao.trim(),
        valor: input.valor,
        categoria: input.categoria,
        fotoEntrada: input.fotoEntrada,
        etiquetaConfirmadaNoItem: input.etiquetaConfirmadaNoItem,
        etiquetaConfirmadaNoFormulario: input.etiquetaConfirmadaNoFormulario,
        fotoEtiqueta: input.fotoEtiqueta,
        fotoEntrega: input.fotoEntrega ?? '',
        status,
        destino: '',
        dataHoraGuardado: now,
        quemTrouxe: input.quemTrouxe.trim(),
        localAchado: input.localAchado.trim(),
        recebidoPor: db.config.operadorPadrao,
        dataHoraDespachado,
        quemPegou: input.quemPegou?.trim() ?? '',
        entreguePor: status === 'Já Entregue' ? db.config.operadorPadrao : '',
        observacaoEntrega: '',
        donoNomeTels: input.donoNomeTels.trim(),
        congregacao: input.congregacao.trim(),
        endereco: input.endereco.trim(),
        rastreio,
        deviceId: db.config.deviceId,
        deviceName: db.config.deviceName,
        createdAt: now,
        updatedAt: now,
      };

      setDb((prev) => {
        const tiposSet = new Set(prev.tiposPersonalizados);
        if (novoItem.tipoItem && !DEFAULT_ITEM_TYPES.includes(novoItem.tipoItem)) {
          tiposSet.add(novoItem.tipoItem);
        }
        return {
          ...prev,
          itens: [novoItem, ...prev.itens],
          eventos: prev.eventos.map((e) =>
            e.id === input.eventoId
              ? { ...e, proximaEtiqueta: Math.max(e.proximaEtiqueta, etiquetaNum + 1), updatedAt: now }
              : e,
          ),
          tiposPersonalizados: Array.from(tiposSet).sort(),
        };
      });

      notify(`Item etiqueta #${etiquetaCodigo} (${novoItem.tipoItem}) salvo com sucesso!`, 'success', true);
      return novoItem;
    },
    [db.config, getNextTagForEvent, notify],
  );

  const updateItem = useCallback(
    (updated: Item, changeNote?: string) => {
      const now = new Date().toISOString();
      const ev = createTrackingEvent({
        etapa: 'EDITADO',
        titulo: 'Dados do Item Atualizados',
        detalhes: changeNote || 'Alteração manual nos detalhes ou fotos do item.',
        operador: db.config.operadorPadrao,
        dispositivo: db.config.deviceName,
        timestamp: now,
      });
      setDb((prev) => ({
        ...prev,
        itens: prev.itens.map((i) =>
          i.id === updated.id ? { ...updated, rastreio: [...updated.rastreio, ev], updatedAt: now } : i,
        ),
      }));
      notify(`Item #${updated.etiquetaCodigo} atualizado.`, 'success');
    },
    [db.config.deviceName, db.config.operadorPadrao, notify],
  );

  const deleteItem = useCallback(
    (itemId: string) => {
      setDb((prev) => ({
        ...prev,
        itens: prev.itens.filter((i) => i.id !== itemId),
        procurados: prev.procurados.map((p) => ({
          ...p,
          provaveisItensIds: p.provaveisItensIds.filter((id) => id !== itemId),
        })),
      }));
      notify('Item removido do dispositivo.', 'info');
    },
    [notify],
  );

  const markItemConference = useCallback(
    (itemId: string, obs: string) => {
      const target = db.itens.find((i) => i.id === itemId);
      if (!target) return;
      const res = transitionItemToConference(target, db.config.operadorPadrao, db.config.deviceName, obs);
      if (!res.valid) {
        notify(res.error ?? 'Operação não permitida.', 'warning');
        return;
      }
      setDb((prev) => ({ ...prev, itens: prev.itens.map((i) => (i.id === itemId ? res.item : i)) }));
      notify(`Item #${target.etiquetaCodigo} colocado Em Conferência.`, 'info', true);
    },
    [db.config.deviceName, db.config.operadorPadrao, db.itens, notify],
  );

  const deliverItem: AppContextValue['deliverItem'] = useCallback(
    (itemId, payload) => {
      const target = db.itens.find((i) => i.id === itemId);
      if (!target) return false;
      const res = transitionItemToDelivered(target, payload, db.config.operadorPadrao, db.config.deviceName);
      if (!res.valid) {
        notify(res.error ?? 'Preencha quem retirou o item.', 'warning');
        return false;
      }
      setDb((prev) => ({
        ...prev,
        itens: prev.itens.map((i) => (i.id === itemId ? res.item : i)),
        procurados: prev.procurados.map((p) =>
          p.provaveisItensIds.includes(itemId) ? { ...p, status: 'ENTREGUE', updatedAt: new Date().toISOString() } : p,
        ),
      }));
      notify(`Item #${target.etiquetaCodigo} entregue com sucesso!`, 'success', true);
      return true;
    },
    [db.config.deviceName, db.config.operadorPadrao, db.itens, notify],
  );

  const dispatchItemSA = useCallback(
    (itemId: string, destino: Exclude<DestinoSA, ''>, obs = '') => {
      const target = db.itens.find((i) => i.id === itemId);
      if (!target) return;
      const res = transitionItemToDispatchedSA(target, destino, db.config.operadorPadrao, db.config.deviceName, obs);
      setDb((prev) => ({ ...prev, itens: prev.itens.map((i) => (i.id === itemId ? res.item : i)) }));
      notify(`Item #${target.etiquetaCodigo} destinado: ${destino}.`, 'success', true);
    },
    [db.config.deviceName, db.config.operadorPadrao, db.itens, notify],
  );

  const reopenItem = useCallback(
    (itemId: string, motivo: string) => {
      const target = db.itens.find((i) => i.id === itemId);
      if (!target) return;
      const res = transitionItemReopen(target, motivo, db.config.operadorPadrao, db.config.deviceName);
      setDb((prev) => ({ ...prev, itens: prev.itens.map((i) => (i.id === itemId ? res.item : i)) }));
      notify(`Item #${target.etiquetaCodigo} reaberto para custódia.`, 'info');
    },
    [db.config.deviceName, db.config.operadorPadrao, db.itens, notify],
  );

  const createProcurado: AppContextValue['createProcurado'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const novo: ItemProcurado = {
        ...input,
        id: generateId('prc'),
        createdAt: now,
        updatedAt: now,
        deviceId: db.config.deviceId,
        deviceName: db.config.deviceName,
      };
      setDb((prev) => ({ ...prev, procurados: [novo, ...prev.procurados] }));
      notify('Registro de item procurado salvo!', 'success', true);
      return novo;
    },
    [db.config.deviceId, db.config.deviceName, notify],
  );

  const updateProcurado = useCallback(
    (p: ItemProcurado) => {
      setDb((prev) => ({
        ...prev,
        procurados: prev.procurados.map((x) => (x.id === p.id ? { ...p, updatedAt: new Date().toISOString() } : x)),
      }));
      notify('Item procurado atualizado.', 'success');
    },
    [notify],
  );

  const deleteProcurado = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, procurados: prev.procurados.filter((x) => x.id !== id) }));
      notify('Registro removido da lista de procurados.', 'info');
    },
    [notify],
  );

  const saveRelatorio = useCallback(
    (rel: RelatorioFinal) => {
      const now = new Date().toISOString();
      setDb((prev) => {
        const exists = prev.relatorios.some((r) => r.eventoId === rel.eventoId);
        return {
          ...prev,
          relatorios: exists
            ? prev.relatorios.map((r) => (r.eventoId === rel.eventoId ? { ...rel, updatedAt: now } : r))
            : [{ ...rel, updatedAt: now }, ...prev.relatorios],
        };
      });
      notify('Relatório Final salvo localmente!', 'success');
    },
    [notify],
  );

  const updateConfig = useCallback((patch: Partial<ConfiguracaoDispositivo>) => {
    setDb((prev) => ({
      ...prev,
      config: { ...prev.config, ...patch },
    }));
  }, []);

  const applySyncMerge: AppContextValue['applySyncMerge'] = useCallback(
    (bundle, opts) => {
      const result = executeMerge(db, bundle, opts);
      setDb(result.db);
      notify(
        `Mesclagem concluída: +${result.log.itensAdicionados} itens, ${result.log.itensAtualizados} atualizados, ${result.log.colisoesResolvidas} colisões resolvidas.`,
        'success',
        true,
      );
      return result.log;
    },
    [db, notify],
  );

  const importSpreadsheet: AppContextValue['importSpreadsheet'] = useCallback(
    (buffer, fileName) => {
      const res = importFromSpreadsheetBuffer(buffer, fileName, db);
      setDb(res.db);
      notify(
        `Planilha importada: ${res.summary.itensImportados} itens em ${res.summary.eventosCriados} novos eventos!`,
        'success',
        true,
      );
      return res.summary;
    },
    [db, notify],
  );

  const recordExportLog = useCallback(
    (tipo: SyncLogEntry['tipo'], detalhes: string) => {
      const entry: SyncLogEntry = {
        id: generateId('sync'),
        timestamp: new Date().toISOString(),
        tipo,
        origemDispositivo: db.config.deviceName,
        eventosAdicionados: 0,
        itensAdicionados: 0,
        itensAtualizados: 0,
        colisoesResolvidas: 0,
        procuradosAdicionados: 0,
        detalhes,
      };
      setDb((prev) => ({ ...prev, syncHistory: [entry, ...prev.syncHistory].slice(0, 50) }));
    },
    [db.config.deviceName],
  );

  const loadDemoData = useCallback(() => {
    const seed = createDemoSeedData(db.config);
    setDb((prev) => ({
      ...prev,
      activeEventoId: seed.activeEventoId,
      eventos: [...seed.eventos, ...prev.eventos],
      itens: [...seed.itens, ...prev.itens],
      procurados: [...seed.procurados, ...prev.procurados],
    }));
    setActiveTab('itens');
    notify('Dados de demonstração fictícios carregados com sucesso!', 'success', true);
  }, [db.config, notify]);

  const clearAllData = useCallback(() => {
    const fresh = createEmptyDatabase();
    fresh.config = db.config;
    setDb(fresh);
    setActiveTab('evento');
    notify('Base local limpa. Pronto para começar um novo evento ou importar dados.', 'info');
  }, [db.config, notify]);

  const value: AppContextValue = {
    db,
    activeTab,
    setActiveTab,
    activeEvento,
    allItemTypes,
    storageUsage,
    toasts,
    notify,
    dismissToast,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoriaFilter,
    setCategoriaFilter,
    showAllEventsInList,
    setShowAllEventsInList,
    newItemModal,
    openNewItemModal,
    closeNewItemModal,
    updateVoiceDraft,
    policiesOpen,
    setPoliciesOpen,
    setActiveEvento,
    createEvento,
    updateEvento,
    deleteEvento,
    createItem,
    updateItem,
    deleteItem,
    markItemConference,
    deliverItem,
    dispatchItemSA,
    reopenItem,
    createProcurado,
    updateProcurado,
    deleteProcurado,
    saveRelatorio,
    updateConfig,
    applySyncMerge,
    importSpreadsheet,
    recordExportLog,
    loadDemoData,
    clearAllData,
    retidosCount,
    procuradosAbertosCount,
    getNextTagForEvent,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useAppStore(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppProvider');
  return ctx;
}

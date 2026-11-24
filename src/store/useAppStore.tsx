import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_ITEM_TYPES } from '../constants/catalog';
import { importFromSpreadsheetBuffer } from '../services/excelService';
import { executeMerge } from '../services/mergeService';
import { computePresidenciaKpis } from '../services/presidenciaService';
import {
  createSentinelaBackup,
  reorderSentinelaComentario,
  restoreSentinelaFromBackup,
} from '../services/sentinelaService';
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
  AppSuiteMode,
  CategoriaItem,
  ComunicacaoLog,
  ConfiguracaoDispositivo,
  ConversaMensagem,
  DestinoSA,
  DocumentoReferencia,
  EstrategiaColisaoEtiqueta,
  EstrategiaConflitoId,
  Evento,
  GuiaAudioVideo,
  Item,
  ItemProcurado,
  LembreteAgenda,
  NavTab,
  ParticipacaoPrograma,
  ProgramaParte,
  RelatorioFinal,
  SentinelaComentario,
  SentinelaEstudo,
  StatusItem,
  SyncBundle,
  SyncLogEntry,
  ValorItem,
  Voluntario,
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
  entregarAgora?: boolean;
  quemPegou?: string;
  fotoEntrega?: string;
}

export function getSuiteForTab(tab: NavTab): AppSuiteMode | null {
  if (tab === 'evento' || tab === 'itens' || tab === 'procurados' || tab === 'destinar' || tab === 'relatorio') {
    return 'achados';
  }
  if (tab.startsWith('presidencia_')) return 'presidencia';
  if (tab.startsWith('sentinela_')) return 'sentinela';
  return null;
}

interface AppContextValue {
  db: AppDatabase;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeSuite: AppSuiteMode;
  switchSuite: (suite: AppSuiteMode) => void;
  activeEvento: Evento | null;
  allItemTypes: string[];
  storageUsage: ReturnType<typeof getStorageUsage>;
  toasts: ToastMessage[];
  notify: (text: string, kind?: ToastMessage['kind'], speak?: boolean) => void;
  dismissToast: (id: string) => void;

  // Global search / filter state (Achados & Voz)
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: StatusItem | 'TODOS' | 'RETIDOS';
  setStatusFilter: (s: StatusItem | 'TODOS' | 'RETIDOS') => void;
  categoriaFilter: CategoriaItem | 'TODAS';
  setCategoriaFilter: (c: CategoriaItem | 'TODAS') => void;
  showAllEventsInList: boolean;
  setShowAllEventsInList: (v: boolean) => void;

  // Cross-view filters for Presidência
  programaQuickFilter: 'todos' | 'oradores' | 'ja_compareceram' | 'faltam_dia1' | 'ensaios_pendentes' | 'serie';
  setProgramaQuickFilter: (
    f: 'todos' | 'oradores' | 'ja_compareceram' | 'faltam_dia1' | 'ensaios_pendentes' | 'serie',
  ) => void;

  // Global modal triggers
  newItemModal: { open: boolean; presetCategoria?: CategoriaItem; presetValor?: ValorItem; voiceDraft?: Partial<Item> };
  openNewItemModal: (opts?: { presetCategoria?: CategoriaItem; presetValor?: ValorItem; voiceDraft?: Partial<Item> }) => void;
  closeNewItemModal: () => void;
  updateVoiceDraft: (fields: Partial<Item>) => void;
  policiesOpen: boolean;
  setPoliciesOpen: (v: boolean) => void;

  // Eventos & Achados
  setActiveEvento: (eventoId: string) => void;
  createEvento: (input: Omit<Evento, 'id' | 'proximaEtiqueta' | 'createdAt' | 'updatedAt' | 'deviceId'>) => Evento;
  updateEvento: (evento: Evento) => void;
  toggleEventoStatus: (eventoId: string) => void;
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

  // Voluntários & Conversas (Compartilhados)
  createVoluntario: (input: Omit<Voluntario, 'id' | 'createdAt' | 'updatedAt'>) => Voluntario;
  updateVoluntario: (v: Voluntario) => void;
  deleteVoluntario: (id: string) => void;
  addConversaMensagem: (input: Omit<ConversaMensagem, 'id' | 'timestamp'>) => ConversaMensagem;

  // Presidência do Congresso
  createProgramaParte: (
    input: Omit<
      ProgramaParte,
      | 'id'
      | 'modoCronometro'
      | 'inicioRealIso'
      | 'fimRealIso'
      | 'duracaoRealSegundos'
      | 'ensaioInicioIso'
      | 'ensaioDuracaoSegundos'
      | 'mensagensLog'
      | 'deviceId'
      | 'createdAt'
      | 'updatedAt'
    >,
  ) => ProgramaParte;
  updateProgramaParte: (parte: ProgramaParte) => void;
  deleteProgramaParte: (id: string) => void;
  startProgramaParteLive: (id: string) => void;
  startProgramaParteRehearsal: (id: string) => void;
  finishProgramaParte: (id: string) => void;
  restoreProgramaParte: (id: string) => void;
  logProgramaComunicacao: (parteId: string, canal: ComunicacaoLog['canal'], resumo: string) => void;

  createParticipacao: (input: Omit<ParticipacaoPrograma, 'id' | 'createdAt' | 'updatedAt'>) => ParticipacaoPrograma;
  updateParticipacao: (p: ParticipacaoPrograma) => void;
  deleteParticipacao: (id: string) => void;

  createGuiaAV: (input: Omit<GuiaAudioVideo, 'id' | 'createdAt' | 'updatedAt'>) => GuiaAudioVideo;
  updateGuiaAV: (g: GuiaAudioVideo) => void;
  deleteGuiaAV: (id: string) => void;

  createLembrete: (input: Omit<LembreteAgenda, 'id' | 'createdAt' | 'updatedAt'>) => LembreteAgenda;
  updateLembrete: (l: LembreteAgenda) => void;
  toggleLembreteConcluido: (id: string) => void;
  deleteLembrete: (id: string) => void;

  createReferencia: (input: Omit<DocumentoReferencia, 'id' | 'createdAt' | 'updatedAt'>) => DocumentoReferencia;
  updateReferencia: (r: DocumentoReferencia) => void;
  deleteReferencia: (id: string) => void;

  // Resumo de A Sentinela
  saveSentinelaEstudo: (estudo: Omit<SentinelaEstudo, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => SentinelaEstudo;
  createSentinelaComentario: (input: Omit<SentinelaComentario, 'id' | 'createdAt' | 'updatedAt'>) => SentinelaComentario;
  updateSentinelaComentario: (c: SentinelaComentario, silent?: boolean) => void;
  deleteSentinelaComentario: (id: string) => void;
  moveSentinelaComentario: (estudoId: string, comentarioId: string, direction: 'up' | 'down') => void;
  backupSentinelaComentario: (comentarioId: string) => void;
  restoreSentinelaComentario: (comentarioId: string) => void;

  // Config / Sync / Excel / Demo / Reset
  updateConfig: (patch: Partial<ConfiguracaoDispositivo>) => void;
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
  faltamDia1Count: number;
  sentinelaPendentesCount: number;
  getNextTagForEvent: (eventoId: string) => { numero: number; codigo: string };
  getSuggestedFormPage: (eventoId: string) => number;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [activeTab, setActiveTabState] = useState<NavTab>(() => (loadDatabase().activeEventoId ? 'itens' : 'evento'));
  const [activeSuite, setActiveSuite] = useState<AppSuiteMode>('achados');
  const [storageUsage, setStorageUsage] = useState(() => getStorageUsage());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusItem | 'TODOS' | 'RETIDOS'>('TODOS');
  const [categoriaFilter, setCategoriaFilter] = useState<CategoriaItem | 'TODAS'>('TODAS');
  const [showAllEventsInList, setShowAllEventsInList] = useState(false);
  const [programaQuickFilter, setProgramaQuickFilter] = useState<
    'todos' | 'oradores' | 'ja_compareceram' | 'faltam_dia1' | 'ensaios_pendentes' | 'serie'
  >('todos');

  const [newItemModal, setNewItemModal] = useState<{
    open: boolean;
    presetCategoria?: CategoriaItem;
    presetValor?: ValorItem;
    voiceDraft?: Partial<Item>;
  }>({ open: false });
  const [policiesOpen, setPoliciesOpen] = useState(false);

  const setActiveTab = useCallback((tab: NavTab) => {
    setActiveTabState(tab);
    const derived = getSuiteForTab(tab);
    if (derived) setActiveSuite(derived);
  }, []);

  const switchSuite = useCallback((suite: AppSuiteMode) => {
    setActiveSuite(suite);
    if (suite === 'achados') setActiveTabState('itens');
    else if (suite === 'presidencia') setActiveTabState('presidencia_foco');
    else setActiveTabState('sentinela_estudo');
  }, []);

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

  useEffect(() => {
    const res = saveDatabase(db);
    if (!res.ok && res.error) {
      notify(res.error, 'error');
    }
    setStorageUsage(getStorageUsage());
  }, [db, notify]);

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

  const faltamDia1Count = useMemo(() => {
    const evPartes = activeEvento ? db.programaPartes.filter((p) => p.eventoId === activeEvento.id) : db.programaPartes;
    return computePresidenciaKpis(evPartes).faltamDia1;
  }, [db.programaPartes, activeEvento]);

  const sentinelaPendentesCount = useMemo(() => {
    const evCom = activeEvento
      ? db.sentinelaComentarios.filter((c) => c.eventoId === activeEvento.id)
      : db.sentinelaComentarios;
    return evCom.filter((c) => !c.presenteDia1 || !c.ensaioPalcoFeito).length;
  }, [db.sentinelaComentarios, activeEvento]);

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

  const getSuggestedFormPage = useCallback(
    (eventoId: string) => {
      const evItems = db.itens.filter((i) => i.eventoId === eventoId);
      if (evItems.length === 0) return 1;
      const lastPage = evItems.reduce((acc, i) => Math.max(acc, i.formPagina || 1), 1);
      const countOnLastPage = evItems.filter((i) => (i.formPagina || 1) === lastPage).length;
      return countOnLastPage >= 15 ? lastPage + 1 : lastPage;
    },
    [db.itens],
  );

  const openNewItemModal = useCallback(
    (opts?: { presetCategoria?: CategoriaItem; presetValor?: ValorItem; voiceDraft?: Partial<Item> }) => {
      if (!activeEvento) {
        notify('Selecione ou crie um evento primeiro antes de cadastrar um item.', 'warning', true);
        setActiveTab('evento');
        return;
      }
      if (activeEvento.status === 'encerrado') {
        notify(
          `Evento ${activeEvento.codigo} está FECHADO (somente visualização). Reabra o evento para adicionar novos itens.`,
          'warning',
          true,
        );
        return;
      }
      setNewItemModal({ open: true, ...opts });
    },
    [activeEvento, notify, setActiveTab],
  );

  const closeNewItemModal = useCallback(() => setNewItemModal({ open: false }), []);

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

  const toggleEventoStatus = useCallback(
    (eventoId: string) => {
      const ev = db.eventos.find((e) => e.id === eventoId);
      if (!ev) return;
      const nextStatus: Evento['status'] = ev.status === 'ativo' ? 'encerrado' : 'ativo';
      setDb((prev) => ({
        ...prev,
        eventos: prev.eventos.map((e) =>
          e.id === eventoId ? { ...e, status: nextStatus, updatedAt: new Date().toISOString() } : e,
        ),
      }));
      notify(
        nextStatus === 'ativo'
          ? `Evento ${ev.codigo} ABERTO — permite visualizar, adicionar e atualizar registros.`
          : `Evento ${ev.codigo} FECHADO — modo somente visualização ativado.`,
        'info',
        true,
      );
    },
    [db.eventos, notify],
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
          voluntarios: prev.voluntarios.filter((v) => v.eventoId !== eventoId),
          programaPartes: prev.programaPartes.filter((p) => p.eventoId !== eventoId),
          participacoes: prev.participacoes.filter((p) => p.eventoId !== eventoId),
          guiaAV: prev.guiaAV.filter((g) => g.eventoId !== eventoId),
          lembretes: prev.lembretes.filter((l) => l.eventoId !== eventoId),
          referencias: prev.referencias.filter((r) => r.eventoId !== eventoId),
          sentinelaEstudos: prev.sentinelaEstudos.filter((s) => s.eventoId !== eventoId),
          sentinelaComentarios: prev.sentinelaComentarios.filter((c) => c.eventoId !== eventoId),
          conversas: prev.conversas.filter((m) => m.eventoId !== eventoId),
          activeEventoId: prev.activeEventoId === eventoId ? (remainingEvents[0]?.id ?? null) : prev.activeEventoId,
        };
      });
      notify('Evento e todos os módulos vinculados foram removidos localmente.', 'info');
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

  /* --- VOLUNTÁRIOS & CONVERSAS --- */
  const createVoluntario: AppContextValue['createVoluntario'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const novo: Voluntario = { ...input, id: generateId('vol'), createdAt: now, updatedAt: now };
      setDb((prev) => ({ ...prev, voluntarios: [novo, ...prev.voluntarios] }));
      notify(`Voluntário "${novo.nome}" cadastrado!`, 'success');
      return novo;
    },
    [notify],
  );

  const updateVoluntario = useCallback(
    (v: Voluntario) => {
      setDb((prev) => ({
        ...prev,
        voluntarios: prev.voluntarios.map((x) => (x.id === v.id ? { ...v, updatedAt: new Date().toISOString() } : x)),
      }));
      notify(`Cadastro de "${v.nome}" atualizado.`, 'success');
    },
    [notify],
  );

  const deleteVoluntario = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, voluntarios: prev.voluntarios.filter((x) => x.id !== id) }));
      notify('Voluntário removido.', 'info');
    },
    [notify],
  );

  const addConversaMensagem: AppContextValue['addConversaMensagem'] = useCallback((input) => {
    const msg: ConversaMensagem = {
      ...input,
      id: generateId('msg'),
      timestamp: new Date().toISOString(),
    };
    setDb((prev) => ({ ...prev, conversas: [...prev.conversas, msg] }));
    return msg;
  }, []);

  /* --- PRESIDÊNCIA DO CONGRESSO --- */
  const createProgramaParte: AppContextValue['createProgramaParte'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const nova: ProgramaParte = {
        ...input,
        id: generateId('prg'),
        modoCronometro: 'parado',
        inicioRealIso: '',
        fimRealIso: '',
        duracaoRealSegundos: 0,
        ensaioInicioIso: '',
        ensaioDuracaoSegundos: 0,
        mensagensLog: [],
        deviceId: db.config.deviceId,
        createdAt: now,
        updatedAt: now,
      };
      setDb((prev) => ({ ...prev, programaPartes: [...prev.programaPartes, nova] }));
      notify(`Parte "${nova.tema}" adicionada ao programa.`, 'success');
      return nova;
    },
    [db.config.deviceId, notify],
  );

  const updateProgramaParte = useCallback((parte: ProgramaParte) => {
    setDb((prev) => ({
      ...prev,
      programaPartes: prev.programaPartes.map((p) =>
        p.id === parte.id ? { ...parte, updatedAt: new Date().toISOString() } : p,
      ),
    }));
  }, []);

  const deleteProgramaParte = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        programaPartes: prev.programaPartes.filter((p) => p.id !== id),
        participacoes: prev.participacoes.filter((x) => x.programaParteId !== id),
        guiaAV: prev.guiaAV.filter((x) => x.programaParteId !== id),
      }));
      notify('Parte removida do programa.', 'info');
    },
    [notify],
  );

  const startProgramaParteLive = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        programaPartes: prev.programaPartes.map((p) =>
          p.id === id
            ? {
                ...p,
                modoCronometro: 'ao_vivo',
                inicioRealIso: now,
                fimRealIso: '',
                duracaoRealSegundos: 0,
                updatedAt: now,
              }
            : p,
        ),
      }));
      notify('Cronômetro AO VIVO iniciado!', 'success', true);
    },
    [notify],
  );

  const startProgramaParteRehearsal = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        programaPartes: prev.programaPartes.map((p) =>
          p.id === id
            ? {
                ...p,
                modoCronometro: 'ensaio_pessoal',
                ensaioInicioIso: now,
                updatedAt: now,
              }
            : p,
        ),
      }));
      notify('Ensaio Pessoal iniciado (não encerra a parte oficial).', 'info', true);
    },
    [notify],
  );

  const finishProgramaParte = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      const nowMs = new Date(now).getTime();
      setDb((prev) => ({
        ...prev,
        programaPartes: prev.programaPartes.map((p) => {
          if (p.id !== id) return p;
          if (p.modoCronometro === 'ensaio_pessoal') {
            const elapsed = p.ensaioInicioIso
              ? Math.max(0, Math.floor((nowMs - new Date(p.ensaioInicioIso).getTime()) / 1000))
              : 0;
            return {
              ...p,
              modoCronometro: 'parado',
              ensaioDuracaoSegundos: elapsed,
              ensaioInicioIso: '',
              updatedAt: now,
            };
          }
          const elapsed = p.inicioRealIso
            ? Math.max(0, Math.floor((nowMs - new Date(p.inicioRealIso).getTime()) / 1000))
            : p.duracaoRealSegundos;
          return {
            ...p,
            modoCronometro: 'concluido',
            fimRealIso: now,
            duracaoRealSegundos: elapsed,
            updatedAt: now,
          };
        }),
      }));
      notify('Cronômetro encerrado e tempo registrado!', 'success', true);
    },
    [notify],
  );

  const restoreProgramaParte = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        programaPartes: prev.programaPartes.map((p) =>
          p.id === id
            ? {
                ...p,
                modoCronometro: 'parado',
                inicioRealIso: '',
                fimRealIso: '',
                duracaoRealSegundos: 0,
                ensaioInicioIso: '',
                ensaioDuracaoSegundos: 0,
                updatedAt: now,
              }
            : p,
        ),
      }));
      notify('Parte restaurada para o estado inicial.', 'info');
    },
    [notify],
  );

  const logProgramaComunicacao = useCallback(
    (parteId: string, canal: ComunicacaoLog['canal'], resumo: string) => {
      const now = new Date().toISOString();
      const entry: ComunicacaoLog = {
        id: generateId('com'),
        timestamp: now,
        canal,
        resumo,
        operador: db.config.operadorPadrao,
      };
      setDb((prev) => ({
        ...prev,
        programaPartes: prev.programaPartes.map((p) =>
          p.id === parteId ? { ...p, mensagensLog: [entry, ...p.mensagensLog], updatedAt: now } : p,
        ),
      }));
    },
    [db.config.operadorPadrao],
  );

  const createParticipacao: AppContextValue['createParticipacao'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const nova: ParticipacaoPrograma = { ...input, id: generateId('prt'), createdAt: now, updatedAt: now };
      setDb((prev) => ({ ...prev, participacoes: [nova, ...prev.participacoes] }));
      notify(`Participação (${nova.tipoParticipacao}) de ${nova.participanteNome} salva!`, 'success');
      return nova;
    },
    [notify],
  );

  const updateParticipacao = useCallback((p: ParticipacaoPrograma) => {
    setDb((prev) => ({
      ...prev,
      participacoes: prev.participacoes.map((x) => (x.id === p.id ? { ...p, updatedAt: new Date().toISOString() } : x)),
    }));
  }, []);

  const deleteParticipacao = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, participacoes: prev.participacoes.filter((x) => x.id !== id) }));
      notify('Participação removida.', 'info');
    },
    [notify],
  );

  const createGuiaAV: AppContextValue['createGuiaAV'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const novo: GuiaAudioVideo = { ...input, id: generateId('gav'), createdAt: now, updatedAt: now };
      setDb((prev) => ({ ...prev, guiaAV: [...prev.guiaAV, novo] }));
      notify('Dica de Áudio e Vídeo adicionada!', 'success');
      return novo;
    },
    [notify],
  );

  const updateGuiaAV = useCallback((g: GuiaAudioVideo) => {
    setDb((prev) => ({
      ...prev,
      guiaAV: prev.guiaAV.map((x) => (x.id === g.id ? { ...g, updatedAt: new Date().toISOString() } : x)),
    }));
  }, []);

  const deleteGuiaAV = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, guiaAV: prev.guiaAV.filter((x) => x.id !== id) }));
      notify('Item removido do Guia A/V.', 'info');
    },
    [notify],
  );

  const createLembrete: AppContextValue['createLembrete'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const novo: LembreteAgenda = { ...input, id: generateId('lem'), createdAt: now, updatedAt: now };
      setDb((prev) => ({ ...prev, lembretes: [novo, ...prev.lembretes] }));
      notify(`${novo.ehAgenda ? 'Evento da Agenda' : 'Lembrete'} salvo!`, 'success');
      return novo;
    },
    [notify],
  );

  const updateLembrete = useCallback((l: LembreteAgenda) => {
    setDb((prev) => ({
      ...prev,
      lembretes: prev.lembretes.map((x) => (x.id === l.id ? { ...l, updatedAt: new Date().toISOString() } : x)),
    }));
  }, []);

  const toggleLembreteConcluido = useCallback(
    (id: string) => {
      const op = db.config.operadorPadrao || 'Operador';
      setDb((prev) => ({
        ...prev,
        lembretes: prev.lembretes.map((l) => {
          if (l.id !== id) return l;
          const exists = l.concluidoPorOperadores.includes(op);
          return {
            ...l,
            concluidoPorOperadores: exists
              ? l.concluidoPorOperadores.filter((x) => x !== op)
              : [...l.concluidoPorOperadores, op],
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    [db.config.operadorPadrao],
  );

  const deleteLembrete = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, lembretes: prev.lembretes.filter((x) => x.id !== id) }));
      notify('Registro removido.', 'info');
    },
    [notify],
  );

  const createReferencia: AppContextValue['createReferencia'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const nova: DocumentoReferencia = { ...input, id: generateId('ref'), createdAt: now, updatedAt: now };
      setDb((prev) => ({ ...prev, referencias: [nova, ...prev.referencias] }));
      notify(`Documento ${nova.codigo} salvo!`, 'success');
      return nova;
    },
    [notify],
  );

  const updateReferencia = useCallback((r: DocumentoReferencia) => {
    setDb((prev) => ({
      ...prev,
      referencias: prev.referencias.map((x) => (x.id === r.id ? { ...r, updatedAt: new Date().toISOString() } : x)),
    }));
  }, []);

  const deleteReferencia = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, referencias: prev.referencias.filter((x) => x.id !== id) }));
      notify('Documento removido.', 'info');
    },
    [notify],
  );

  /* --- RESUMO DE A SENTINELA --- */
  const saveSentinelaEstudo: AppContextValue['saveSentinelaEstudo'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const id = input.id ?? generateId('snt');
      const saved: SentinelaEstudo = {
        ...input,
        id,
        createdAt: now,
        updatedAt: now,
      };
      setDb((prev) => {
        const exists = prev.sentinelaEstudos.some((s) => s.id === id);
        return {
          ...prev,
          sentinelaEstudos: exists
            ? prev.sentinelaEstudos.map((s) => (s.id === id ? { ...saved, createdAt: s.createdAt } : s))
            : [saved, ...prev.sentinelaEstudos],
        };
      });
      notify('Cabeçalho do Resumo de A Sentinela salvo!', 'success');
      return saved;
    },
    [notify],
  );

  const createSentinelaComentario: AppContextValue['createSentinelaComentario'] = useCallback(
    (input) => {
      const now = new Date().toISOString();
      const novo: SentinelaComentario = { ...input, id: generateId('scm'), createdAt: now, updatedAt: now };
      setDb((prev) => ({ ...prev, sentinelaComentarios: [...prev.sentinelaComentarios, novo] }));
      notify(`Comentário #${novo.ordenacao} adicionado à ordem de entrada!`, 'success');
      return novo;
    },
    [notify],
  );

  const updateSentinelaComentario = useCallback(
    (c: SentinelaComentario, silent = false) => {
      setDb((prev) => ({
        ...prev,
        sentinelaComentarios: prev.sentinelaComentarios.map((x) =>
          x.id === c.id ? { ...c, updatedAt: new Date().toISOString() } : x,
        ),
      }));
      if (!silent) notify(`Comentário #${c.ordenacao} atualizado.`, 'success');
    },
    [notify],
  );

  const deleteSentinelaComentario = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, sentinelaComentarios: prev.sentinelaComentarios.filter((x) => x.id !== id) }));
      notify('Comentário removido da ordem.', 'info');
    },
    [notify],
  );

  const moveSentinelaComentario = useCallback((estudoId: string, comentarioId: string, direction: 'up' | 'down') => {
    setDb((prev) => {
      const ofStudy = prev.sentinelaComentarios.filter((c) => c.estudoId === estudoId);
      const others = prev.sentinelaComentarios.filter((c) => c.estudoId !== estudoId);
      const reordered = reorderSentinelaComentario(ofStudy, comentarioId, direction);
      return { ...prev, sentinelaComentarios: [...others, ...reordered] };
    });
  }, []);

  const backupSentinelaComentario = useCallback(
    (comentarioId: string) => {
      setDb((prev) => ({
        ...prev,
        sentinelaComentarios: prev.sentinelaComentarios.map((c) =>
          c.id === comentarioId
            ? { ...c, backupSnapshot: createSentinelaBackup(c), updatedAt: new Date().toISOString() }
            : c,
        ),
      }));
      notify('Cópia de segurança do comentário salva (pronta para Recuperar)!', 'success');
    },
    [notify],
  );

  const restoreSentinelaComentario = useCallback(
    (comentarioId: string) => {
      setDb((prev) => ({
        ...prev,
        sentinelaComentarios: prev.sentinelaComentarios.map((c) =>
          c.id === comentarioId ? restoreSentinelaFromBackup(c) : c,
        ),
      }));
      notify('Comentário restaurado a partir do backup salvo!', 'info');
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
      voluntarios: [...seed.voluntarios, ...prev.voluntarios],
      programaPartes: [...seed.programaPartes, ...prev.programaPartes],
      participacoes: [...seed.participacoes, ...prev.participacoes],
      guiaAV: [...seed.guiaAV, ...prev.guiaAV],
      lembretes: [...seed.lembretes, ...prev.lembretes],
      referencias: [...seed.referencias, ...prev.referencias],
      sentinelaEstudos: [...seed.sentinelaEstudos, ...prev.sentinelaEstudos],
      sentinelaComentarios: [...seed.sentinelaComentarios, ...prev.sentinelaComentarios],
      conversas: [...seed.conversas, ...prev.conversas],
    }));
    notify('Demonstração completa (Achados + Presidência + Sentinela) carregada!', 'success', true);
  }, [db.config, notify]);

  const clearAllData = useCallback(() => {
    const fresh = createEmptyDatabase();
    fresh.config = db.config;
    setDb(fresh);
    setActiveTab('evento');
    notify('Base local limpa. Pronto para começar um novo evento ou importar dados.', 'info');
  }, [db.config, notify, setActiveTab]);

  const value: AppContextValue = {
    db,
    activeTab,
    setActiveTab,
    activeSuite,
    switchSuite,
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
    programaQuickFilter,
    setProgramaQuickFilter,
    newItemModal,
    openNewItemModal,
    closeNewItemModal,
    updateVoiceDraft,
    policiesOpen,
    setPoliciesOpen,
    setActiveEvento,
    createEvento,
    updateEvento,
    toggleEventoStatus,
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
    createVoluntario,
    updateVoluntario,
    deleteVoluntario,
    addConversaMensagem,
    createProgramaParte,
    updateProgramaParte,
    deleteProgramaParte,
    startProgramaParteLive,
    startProgramaParteRehearsal,
    finishProgramaParte,
    restoreProgramaParte,
    logProgramaComunicacao,
    createParticipacao,
    updateParticipacao,
    deleteParticipacao,
    createGuiaAV,
    updateGuiaAV,
    deleteGuiaAV,
    createLembrete,
    updateLembrete,
    toggleLembreteConcluido,
    deleteLembrete,
    createReferencia,
    updateReferencia,
    deleteReferencia,
    saveSentinelaEstudo,
    createSentinelaComentario,
    updateSentinelaComentario,
    deleteSentinelaComentario,
    moveSentinelaComentario,
    backupSentinelaComentario,
    restoreSentinelaComentario,
    updateConfig,
    applySyncMerge,
    importSpreadsheet,
    recordExportLog,
    loadDemoData,
    clearAllData,
    retidosCount,
    procuradosAbertosCount,
    faltamDia1Count,
    sentinelaPendentesCount,
    getNextTagForEvent,
    getSuggestedFormPage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useAppStore(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppProvider');
  return ctx;
}

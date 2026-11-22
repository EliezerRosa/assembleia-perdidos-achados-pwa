export type EventoTipo = 'Assembleia' | 'Congresso' | 'Reunião Especial' | string;
export type EventoParte = 'A' | 'B' | 'Única' | '';

export type ValorItem = 'Baixo' | 'Comum' | 'Médio' | 'Alto' | 'Precioso';
export type CategoriaItem = 'Perdido' | 'Guardado' | 'Criança' | 'Idoso' | 'Adulto';
export type StatusItem = 'Ainda Guardado' | 'Em Conferência' | 'Já Entregue' | 'DESPACHADO';
export type DestinoSA = '' | 'DESCARTAR' | 'DOAR' | 'VENDER' | 'CONTAS';

export type EtapaRastreio =
  | 'RECEBIDO'
  | 'ETIQUETADO'
  | 'FOTO_REGISTRADA'
  | 'CONFERENCIA'
  | 'VINCULADO_PROCURADO'
  | 'TRANSFERIDO_DISPOSITIVO'
  | 'RETIDO_ALERTA'
  | 'ENTREGUE'
  | 'ENTREGUE_CONTAS'
  | 'DESPACHADO_SA'
  | 'REABERTO'
  | 'EDITADO';

export interface RastreioEvento {
  id: string;
  timestamp: string; // ISO 8601
  etapa: EtapaRastreio;
  titulo: string;
  detalhes: string;
  operador: string;
  dispositivo: string;
  localizacao?: string;
}

export interface Evento {
  id: string;
  tipo: EventoTipo;
  codigo: string; // Ex.: ES-005.27.1, CO-2027, AC-26-04-25
  circuito: string; // Ex.: ES-005
  parte: EventoParte;
  data: string; // YYYY-MM-DD
  local: string;
  superintendente: string;
  ajudantes: string;
  voluntariosNecessarios: number;
  voluntariosUsados: number;
  proximaEtiqueta: number;
  status: 'ativo' | 'encerrado';
  createdAt: string;
  updatedAt: string;
  deviceId: string;
}

export interface Item {
  id: string; // Row ID / UUID
  eventoId: string;
  etiqueta: number;
  etiquetaCodigo: string; // Ex.: "001" ou "B-001"
  etiquetaOrigem?: string; // Preserva código original em caso de renumeração no merge
  formPagina: number; // Página do formulário físico (onde vai a 2ª etiqueta gêmea)
  tipoItem: string;
  descricao: string;
  valor: ValorItem;
  categoria: CategoriaItem;

  // Fluxo Foto -> Etiqueta -> Foto (+ Foto de Entrega opcional)
  fotoEntrada: string; // Foto 1: Item com etiqueta física colada
  etiquetaConfirmadaNoItem: boolean;
  etiquetaConfirmadaNoFormulario: boolean;
  fotoEtiqueta: string; // Foto 2: Etiqueta no formulário / etiqueta de perto / comprovante
  fotoEntrega: string; // Foto 3 (opcional): Comprovação de entrega / despacho

  // Ciclo de vida
  status: StatusItem;
  destino: DestinoSA;

  // Recepção
  dataHoraGuardado: string; // ISO 8601
  quemTrouxe: string; // Nome e Tels de quem trouxe
  localAchado: string; // Local onde foi encontrado (ou "Balcão Guarda-Volumes")
  recebidoPor: string; // Voluntário que recebeu

  // Entrega / Despacho
  dataHoraDespachado: string; // ISO 8601 ou ''
  quemPegou: string; // Nome e Tels de quem levou (ou "Superintendente de Assembleia" / "Depto de Contas")
  entreguePor: string; // Voluntário que realizou a entrega
  observacaoEntrega: string;

  // Dados do Dono (obrigatórios para Guarda-Volumes exceto roupas — Política #58)
  donoNomeTels: string;
  congregacao: string;
  endereco: string;

  // Rastreio completo da entrada à entrega
  rastreio: RastreioEvento[];

  // Metadados de sincronização multi-dispositivo
  deviceId: string;
  deviceName: string;
  syncedFromDevices?: string[];
  createdAt: string;
  updatedAt: string;
}

export type StatusProcurado = 'PROCURANDO' | 'LOCALIZADO' | 'ENTREGUE' | 'CANCELADO';

export interface ItemProcurado {
  id: string;
  eventoId: string;
  nomeTelefone: string;
  congregacao: string;
  descricao: string;
  foto: string;
  provaveisItensIds: string[];
  status: StatusProcurado;
  createdAt: string;
  updatedAt: string;
  deviceId: string;
  deviceName: string;
}

export interface RelatorioFinal {
  id: string;
  eventoId: string;
  circuito: string;
  eventoTipo: 'Assembleia' | 'Congresso';
  parte: EventoParte;
  data: string;
  departamento: string;
  superintendente: string;
  ajudantes: string;
  voluntariosNecessarios: number;
  voluntariosUsados: number;
  dificuldadeAntes: boolean;
  dificuldadeAntesTexto: string;
  dificuldadeDurante: boolean;
  dificuldadeDuranteTexto: string;
  dificuldadeApos: boolean;
  dificuldadeAposTexto: string;
  sugestoes: string;
  responsavelRelatorio: string;
  congregacaoResponsavel: string;
  cidadeAssinatura: string;
  dataAssinatura: string;
  assinaturaNome: string;
  updatedAt: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  tipo: 'EXPORT_JSON' | 'IMPORT_MERGE_JSON' | 'IMPORT_EXCEL' | 'EXPORT_EXCEL' | 'EXPORT_CSV';
  origemDispositivo: string;
  eventosAdicionados: number;
  itensAdicionados: number;
  itensAtualizados: number;
  colisoesResolvidas: number;
  procuradosAdicionados: number;
  detalhes: string;
}

export type TemaUI = 'light' | 'dark' | 'high-contrast';
export type TamanhoFonte = 'normal' | 'grande' | 'extra';

export interface ConfiguracaoDispositivo {
  deviceId: string;
  deviceName: string;
  operadorPadrao: string;
  prefixoEtiqueta: string; // Ex.: "" ou "B-"
  etiquetaInicial: number; // Ex.: 1, 101, 201
  prazoRetencaoDias: number; // Padrão 60 dias ("mais de 2 meses")
  vozFeedbackFalado: boolean;
  tema: TemaUI;
  tamanhoFonte: TamanhoFonte;
  autoMarcaDaguaEtiqueta: boolean;
}

export interface AppDatabase {
  schemaVersion: number;
  activeEventoId: string | null;
  config: ConfiguracaoDispositivo;
  eventos: Evento[];
  itens: Item[];
  procurados: ItemProcurado[];
  relatorios: RelatorioFinal[];
  tiposPersonalizados: string[];
  syncHistory: SyncLogEntry[];
}

export interface SyncBundle {
  format: 'ASSEMBLEIA_PA_SYNC_V1';
  exportedAt: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  scope: 'all' | 'single_event';
  eventos: Evento[];
  itens: Item[];
  procurados: ItemProcurado[];
  relatorios: RelatorioFinal[];
  tiposPersonalizados: string[];
}

export type EstrategiaColisaoEtiqueta = 'renumerar' | 'prefixo_dispositivo' | 'manter';
export type EstrategiaConflitoId = 'mais_recente' | 'manter_local' | 'sobrescrever_importado';

export interface ColisaoEtiquetaPreview {
  incomingItem: Item;
  existingItem: Item;
  eventoCodigo: string;
}

export interface ConflitoIdPreview {
  incomingItem: Item;
  existingItem: Item;
  diferencas: string[];
}

export interface MergePreview {
  sourceDeviceName: string;
  exportedAt: string;
  novosEventos: Evento[];
  eventosExistentesMesclados: number;
  novosItens: Item[];
  itensIdenticos: number;
  conflitosId: ConflitoIdPreview[];
  colisoesEtiqueta: ColisaoEtiquetaPreview[];
  novosProcurados: ItemProcurado[];
  novosRelatorios: RelatorioFinal[];
}

export type NavTab =
  | 'evento'
  | 'itens'
  | 'procurados'
  | 'destinar'
  | 'relatorio'
  | 'sincronizar'
  | 'arquitetura';

export type VoiceActionType =
  | { type: 'NAVIGATE'; tab: NavTab }
  | { type: 'OPEN_NEW_ITEM'; presetCategoria?: CategoriaItem; presetValor?: ValorItem }
  | { type: 'OPEN_NEW_EVENT' }
  | { type: 'OPEN_NEW_WANTED' }
  | { type: 'OPEN_POLICIES' }
  | { type: 'SEARCH'; query: string }
  | { type: 'FILTER_STATUS'; status: StatusItem | 'TODOS' | 'RETIDOS' }
  | { type: 'FILTER_CATEGORIA'; categoria: CategoriaItem | 'TODAS' }
  | { type: 'SPEAK_SUMMARY' }
  | { type: 'FILL_ITEM_FIELDS'; fields: Partial<Item> }
  | { type: 'SAVE_FORM' }
  | { type: 'CANCEL_FORM' }
  | { type: 'UNKNOWN'; transcript: string };

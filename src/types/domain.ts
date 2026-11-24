export type EventoTipo = 'Assembleia' | 'Congresso' | 'Reunião Especial' | string;
export type EventoParte = 'A' | 'B' | 'Única' | '';

export type AppSuiteMode = 'achados' | 'presidencia' | 'sentinela';

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
  salaoAssembleias?: string;
  telefoneResponsavel?: string;
  enderecoRestituicao?: string;
  cidadeAssinatura: string;
  dataAssinatura: string;
  assinaturaNome: string;
  updatedAt: string;
}

/* ============================================================================
 * BACKBONE COMPARTILHADO — EQUIPE, VOLUNTÁRIOS & CONVERSAS (Glide Eventos New)
 * ============================================================================ */

export type DepartamentoCongresso =
  | 'Presidência'
  | 'Comissão do Congresso'
  | 'Áudio e Vídeo'
  | 'Batismo'
  | 'Contas'
  | 'Indicadores'
  | 'Segurança'
  | 'Limpeza'
  | 'Estacionamentos'
  | 'Cuidados Infantis'
  | 'Primeiros Socorros'
  | 'Hospedagem'
  | 'Achados e Perdidos'
  | 'Sistema de Transporte'
  | 'Informações e Serviço Voluntário';

export type AreaDesignacao = 'Departamento' | 'Supervisão' | 'Vídeo' | 'Áudio' | 'Palco';

export type TipoVoluntario =
  | 'Ancião'
  | 'Servo Ministerial'
  | 'Publicador Adulto'
  | 'Publicador Jovem'
  | 'Publicador Menor'
  | 'Irmã';

export type FuncaoSetor =
  | 'Presidente'
  | 'Sup. Programa'
  | 'Presidente Sessão'
  | 'Homem-Chave'
  | 'Capitão'
  | 'Voluntário';

export interface Voluntario {
  id: string;
  eventoId: string;
  nome: string;
  congregacao: string;
  circuito: string;
  telefone: string; // WhatsApp / Telefone
  emailSecular: string;
  emailJwpub: string;
  foto: string; // DataURL ou SVG
  tipoVoluntario: TipoVoluntario;
  departamento: DepartamentoCongresso;
  areaDesignacao: AreaDesignacao;
  funcaoSetor: FuncaoSetor;
  habilitadoSentinela: boolean;
  habilitadoDemos: boolean;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversaMensagem {
  id: string;
  eventoId: string;
  contextoTipo: 'sentinela_estudo' | 'sentinela_comentario' | 'programa_parte';
  contextoId: string;
  autorNome: string;
  texto: string;
  timestamp: string;
}

/* ============================================================================
 * APP EMBUTIDO 1 — PRESIDÊNCIA DO CONGRESSO (Glide ANL4cdICJTsLdTONT7Hp)
 * ============================================================================ */

export type DiaCongresso = 'Sexta-feira' | 'Sábado' | 'Domingo';
export type TurnoCongresso = 'Manhã' | 'Tarde';

export type TipoPartePrograma =
  | 'Introdução'
  | 'Cântico'
  | 'Oração'
  | 'Cronômetro'
  | 'Discurso'
  | 'Anúncio'
  | 'Reunião'
  | 'Programa Musical'
  | 'Intervalo'
  | 'Relatório'
  | 'Tema do Dia'
  | 'Ensaio no Palco'
  | 'Leitura Dramatizada'
  | 'Drama';

export type FormatoPartePrograma = 'Ao Vivo' | 'Vídeo' | 'Áudio';

export type TipoParticipacao =
  | 'Experiências'
  | 'Demonstração'
  | 'Encenação'
  | 'Entrevista'
  | 'Comentários';

export type AudienciaLembrete =
  | 'Todos'
  | 'Presidente'
  | 'Equipe Presidência'
  | 'Sup. Programa'
  | 'Presidente Sessão'
  | 'Áudio e Vídeo'
  | 'Orador';

export interface SubstitutoOrador {
  ordem: 1 | 2 | 3;
  voluntarioId?: string;
  nome: string;
  congregacao: string;
  telefone: string;
}

export interface ComunicacaoLog {
  id: string;
  timestamp: string;
  canal: 'WhatsApp' | 'SMS' | 'Ligação' | 'E-mail';
  resumo: string;
  operador: string;
}

export type ModoCronometroParte = 'parado' | 'ao_vivo' | 'ensaio_pessoal' | 'concluido';

export interface ProgramaParte {
  id: string;
  eventoId: string;
  dia: DiaCongresso;
  /** Formato "YYYY-MM-DDTHH:mm" (hora local do evento) */
  dataHoraInicioProgramada: string;
  tempoProgramadoMin: number;
  tipo: TipoPartePrograma;
  formato: FormatoPartePrograma;
  tema: string;
  ehSerie: boolean;
  linkEsboco: string;

  // Orador titular + 3 substitutos (1º 🥇, 2º 🥈, 3º 🥉)
  oradorId?: string;
  oradorNome: string;
  oradorCongregacao: string;
  oradorCircuito: string;
  oradorTelefone: string;
  oradorEmailSecular: string;
  oradorEmailJwpub: string;
  oradorConfirmado: boolean;
  substitutos: SubstitutoOrador[];

  // Check-in em 3 etapas + Ensaio no Palco (Espelho fiel do Glide)
  checkInDia1: boolean; // (1) Apresentou-se no 1º dia do congresso
  checkIn30MinDia: boolean; // (2) Apresentou-se 30 min antes do início do dia
  checkIn30MinPalco: boolean; // (3) Apresentou-se 30 min antes da hora de entrar no palco
  ensaioPalcoFeito: boolean; // JÁ FEZ ENSAIO NO PALCO?
  ensaioPalcoHorario: string;

  // Cronômetro Dual-Mode (Ao Vivo vs Ensaio Pessoal)
  modoCronometro: ModoCronometroParte;
  inicioRealIso: string;
  fimRealIso: string;
  duracaoRealSegundos: number;
  ensaioInicioIso: string;
  ensaioDuracaoSegundos: number;

  // Comunicação & Notas
  observacoes: string;
  mensagensLog: ComunicacaoLog[];

  // Sync
  deviceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipacaoPrograma {
  id: string;
  eventoId: string;
  programaParteId: string;
  voluntarioId?: string;
  participanteNome: string;
  participanteCongregacao: string;
  participanteTelefone: string;
  tipoParticipacao: TipoParticipacao;
  descricao: string;
  orientacoes: string;
  diaHoraEnsaio: string; // YYYY-MM-DDTHH:mm ou texto
  presenteDia1: boolean;
  ensaioConfirmado: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MidiaTipoAV = 'Vídeo' | 'Áudio' | 'Imagem' | 'Slide' | 'Cântico' | 'Cronômetro';

export interface GuiaAudioVideo {
  id: string;
  eventoId: string;
  programaParteId: string;
  secaoSequencia: number;
  secaoTopico: string;
  secaoTempoMin: number;
  midiaTipo: MidiaTipoAV;
  midiaSequencia: number;
  midiaTempoSeg: number;
  dicaPlay: string; // Exata deixa verbal/visual para o operador de A/V
  linkMidia: string;
  executado: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LembreteAgenda {
  id: string;
  eventoId: string;
  ehAgenda: boolean; // true = Agenda / Ensaio agendado; false = Lembrete / Aviso RBAC
  titulo: string;
  descricao: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  visivelDesde: string;
  visivelAte: string;
  audiencia: AudienciaLembrete;
  programaParteId?: string;
  referenciaId?: string;
  concluidoPorOperadores: string[]; // "Já Lido e Feito" por operador
  createdAt: string;
  updatedAt: string;
}

export type CategoriaDocumentoRef = 'Presidência' | 'Programa' | 'Áudio e Vídeo' | 'Sentinela' | 'Geral';

export interface DocumentoReferencia {
  id: string;
  eventoId: string;
  codigo: string; // Ex.: S-329, CO-10, CO-90, CO-160, CCO-pgm
  titulo: string;
  categoria: CategoriaDocumentoRef;
  descricao: string;
  linkUrl: string;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================================
 * APP EMBUTIDO 2 — RESUMO DE A SENTINELA (Glide Resumo de A Sentinela Grok)
 * ============================================================================ */

export type PosicaoPalco = 'ESQUERDA' | 'DIREITA' | 'TRIBUNA';

export interface SentinelaEstudo {
  id: string;
  eventoId: string;
  tituloArtigo: string;
  edicaoSemana: string;
  textoBase: string;
  objetivo: string;
  canticoInicial: string;
  canticoFinal: string;
  linkArtigoJw: string;
  dia: DiaCongresso;
  horaInicio: string; // Ex.: "10:30"
  duracaoPrevistaMin: number; // Ex.: 30
  dirigenteNome: string;
  dirigenteTelefone: string;
  observacoesPalco: string;
  createdAt: string;
  updatedAt: string;
}

export interface SentinelaBackupSnapshot {
  savedAt: string;
  comentarioSugerido: string;
  comentarioTextoBiblico: string;
  conectivo: string;
  audioComentario: string;
}

export interface SentinelaComentario {
  id: string;
  eventoId: string;
  estudoId: string;
  ordenacao: number; // 1..N (controla a ordem de entrada e o encadeamento de tempo!)
  subtopico: string;
  paragrafos: string; // Ex.: "1-2", "5", "8-9"
  parteAB: '' | 'a' | 'b';
  linkParagrafo: string;
  pergunta: string;
  paragrafoResposta: string;
  respostaLiteral: string;
  comentarioSugerido: string;
  comentarioTextoBiblico: string;
  conectivo: string;

  // Cronograma em cascata & Coreografia de Palco
  tempoSegundos: number; // Padrão 30s
  posicaoPalco: PosicaoPalco; // ESQUERDA | DIREITA | TRIBUNA

  // Comentarista titular + Substituto + Check-ins
  comentaristaId?: string;
  comentaristaNome: string;
  comentaristaCongregacao: string;
  comentaristaTelefone: string;
  comentaristaFoto: string;
  ehCasal: boolean;

  substitutoId?: string;
  substitutoNome: string;
  substitutoTelefone: string;
  substitutoCongregacao: string;

  presenteDia1: boolean; // 1º Dia - Já no Local
  ensaioPalcoFeito: boolean; // Ensaio Palco Já Feito (Domingo 8:30)
  jaFeito: boolean; // Checkoff do dirigente durante o estudo

  // Imagem relacionada para A/V ("EXIBIR esta imagem")
  imagemRelacionada: string;
  imagemLegenda: string;

  // Estúdio de Áudio offline (MediaRecorder) + Snapshot de Backup
  audioPergunta: string;
  audioComentario: string;
  audioConectivo: string;
  backupSnapshot?: SentinelaBackupSnapshot;

  createdAt: string;
  updatedAt: string;
}

/* ============================================================================
 * LOGS, CONFIGURAÇÃO, BANCO LOCAL & SINCRONIZAÇÃO MULTI-DISPOSITIVO
 * ============================================================================ */

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
  // Módulo 1: Perdidos & Achados + Guarda-Volumes
  eventos: Evento[];
  itens: Item[];
  procurados: ItemProcurado[];
  relatorios: RelatorioFinal[];
  tiposPersonalizados: string[];
  // Backbone compartilhado
  voluntarios: Voluntario[];
  conversas: ConversaMensagem[];
  // Módulo 2: Presidência do Congresso
  programaPartes: ProgramaParte[];
  participacoes: ParticipacaoPrograma[];
  guiaAV: GuiaAudioVideo[];
  lembretes: LembreteAgenda[];
  referencias: DocumentoReferencia[];
  // Módulo 3: Resumo de A Sentinela
  sentinelaEstudos: SentinelaEstudo[];
  sentinelaComentarios: SentinelaComentario[];
  // Auditoria de Sync
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
  // Campos opcionais (v2) mantendo 100% compatibilidade com pacotes v1
  voluntarios?: Voluntario[];
  conversas?: ConversaMensagem[];
  programaPartes?: ProgramaParte[];
  participacoes?: ParticipacaoPrograma[];
  guiaAV?: GuiaAudioVideo[];
  lembretes?: LembreteAgenda[];
  referencias?: DocumentoReferencia[];
  sentinelaEstudos?: SentinelaEstudo[];
  sentinelaComentarios?: SentinelaComentario[];
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
  // Contadores dos apps embutidos (Presidência + Sentinela + Equipe)
  novosVoluntarios: number;
  novasPartesPrograma: number;
  partesAtualizadas: number;
  novasParticipacoes: number;
  novosGuiasAV: number;
  novosLembretes: number;
  novosEstudosSentinela: number;
  novosComentariosSentinela: number;
  comentariosAtualizados: number;
  novasConversas: number;
}

export type NavTab =
  // App 1: Perdidos & Achados + Guarda-Volumes
  | 'evento'
  | 'itens'
  | 'procurados'
  | 'destinar'
  | 'relatorio'
  // App 2: Presidência do Congresso
  | 'presidencia_foco'
  | 'presidencia_programa'
  | 'presidencia_demos'
  | 'presidencia_av'
  | 'presidencia_agenda'
  // App 3: Resumo de A Sentinela
  | 'sentinela_estudo'
  | 'sentinela_palco'
  | 'sentinela_imagens'
  | 'sentinela_audio'
  // Ferramentas Compartilhadas
  | 'equipe'
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

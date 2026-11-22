import { SCHEMA_VERSION } from '../constants/catalog';
import type { AppDatabase, ConfiguracaoDispositivo, Evento, Item, ItemProcurado } from '../types/domain';
import { createTrackingEvent, generateId } from './trackingService';

export const STORAGE_KEY = 'assembleia_pa_db_v1';
const ESTIMATED_QUOTA_BYTES = 5 * 1024 * 1024; // 5 MB conservador para localStorage

function detectDefaultDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Equipamento Local';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Celular Android — Balcão';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone/iPad — Balcão';
  if (/Windows/i.test(ua)) return 'PC Windows — Coordenação';
  if (/Mac/i.test(ua)) return 'Mac — Coordenação';
  return 'Equipamento Balcão';
}

export function createDefaultConfig(): ConfiguracaoDispositivo {
  return {
    deviceId: generateId('dev'),
    deviceName: detectDefaultDeviceName(),
    operadorPadrao: 'Voluntário Balcão',
    prefixoEtiqueta: '',
    etiquetaInicial: 1,
    prazoRetencaoDias: 60,
    vozFeedbackFalado: true,
    tema: 'light',
    tamanhoFonte: 'normal',
    autoMarcaDaguaEtiqueta: true,
  };
}

export function createEmptyDatabase(): AppDatabase {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeEventoId: null,
    config: createDefaultConfig(),
    eventos: [],
    itens: [],
    procurados: [],
    relatorios: [],
    tiposPersonalizados: [],
    syncHistory: [],
  };
}

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyDatabase();
    const parsed = JSON.parse(raw) as Partial<AppDatabase>;
    const base = createEmptyDatabase();
    return {
      ...base,
      ...parsed,
      config: {
        ...base.config,
        ...(parsed.config ?? {}),
      },
      eventos: Array.isArray(parsed.eventos) ? parsed.eventos : [],
      itens: Array.isArray(parsed.itens) ? parsed.itens : [],
      procurados: Array.isArray(parsed.procurados) ? parsed.procurados : [],
      relatorios: Array.isArray(parsed.relatorios) ? parsed.relatorios : [],
      tiposPersonalizados: Array.isArray(parsed.tiposPersonalizados) ? parsed.tiposPersonalizados : [],
      syncHistory: Array.isArray(parsed.syncHistory) ? parsed.syncHistory : [],
    };
  } catch {
    return createEmptyDatabase();
  }
}

export function saveDatabase(db: AppDatabase): { ok: boolean; error?: string; bytesUsed: number } {
  try {
    const serialized = JSON.stringify(db);
    localStorage.setItem(STORAGE_KEY, serialized);
    return { ok: true, bytesUsed: serialized.length * 2 };
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014);
    return {
      ok: false,
      bytesUsed: 0,
      error: isQuota
        ? 'Limite do localStorage atingido! Exporte um backup JSON na aba Sincronizar ou remova eventos antigos já encerrados.'
        : 'Erro ao gravar dados no localStorage.',
    };
  }
}

export function getStorageUsage(): {
  bytesUsed: number;
  kbUsed: number;
  mbUsed: number;
  percentUsed: number;
  nearLimit: boolean;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '';
    const bytesUsed = raw.length * 2; // UTF-16 aproximado
    const kbUsed = Math.round(bytesUsed / 1024);
    const mbUsed = Number((bytesUsed / (1024 * 1024)).toFixed(2));
    const percentUsed = Math.min(100, Math.round((bytesUsed / ESTIMATED_QUOTA_BYTES) * 100));
    return { bytesUsed, kbUsed, mbUsed, percentUsed, nearLimit: percentUsed >= 80 };
  } catch {
    return { bytesUsed: 0, kbUsed: 0, mbUsed: 0, percentUsed: 0, nearLimit: false };
  }
}

/**
 * Gera um SVG data URL leve e nítido para dados de demonstração sintéticos (zero dados reais/PII).
 */
function makeSyntheticPhotoSvg(title: string, tag: string, bg: string, fg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300">
    <rect width="420" height="300" fill="${bg}"/>
    <rect x="24" y="24" width="372" height="252" rx="18" fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
    <rect x="285" y="34" width="96" height="44" rx="10" fill="#fbbf24"/>
    <text x="333" y="63" font-family="sans-serif" font-size="22" font-weight="800" text-anchor="middle" fill="#1e293b">${tag}</text>
    <text x="210" y="165" font-family="sans-serif" font-size="26" font-weight="700" text-anchor="middle" fill="${fg}">${title}</text>
    <text x="210" y="205" font-family="sans-serif" font-size="14" text-anchor="middle" fill="${fg}" fill-opacity="0.85">Foto ilustrativa de demonstração</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Conjunto de demonstração 100% FICTÍCIO (sem dados pessoais reais — LGPD compliant)
 * para o usuário explorar todos os fluxos imediatamente (ou importar a planilha real na aba Sincronizar).
 */
export function createDemoSeedData(config: ConfiguracaoDispositivo): Pick<
  AppDatabase,
  'eventos' | 'itens' | 'procurados' | 'activeEventoId'
> {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const pastDate = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000); // 95 dias atrás (> 60 dias retido!)
  const pastIso = pastDate.toISOString().slice(0, 10);

  const evAtualId = generateId('evt');
  const evAnteriorId = generateId('evt');

  const eventos: Evento[] = [
    {
      id: evAtualId,
      tipo: 'Assembleia',
      codigo: 'ES-005.27.1',
      circuito: 'ES-005',
      parte: 'B',
      data: todayIso,
      local: 'Salão de Assembleias — Guarapari/ES',
      superintendente: 'Coordenação Local (Demo)',
      ajudantes: 'Equipe Voluntária A / B',
      voluntariosNecessarios: 5,
      voluntariosUsados: 5,
      proximaEtiqueta: 5,
      status: 'ativo',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deviceId: config.deviceId,
    },
    {
      id: evAnteriorId,
      tipo: 'Congresso',
      codigo: 'CO-2026-DEMO',
      circuito: 'ES-005',
      parte: 'Única',
      data: pastIso,
      local: 'Salão de Assembleias — Guarapari/ES',
      superintendente: 'Coordenação Local (Demo)',
      ajudantes: 'Equipe Voluntária',
      voluntariosNecessarios: 6,
      voluntariosUsados: 6,
      proximaEtiqueta: 3,
      status: 'encerrado',
      createdAt: pastDate.toISOString(),
      updatedAt: pastDate.toISOString(),
      deviceId: config.deviceId,
    },
  ];

  const itens: Item[] = [
    {
      id: generateId('itm'),
      eventoId: evAtualId,
      etiqueta: 1,
      etiquetaCodigo: '01',
      formPagina: 1,
      tipoItem: 'Garrafa Térmica',
      descricao: 'Garrafa térmica azul petróleo 750ml com alça preta (item de demonstração)',
      valor: 'Médio',
      categoria: 'Perdido',
      fotoEntrada: makeSyntheticPhotoSvg('Garrafa Térmica', '#01', '#0f766e', '#ffffff'),
      etiquetaConfirmadaNoItem: true,
      etiquetaConfirmadaNoFormulario: true,
      fotoEtiqueta: makeSyntheticPhotoSvg('Etiqueta #01 • Pág 1', 'FORM', '#1e3a5f', '#ffffff'),
      fotoEntrega: '',
      status: 'Ainda Guardado',
      destino: '',
      dataHoraGuardado: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      quemTrouxe: 'Voluntário Limpeza (Demo)',
      localAchado: 'Auditório — Setor B, fileira 4',
      recebidoPor: config.operadorPadrao,
      dataHoraDespachado: '',
      quemPegou: '',
      entreguePor: '',
      observacaoEntrega: '',
      donoNomeTels: '',
      congregacao: '',
      endereco: '',
      rastreio: [
        createTrackingEvent({
          etapa: 'RECEBIDO',
          titulo: 'Item Recebido no Balcão',
          detalhes: 'Etiqueta #01 colada no item e no formulário pág. 1. Foto de entrada e foto da etiqueta registradas.',
          operador: config.operadorPadrao,
          dispositivo: config.deviceName,
          localizacao: 'Mesa de Exposição — Achados e Perdidos',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        }),
      ],
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: generateId('itm'),
      eventoId: evAtualId,
      etiqueta: 2,
      etiquetaCodigo: '02',
      formPagina: 1,
      tipoItem: 'Celular',
      descricao: 'Smartphone preto com capa verde-água — NÃO EXPOR (Política #55)',
      valor: 'Alto',
      categoria: 'Perdido',
      fotoEntrada: makeSyntheticPhotoSvg('Celular (Cofre)', '#02', '#9f1239', '#ffffff'),
      etiquetaConfirmadaNoItem: true,
      etiquetaConfirmadaNoFormulario: true,
      fotoEtiqueta: makeSyntheticPhotoSvg('Etiqueta #02 • Pág 1', 'FORM', '#1e3a5f', '#ffffff'),
      fotoEntrega: '',
      status: 'Ainda Guardado',
      destino: '',
      dataHoraGuardado: new Date(now.getTime() - 65 * 60 * 1000).toISOString(),
      quemTrouxe: 'Indicador Entrada (Demo)',
      localAchado: 'Corredor próximo aos bebedouros',
      recebidoPor: config.operadorPadrao,
      dataHoraDespachado: '',
      quemPegou: '',
      entreguePor: '',
      observacaoEntrega: '',
      donoNomeTels: '',
      congregacao: '',
      endereco: '',
      rastreio: [
        createTrackingEvent({
          etapa: 'RECEBIDO',
          titulo: 'Item de Alto Valor Recebido (Cofre)',
          detalhes: 'Etiqueta #02 aplicada. Guardado fora de exposição conforme Política #55.',
          operador: config.operadorPadrao,
          dispositivo: config.deviceName,
          localizacao: 'Cofre / Área Restrita (Não Expor — Política #55)',
          timestamp: new Date(now.getTime() - 65 * 60 * 1000).toISOString(),
        }),
      ],
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: generateId('itm'),
      eventoId: evAtualId,
      etiqueta: 3,
      etiquetaCodigo: '03',
      formPagina: 1,
      tipoItem: 'Carrinho de Bebê',
      descricao: 'Carrinho dobrável cinza com suporte para 2 mamadeiras (Guarda-Volumes)',
      valor: 'Alto',
      categoria: 'Guardado',
      fotoEntrada: makeSyntheticPhotoSvg('Carrinho Bebê', '#03', '#1d4ed8', '#ffffff'),
      etiquetaConfirmadaNoItem: true,
      etiquetaConfirmadaNoFormulario: true,
      fotoEtiqueta: makeSyntheticPhotoSvg('Etiqueta #03 • Pág 1', 'FORM', '#1e3a5f', '#ffffff'),
      fotoEntrega: '',
      status: 'Ainda Guardado',
      destino: '',
      dataHoraGuardado: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      quemTrouxe: 'Família Exemplo (Demo) • (27) 90000-0001',
      localAchado: 'Balcão Guarda-Volumes',
      recebidoPor: config.operadorPadrao,
      dataHoraDespachado: '',
      quemPegou: '',
      entreguePor: '',
      observacaoEntrega: '',
      donoNomeTels: 'Família Exemplo • (27) 90000-0001',
      congregacao: 'Congregação Modelo',
      endereco: 'Rua das Palmeiras, 100 — Bairro Exemplo',
      rastreio: [
        createTrackingEvent({
          etapa: 'RECEBIDO',
          titulo: 'Volume Guardado (Guarda-Volumes)',
          detalhes: 'Identificação completa do dono registrada conforme Política #58.',
          operador: config.operadorPadrao,
          dispositivo: config.deviceName,
          localizacao: 'Prateleira Guarda-Volumes (Etiquetado)',
          timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
        }),
      ],
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: generateId('itm'),
      eventoId: evAtualId,
      etiqueta: 4,
      etiquetaCodigo: '04',
      formPagina: 1,
      tipoItem: 'Bíblia',
      descricao: 'Tradução do Novo Mundo tamanho médio capa cinza',
      valor: 'Precioso',
      categoria: 'Perdido',
      fotoEntrada: makeSyntheticPhotoSvg('Bíblia (Entregue)', '#04', '#047857', '#ffffff'),
      etiquetaConfirmadaNoItem: true,
      etiquetaConfirmadaNoFormulario: true,
      fotoEtiqueta: makeSyntheticPhotoSvg('Etiqueta #04 • Pág 1', 'FORM', '#1e3a5f', '#ffffff'),
      fotoEntrega: makeSyntheticPhotoSvg('Comprovante Entrega', 'OK', '#059669', '#ffffff'),
      status: 'Já Entregue',
      destino: '',
      dataHoraGuardado: new Date(now.getTime() - 180 * 60 * 1000).toISOString(),
      quemTrouxe: 'Indicador Auditório (Demo)',
      localAchado: 'Fileira em frente ao palco',
      recebidoPor: config.operadorPadrao,
      dataHoraDespachado: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      quemPegou: 'Solicitante Modelo • (27) 90000-0002',
      entreguePor: config.operadorPadrao,
      observacaoEntrega: 'Conferido nome na folha de rosto.',
      donoNomeTels: 'Solicitante Modelo • (27) 90000-0002',
      congregacao: 'Congregação Central (Demo)',
      endereco: 'Av. Principal, 250',
      rastreio: [
        createTrackingEvent({
          etapa: 'RECEBIDO',
          titulo: 'Item Recebido no Balcão',
          detalhes: 'Etiqueta #04 aplicada. Valor Precioso guardado em área restrita.',
          operador: config.operadorPadrao,
          dispositivo: config.deviceName,
          localizacao: 'Cofre / Área Restrita',
          timestamp: new Date(now.getTime() - 180 * 60 * 1000).toISOString(),
        }),
        createTrackingEvent({
          etapa: 'ENTREGUE',
          titulo: 'Entregue ao Dono / Retirante',
          detalhes: 'Solicitante Modelo • Conferido nome na folha de rosto.',
          operador: config.operadorPadrao,
          dispositivo: config.deviceName,
          localizacao: 'Entrega no Balcão',
          timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        }),
      ],
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: generateId('itm'),
      eventoId: evAnteriorId,
      etiqueta: 1,
      etiquetaCodigo: '01',
      formPagina: 1,
      tipoItem: 'Óculos',
      descricao: 'Óculos de sol armação marrom em estojo cinza (retido > 60 dias para Destinar SA)',
      valor: 'Médio',
      categoria: 'Perdido',
      fotoEntrada: makeSyntheticPhotoSvg('Óculos Retido (>60d)', '#01', '#b45309', '#ffffff'),
      etiquetaConfirmadaNoItem: true,
      etiquetaConfirmadaNoFormulario: true,
      fotoEtiqueta: makeSyntheticPhotoSvg('Etiqueta #01 • Pág 1', 'FORM', '#1e3a5f', '#ffffff'),
      fotoEntrega: '',
      status: 'Ainda Guardado',
      destino: '',
      dataHoraGuardado: pastDate.toISOString(),
      quemTrouxe: 'Equipe de Limpeza (Demo)',
      localAchado: 'Setor 3 cadeiras',
      recebidoPor: config.operadorPadrao,
      dataHoraDespachado: '',
      quemPegou: '',
      entreguePor: '',
      observacaoEntrega: '',
      donoNomeTels: '',
      congregacao: '',
      endereco: '',
      rastreio: [
        createTrackingEvent({
          etapa: 'RECEBIDO',
          titulo: 'Item Recebido no Congresso Anterior',
          detalhes: 'Aguardando destinação pelo SA após 60 dias sem procura.',
          operador: config.operadorPadrao,
          dispositivo: config.deviceName,
          localizacao: 'Caixa de Retidos — Encarregado',
          timestamp: pastDate.toISOString(),
        }),
      ],
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      createdAt: pastDate.toISOString(),
      updatedAt: pastDate.toISOString(),
    },
    {
      id: generateId('itm'),
      eventoId: evAnteriorId,
      etiqueta: 2,
      etiquetaCodigo: '02',
      formPagina: 1,
      tipoItem: 'Guarda-chuva',
      descricao: 'Guarda-chuva dobrável azul marinho (retido > 60 dias para Destinar SA)',
      valor: 'Baixo',
      categoria: 'Perdido',
      fotoEntrada: makeSyntheticPhotoSvg('Guarda-chuva (>60d)', '#02', '#334155', '#ffffff'),
      etiquetaConfirmadaNoItem: true,
      etiquetaConfirmadaNoFormulario: true,
      fotoEtiqueta: '',
      fotoEntrega: '',
      status: 'Ainda Guardado',
      destino: '',
      dataHoraGuardado: pastDate.toISOString(),
      quemTrouxe: 'Indicador Porta Principal (Demo)',
      localAchado: 'Entrada do estacionamento',
      recebidoPor: config.operadorPadrao,
      dataHoraDespachado: '',
      quemPegou: '',
      entreguePor: '',
      observacaoEntrega: '',
      donoNomeTels: '',
      congregacao: '',
      endereco: '',
      rastreio: [
        createTrackingEvent({
          etapa: 'RECEBIDO',
          titulo: 'Item Recebido no Congresso Anterior',
          detalhes: 'Etiqueta #02. Sem retirada durante o evento.',
          operador: config.operadorPadrao,
          dispositivo: config.deviceName,
          localizacao: 'Caixa de Retidos — Encarregado',
          timestamp: pastDate.toISOString(),
        }),
      ],
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      createdAt: pastDate.toISOString(),
      updatedAt: pastDate.toISOString(),
    },
  ];

  const procurados: ItemProcurado[] = [
    {
      id: generateId('prc'),
      eventoId: evAtualId,
      nomeTelefone: 'Visitante Exemplo • (27) 90000-0099',
      congregacao: 'Congregação Esperança (Demo)',
      descricao: 'Perdeu garrafa térmica azul petróleo com alça preta no setor B',
      foto: '',
      provaveisItensIds: [itens[0].id],
      status: 'LOCALIZADO',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deviceId: config.deviceId,
      deviceName: config.deviceName,
    },
  ];

  return {
    activeEventoId: evAtualId,
    eventos,
    itens,
    procurados,
  };
}

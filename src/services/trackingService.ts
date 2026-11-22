import type {
  CategoriaItem,
  DestinoSA,
  EtapaRastreio,
  Item,
  RastreioEvento,
  StatusItem,
  ValorItem,
} from '../types/domain';

export function generateId(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${rand}` : rand;
}

export function formatEtiquetaCodigo(etiqueta: number, prefixo = ''): string {
  const num = String(etiqueta).padStart(2, '0');
  return prefixo ? `${prefixo}${num}` : num;
}

export function createTrackingEvent(params: {
  etapa: EtapaRastreio;
  titulo: string;
  detalhes: string;
  operador: string;
  dispositivo: string;
  localizacao?: string;
  timestamp?: string;
}): RastreioEvento {
  return {
    id: generateId('trk'),
    timestamp: params.timestamp ?? new Date().toISOString(),
    etapa: params.etapa,
    titulo: params.titulo,
    detalhes: params.detalhes,
    operador: params.operador || 'Voluntário',
    dispositivo: params.dispositivo || 'Dispositivo Local',
    localizacao: params.localizacao,
  };
}

/**
 * Política #55: Carteiras, bolsas, dinheiro e artigos de valor (Alto/Precioso)
 * NÃO devem ficar expostos à vista no balcão.
 */
export function isRestrictedDisplay(item: Pick<Item, 'valor' | 'tipoItem' | 'categoria'>): boolean {
  if (item.valor === 'Alto' || item.valor === 'Precioso') return true;
  if (item.categoria === 'Criança' || item.categoria === 'Idoso' || item.categoria === 'Adulto') return true;
  const lower = item.tipoItem.toLowerCase();
  return ['carteira', 'bolsa', 'mochila', 'celular', 'dinheiro', 'chave', 'relógio', 'anel', 'pingente'].some((kw) =>
    lower.includes(kw),
  );
}

/**
 * Política #56: Pessoas perdidas (Criança, Idoso, Adulto) exigem protocolo urgente
 * sem anúncio no microfone, avisando Indicadores, SA e SC.
 */
export function isLostPerson(categoria: CategoriaItem): boolean {
  return categoria === 'Criança' || categoria === 'Idoso' || categoria === 'Adulto';
}

/**
 * Política #58: Guarda-Volumes exige nome, congregação, endereço e telefone do dono
 * para todos os itens exceto roupas (casacos/paletós/blusas).
 */
export function requiresOwnerIdentification(item: Pick<Item, 'categoria' | 'tipoItem'>): boolean {
  if (item.categoria !== 'Guardado') return false;
  const lower = item.tipoItem.toLowerCase();
  const isClothing = ['casaco', 'paletó', 'palito', 'blusa', 'blazer', 'blaser', 'roupa', 'jaqueta', 'capa'].some((k) =>
    lower.includes(k),
  );
  return !isClothing;
}

/**
 * Política #57: Dinheiro não procurado deve ser entregue ao Depto. de Contas ao fim da assembleia.
 */
export function isCashItem(item: Pick<Item, 'tipoItem' | 'descricao'>): boolean {
  const txt = `${item.tipoItem} ${item.descricao}`.toLowerCase();
  return ['dinheiro', 'cédula', 'cedula', 'reais', 'r$', 'moeda', 'espécie', 'especie'].some((k) => txt.includes(k));
}

export function getDiasGuardado(dataHoraGuardado: string, refDate = new Date()): number {
  const start = new Date(dataHoraGuardado);
  if (Number.isNaN(start.getTime())) return 0;
  const diffMs = refDate.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Itens RETIDOS são itens "Ainda Guardado" (ou "Em Conferência") há mais de X dias (padrão 60 dias / 2 meses),
 * aptos à destinação pelo Superintendente de Assembleia (SA).
 */
export function isItemRetido(item: Pick<Item, 'status' | 'dataHoraGuardado'>, prazoDias = 60, refDate = new Date()): boolean {
  if (item.status !== 'Ainda Guardado' && item.status !== 'Em Conferência') return false;
  return getDiasGuardado(item.dataHoraGuardado, refDate) >= prazoDias;
}

export function getMesesGuardadoTexto(dataHoraGuardado: string, refDate = new Date()): string {
  const dias = getDiasGuardado(dataHoraGuardado, refDate);
  if (dias < 1) return 'Hoje';
  if (dias === 1) return '1 dia';
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? '1 mês' : `${meses} meses`;
}

/**
 * Gera string DESC no formato compatível com o aplicativo Glide e a planilha Excel.
 */
export function buildLegacyDesc(item: Item): string {
  const actorPart =
    item.status === 'Já Entregue'
      ? `Quem e quando Pegou: ${item.quemPegou || 'Não informado'} (${item.dataHoraDespachado || ''})`
      : `Quem e quando Trouxe: ${item.quemTrouxe || 'Não informado'}${item.localAchado ? ` - ${item.localAchado}` : ''} (${item.dataHoraGuardado || ''})`;
  return `Etiqueta = ${item.etiqueta} | Valor (${item.valor}) | ${item.tipoItem} (${item.categoria}) | ${actorPart} | DESCRIÇÃO: ${item.descricao}`;
}

export interface TransitionResult {
  item: Item;
  valid: boolean;
  error?: string;
}

export function transitionItemToConference(
  item: Item,
  operador: string,
  dispositivo: string,
  observacao: string,
): TransitionResult {
  if (item.status === 'Já Entregue' || item.status === 'DESPACHADO') {
    return { item, valid: false, error: 'Item já finalizado. Reabra antes de colocar em conferência.' };
  }
  const now = new Date().toISOString();
  const ev = createTrackingEvent({
    etapa: 'CONFERENCIA',
    titulo: 'Em Conferência com Solicitante',
    detalhes: observacao || 'Item separado para validação de características com provável dono.',
    operador,
    dispositivo,
    localizacao: 'Balcão de Conferência',
    timestamp: now,
  });
  return {
    valid: true,
    item: {
      ...item,
      status: 'Em Conferência',
      rastreio: [...item.rastreio, ev],
      updatedAt: now,
    },
  };
}

export function transitionItemToDelivered(
  item: Item,
  payload: {
    quemPegou: string;
    donoNomeTels: string;
    congregacao: string;
    endereco: string;
    fotoEntrega?: string;
    observacaoEntrega?: string;
    entregueContas?: boolean;
  },
  operador: string,
  dispositivo: string,
): TransitionResult {
  if (!payload.quemPegou.trim() && !payload.entregueContas) {
    return { item, valid: false, error: 'Informe quem retirou o item (nome e telefone).' };
  }
  const now = new Date().toISOString();
  const quemPegouFinal = payload.entregueContas
    ? payload.quemPegou.trim() || 'Entregue ao Departamento de Contas'
    : payload.quemPegou.trim();

  const ev = createTrackingEvent({
    etapa: payload.entregueContas ? 'ENTREGUE_CONTAS' : 'ENTREGUE',
    titulo: payload.entregueContas ? 'Entregue ao Depto. de Contas' : 'Entregue ao Dono / Retirante',
    detalhes: `${quemPegouFinal}${payload.congregacao ? ` • Cong.: ${payload.congregacao}` : ''}${
      payload.observacaoEntrega ? ` • Obs.: ${payload.observacaoEntrega}` : ''
    }`,
    operador,
    dispositivo,
    localizacao: payload.entregueContas ? 'Departamento de Contas' : 'Entrega no Balcão',
    timestamp: now,
  });

  return {
    valid: true,
    item: {
      ...item,
      status: 'Já Entregue',
      destino: payload.entregueContas ? 'CONTAS' : item.destino,
      dataHoraDespachado: now,
      quemPegou: quemPegouFinal,
      entreguePor: operador,
      donoNomeTels: payload.donoNomeTels.trim() || item.donoNomeTels,
      congregacao: payload.congregacao.trim() || item.congregacao,
      endereco: payload.endereco.trim() || item.endereco,
      fotoEntrega: payload.fotoEntrega ?? item.fotoEntrega,
      observacaoEntrega: payload.observacaoEntrega?.trim() || item.observacaoEntrega,
      rastreio: [...item.rastreio, ev],
      updatedAt: now,
    },
  };
}

export function transitionItemToDispatchedSA(
  item: Item,
  destino: Exclude<DestinoSA, ''>,
  operador: string,
  dispositivo: string,
  observacao = '',
): TransitionResult {
  const now = new Date().toISOString();
  const destinoLabels: Record<Exclude<DestinoSA, ''>, string> = {
    DESCARTAR: 'Descartar',
    DOAR: 'Doar',
    VENDER: 'Vender (depósito na conta do circuito)',
    CONTAS: 'Entregar ao Departamento de Contas',
  };
  const statusFinal: StatusItem = destino === 'CONTAS' ? 'Já Entregue' : 'DESPACHADO';
  const quemPegouFinal =
    destino === 'CONTAS' ? 'Departamento de Contas' : 'Superintendente de Assembleia';

  const ev = createTrackingEvent({
    etapa: destino === 'CONTAS' ? 'ENTREGUE_CONTAS' : 'DESPACHADO_SA',
    titulo: `Destinado pelo SA: ${destinoLabels[destino]}`,
    detalhes: observacao || `Destino definido como ${destino} após período de guarda.`,
    operador,
    dispositivo,
    localizacao: destino === 'CONTAS' ? 'Departamento de Contas' : 'Superintendência da Assembleia',
    timestamp: now,
  });

  return {
    valid: true,
    item: {
      ...item,
      status: statusFinal,
      destino,
      dataHoraDespachado: now,
      quemPegou: quemPegouFinal,
      entreguePor: operador,
      observacaoEntrega: observacao || item.observacaoEntrega,
      rastreio: [...item.rastreio, ev],
      updatedAt: now,
    },
  };
}

export function transitionItemReopen(
  item: Item,
  motivo: string,
  operador: string,
  dispositivo: string,
): TransitionResult {
  const now = new Date().toISOString();
  const ev = createTrackingEvent({
    etapa: 'REABERTO',
    titulo: 'Item Reaberto para Custódia',
    detalhes: motivo || 'Registro reaberto para correção ou retomada de guarda.',
    operador,
    dispositivo,
    localizacao: 'Balcão Principal',
    timestamp: now,
  });
  return {
    valid: true,
    item: {
      ...item,
      status: 'Ainda Guardado',
      destino: '',
      dataHoraDespachado: '',
      quemPegou: '',
      rastreio: [...item.rastreio, ev],
      updatedAt: now,
    },
  };
}

export function getSuggestedCustodyLocation(valor: ValorItem, categoria: CategoriaItem): string {
  if (isLostPerson(categoria)) return 'Sala de Atendimento / Acompanhamento (Política #56)';
  if (valor === 'Alto' || valor === 'Precioso') return 'Cofre / Área Restrita (Não Expor — Política #55)';
  if (categoria === 'Guardado') return 'Prateleira Guarda-Volumes (Etiquetado)';
  return 'Mesa de Exposição — Achados e Perdidos';
}

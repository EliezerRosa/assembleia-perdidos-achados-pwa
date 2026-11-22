import { DEFAULT_ITEM_TYPES } from '../constants/catalog';
import type { CategoriaItem, Item, ValorItem, VoiceActionType } from '../types/domain';

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakPtBr(text: string, enabled = true): void {
  if (!enabled || !isSpeechSynthesisSupported() || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 1.06;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  } catch {
    // Silencioso se o navegador bloquear autoplay de síntese
  }
}

export function startSingleUtteranceRecognition(callbacks: {
  onStart?: () => void;
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}): (() => void) | null {
  if (!isSpeechRecognitionSupported()) {
    callbacks.onError?.(
      'Reconhecimento de voz não suportado neste navegador. Use Chrome/Edge ou digite o comando na barra rápida.',
    );
    return null;
  }

  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition)!;
  const rec = new Ctor();
  rec.lang = 'pt-BR';
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalTranscript = '';

  rec.onstart = () => callbacks.onStart?.();
  rec.onresult = (event) => {
    let interim = '';
    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        finalTranscript += res[0].transcript + ' ';
      } else {
        interim += res[0].transcript;
      }
    }
    if (interim) callbacks.onInterim?.(interim.trim());
    if (finalTranscript.trim()) {
      callbacks.onFinal(finalTranscript.trim());
      finalTranscript = '';
    }
  };
  rec.onerror = (e) => {
    const map: Record<string, string> = {
      'not-allowed': 'Permissão de microfone negada. Libere o microfone nas configurações do navegador.',
      'no-speech': 'Nenhuma fala detectada. Tente novamente falando mais próximo ao microfone.',
      network: 'Erro de rede no serviço de reconhecimento de voz.',
      aborted: '',
    };
    const msg = map[e.error] ?? `Erro de voz: ${e.error}`;
    if (msg) callbacks.onError?.(msg);
  };
  rec.onend = () => callbacks.onEnd?.();

  rec.start();
  return () => {
    try {
      rec.stop();
    } catch {
      // ignore
    }
  };
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parser inteligente de comandos de voz em Português (pt-BR).
 * Reconhece:
 * - Navegação entre abas
 * - Abertura de formulários com presets (Guarda-Volumes, Criança Perdida, Novo Evento, Novo Procurado)
 * - Busca e filtros rápidos
 * - Preenchimento estruturado de múltiplos campos de um item em uma única frase falada!
 */
export function parseVoiceCommand(
  rawTranscript: string,
  context: { isFormOpen?: boolean; customTypes?: string[] } = {},
): VoiceActionType {
  const original = rawTranscript.trim();
  const norm = normalizeStr(original);

  if (!norm) return { type: 'UNKNOWN', transcript: original };

  // Comandos de controle quando um formulário está aberto
  if (context.isFormOpen) {
    if (/^(salvar|confirmar|gravar|concluir)(\s+item|\s+formulario)?$/.test(norm)) {
      return { type: 'SAVE_FORM' };
    }
    if (/^(cancelar|fechar|voltar|desistir)$/.test(norm)) {
      return { type: 'CANCEL_FORM' };
    }
    const extracted = parseSpokenItemFields(original, context.customTypes);
    if (Object.keys(extracted).length > 0) {
      return { type: 'FILL_ITEM_FIELDS', fields: extracted };
    }
  }

  // Abertura de formulários e fluxos especiais
  if (/(crianca perdida|pessoa perdida|idoso perdido|registrar crianca|perdeu.*crianca)/.test(norm)) {
    return { type: 'OPEN_NEW_ITEM', presetCategoria: 'Criança', presetValor: 'Precioso' };
  }
  if (/(abrir guarda.?volumes|novo guardado|guardar volume|adicionar guardado|cadastrar guardado)/.test(norm)) {
    return { type: 'OPEN_NEW_ITEM', presetCategoria: 'Guardado' };
  }
  if (/(novo item|adicionar item|cadastrar item|registrar item|novo achado|novo perdido|abrir formulario)/.test(norm)) {
    return { type: 'OPEN_NEW_ITEM' };
  }
  if (/(novo evento|criar evento|cadastrar evento)/.test(norm)) {
    return { type: 'OPEN_NEW_EVENT' };
  }
  if (/(novo procurado|adicionar procurado|cadastrar procurado|alguem procurando)/.test(norm)) {
    return { type: 'OPEN_NEW_WANTED' };
  }

  // Navegação principal
  if (/(orientacoes|regras|manual|politicas|instrucoes)/.test(norm)) {
    return { type: 'OPEN_POLICIES' };
  }
  if (/(ler resumo|resumo do evento|estatisticas|quantos itens)/.test(norm)) {
    return { type: 'SPEAK_SUMMARY' };
  }
  if (/(abrir |ir para |mostrar )?(destinar|itens retidos|retidos|despachar|superintendente)/.test(norm)) {
    return { type: 'NAVIGATE', tab: 'destinar' };
  }
  if (/(abrir |ir para |mostrar )?(procurados|itens procurados)/.test(norm)) {
    return { type: 'NAVIGATE', tab: 'procurados' };
  }
  if (/(abrir |ir para |mostrar )?(relatorio|relatorio final|imprimir relatorio)/.test(norm)) {
    return { type: 'NAVIGATE', tab: 'relatorio' };
  }
  if (/(abrir |ir para |mostrar )?(sincronizar|sincronizacao|exportar|importar|mesclar|backup|planilha|excel)/.test(norm)) {
    return { type: 'NAVIGATE', tab: 'sincronizar' };
  }
  if (/(abrir |ir para |mostrar )?(arquitetura|diagramas|mer|uml)/.test(norm)) {
    return { type: 'NAVIGATE', tab: 'arquitetura' };
  }
  if (/(abrir |ir para |mostrar )?(evento|eventos|trocar evento|selecionar evento)/.test(norm)) {
    return { type: 'NAVIGATE', tab: 'evento' };
  }
  if (/(abrir |ir para |mostrar )?(itens|achados|perdidos|lista|inicio)/.test(norm)) {
    return { type: 'NAVIGATE', tab: 'itens' };
  }

  // Filtros rápidos
  if (/filtrar\s+(ainda\s+)?guardad/.test(norm)) return { type: 'FILTER_STATUS', status: 'Ainda Guardado' };
  if (/filtrar\s+(ja\s+)?entregu/.test(norm)) return { type: 'FILTER_STATUS', status: 'Já Entregue' };
  if (/filtrar\s+despachad/.test(norm)) return { type: 'FILTER_STATUS', status: 'DESPACHADO' };
  if (/filtrar\s+retid/.test(norm)) return { type: 'FILTER_STATUS', status: 'RETIDOS' };
  if (/filtrar\s+guarda.?volume/.test(norm)) return { type: 'FILTER_CATEGORIA', categoria: 'Guardado' };
  if (/filtrar\s+todos|limpar\s+filtros/.test(norm)) return { type: 'FILTER_STATUS', status: 'TODOS' };

  // Busca por termo
  const searchMatch = original.match(/^(?:buscar|procurar|pesquisar|encontrar)\s+(.+)$/i);
  if (searchMatch && searchMatch[1]) {
    return { type: 'SEARCH', query: searchMatch[1].trim() };
  }

  // Se o usuário já ditou características de um item mesmo fora do form, tenta extrair
  const fieldsFallback = parseSpokenItemFields(original, context.customTypes);
  if (fieldsFallback.tipoItem && (fieldsFallback.valor || fieldsFallback.categoria || fieldsFallback.quemTrouxe)) {
    return { type: 'FILL_ITEM_FIELDS', fields: fieldsFallback };
  }

  return { type: 'UNKNOWN', transcript: original };
}

/**
 * Extrai campos estruturados de uma frase falada em português natural.
 * Exemplo:
 * "Celular Samsung capa verde, valor alto, categoria perdido, quem trouxe Maria no banheiro feminino, página 2"
 */
export function parseSpokenItemFields(raw: string, customTypes: string[] = []): Partial<Item> {
  const fields: Partial<Item> = {};
  const text = raw.trim();
  const norm = normalizeStr(text);

  // 1. Valor
  const valorMap: Array<[RegExp, ValorItem]> = [
    [/\bvalor\s+(?:e\s+)?precioso\b|\bprecioso\b/, 'Precioso'],
    [/\bvalor\s+(?:e\s+)?alto\b/, 'Alto'],
    [/\bvalor\s+(?:e\s+)?medio\b/, 'Médio'],
    [/\bvalor\s+(?:e\s+)?baixo\b/, 'Baixo'],
    [/\bvalor\s+(?:e\s+)?comum\b/, 'Comum'],
  ];
  for (const [rx, val] of valorMap) {
    if (rx.test(norm)) {
      fields.valor = val;
      break;
    }
  }

  // 2. Categoria
  const catMap: Array<[RegExp, CategoriaItem]> = [
    [/\bcategoria\s+(?:e\s+)?guardad[oa]\b|\bguarda[\s-]?volumes\b/, 'Guardado'],
    [/\bcategoria\s+(?:e\s+)?perdid[oa]\b/, 'Perdido'],
    [/\bcategoria\s+(?:e\s+)?crianca\b|\bcrianca perdida\b/, 'Criança'],
    [/\bcategoria\s+(?:e\s+)?idos[oa]\b/, 'Idoso'],
    [/\bcategoria\s+(?:e\s+)?adult[oa]\b/, 'Adulto'],
  ];
  for (const [rx, cat] of catMap) {
    if (rx.test(norm)) {
      fields.categoria = cat;
      break;
    }
  }

  // 3. Página do formulário
  const pagMatch = norm.match(/\b(?:pagina|folha)\s*(?:numero\s*)?(\d+)\b/);
  if (pagMatch) {
    fields.formPagina = Number.parseInt(pagMatch[1], 10);
  }

  // 4. Campos rotulados explícitos (regex sobre texto original para manter acentos/capitalização)
  const extractClause = (pattern: RegExp): string => {
    const m = text.match(pattern);
    if (!m || !m[1]) return '';
    return m[1]
      .split(/,\s*(?=(?:valor|categoria|quem\s+trouxe|trouxe|local|achado|dono|congrega[çc][ãa]o|endere[çc]o|descri[çc][ãa]o|p[áa]gina|tipo|quem\s+pegou)\b)/i)[0]
      .trim();
  };

  const tipoExpl = extractClause(/\btipo(?:\s+de\s+item)?\s*:?\s+([^,;.]+)/i);
  if (tipoExpl) fields.tipoItem = capitalizeFirst(tipoExpl);

  const descExpl = extractClause(/\bdescri[çc][ãa]o\s*:?\s+(.+)/i);
  if (descExpl) fields.descricao = capitalizeFirst(descExpl);

  const quemTrouxeExpl = extractClause(/\b(?:quem\s+trouxe|trouxe|achado\s+por)\s*:?\s+(.+)/i);
  if (quemTrouxeExpl) {
    // Se disse "Maria no banheiro feminino", separa nome e local
    const locSplit = quemTrouxeExpl.match(/^(.+?)\s+(?:no|na|perto\s+d[oa]|em)\s+(.+)$/i);
    if (locSplit && !fields.localAchado) {
      fields.quemTrouxe = capitalizeFirst(locSplit[1].trim());
      fields.localAchado = capitalizeFirst(locSplit[2].trim());
    } else {
      fields.quemTrouxe = capitalizeFirst(quemTrouxeExpl);
    }
  }

  const localExpl = extractClause(/\b(?:local(?:\s+do\s+achado)?|encontrado\s+(?:no|na|em))\s*:?\s+(.+)/i);
  if (localExpl) fields.localAchado = capitalizeFirst(localExpl);

  const donoExpl = extractClause(/\b(?:dono|propriet[áa]rio)\s*:?\s+(.+)/i);
  if (donoExpl) fields.donoNomeTels = capitalizeFirst(donoExpl);

  const congExpl = extractClause(/\bcongrega[çc][ãa]o\s*:?\s+(.+)/i);
  if (congExpl) fields.congregacao = capitalizeFirst(congExpl);

  const endExpl = extractClause(/\bendere[çc]o\s*:?\s+(.+)/i);
  if (endExpl) fields.endereco = capitalizeFirst(endExpl);

  const pegouExpl = extractClause(/\b(?:quem\s+pegou|retirado\s+por|entregue\s+para)\s*:?\s+(.+)/i);
  if (pegouExpl) fields.quemPegou = capitalizeFirst(pegouExpl);

  // 5. Detecção automática de Tipo de Item pelo catálogo (ordena do mais longo para o mais curto, ex.: "Garrafa Térmica" antes de "Garrafa")
  if (!fields.tipoItem) {
    const allTypes = Array.from(new Set([...DEFAULT_ITEM_TYPES, ...customTypes])).sort(
      (a, b) => b.length - a.length,
    );
    for (const candidate of allTypes) {
      const baseWord = normalizeStr(candidate.split(' / ')[0].split(' (')[0]);
      if (baseWord.length >= 3 && new RegExp(`\\b${escapeRegex(baseWord)}`, 'i').test(norm)) {
        fields.tipoItem = candidate;
        break;
      }
    }
  }

  // 6. Se não houve "descrição:" explícita mas começou com o item descrito antes de vírgulas (ex: "Celular Samsung capa verde, valor alto")
  if (!fields.descricao && fields.tipoItem) {
    const headSegment = text
      .split(/,\s*(?=(?:valor|categoria|quem\s+trouxe|trouxe|local|dono|congrega[çc][ãa]o|endere[çc]o|p[áa]gina)\b)/i)[0]
      .trim();
    if (
      headSegment.length > fields.tipoItem.length + 2 &&
      !/^(valor|categoria|quem|dono|congrega|endere|p[áa]gina|local)/i.test(normalizeStr(headSegment))
    ) {
      fields.descricao = capitalizeFirst(headSegment);
    }
  }

  return fields;
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

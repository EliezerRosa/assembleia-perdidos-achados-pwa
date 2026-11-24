import type {
  AreaDesignacao,
  AudienciaLembrete,
  CategoriaDocumentoRef,
  CategoriaItem,
  DepartamentoCongresso,
  DestinoSA,
  DiaCongresso,
  FormatoPartePrograma,
  FuncaoSetor,
  MidiaTipoAV,
  PosicaoPalco,
  StatusItem,
  TipoPartePrograma,
  TipoParticipacao,
  TipoVoluntario,
  ValorItem,
} from '../types/domain';

export const SCHEMA_VERSION = 2;

/**
 * Catálogo normalizado derivado dos 170 registros reais da planilha
 * "Perdidos e Achados (Guarda-Volumes).xlsx" (deduplicado e acentuado corretamente).
 */
export const DEFAULT_ITEM_TYPES: string[] = [
  'Agenda',
  'Almofada',
  'Anel',
  'Batom',
  'Bíblia',
  'Blazer',
  'Blusa',
  'Bola',
  'Bolsa',
  'Bolsa Térmica',
  'Brinco',
  'Broche',
  'Brochura',
  'Cadeira',
  'Caixa Térmica',
  'Caneta',
  'Carrinho de Bebê',
  'Carro (Chave / Estacionamento)',
  'Carteira',
  'Casaco',
  'Celular',
  'Chave',
  'Cobertor de Bebê',
  'Colher / Talher',
  'Copo',
  'Criança / Pessoa',
  'Dinheiro',
  'Diversos Itens',
  'Fralda',
  'Garrafa',
  'Garrafa Térmica',
  'Guarda-chuva',
  'Lancheira Térmica',
  'Lápis',
  'Lenço',
  'Leque',
  'Maquiagem',
  'Mochila',
  'Mouse / Periférico',
  'Óculos',
  'Paletó',
  'Pano / Toalha de Prato',
  'Pente',
  'Pingente',
  'Pochete',
  'Prendedor de Cabelo',
  'Presilha',
  'Pulseira',
  'Relógio',
  'Sacola com Itens',
  'Sandália / Chinelo',
  'Sapato',
  'Tablet / Lousa',
  'Teclado',
  'Toalha',
  'Tupperware / Pote',
  'Xícara / Caneca',
];

export const VALORES_ITEM: ValorItem[] = ['Baixo', 'Comum', 'Médio', 'Alto', 'Precioso'];
export const CATEGORIAS_ITEM: CategoriaItem[] = ['Perdido', 'Guardado', 'Criança', 'Idoso', 'Adulto'];
export const STATUS_ITEM: StatusItem[] = ['Ainda Guardado', 'Em Conferência', 'Já Entregue', 'DESPACHADO'];
export const DESTINOS_SA: Exclude<DestinoSA, ''>[] = ['DESCARTAR', 'DOAR', 'VENDER', 'CONTAS'];

/* ============================================================================
 * ENUMS DO APP EMBUTIDO 1 — PRESIDÊNCIA DO CONGRESSO (Glide Listas Padrões)
 * ============================================================================ */

export const DIAS_CONGRESSO: DiaCongresso[] = ['Sexta-feira', 'Sábado', 'Domingo'];

export const PROGRAMA_TIPOS: TipoPartePrograma[] = [
  'Introdução',
  'Cântico',
  'Oração',
  'Cronômetro',
  'Discurso',
  'Anúncio',
  'Reunião',
  'Programa Musical',
  'Intervalo',
  'Relatório',
  'Tema do Dia',
  'Ensaio no Palco',
  'Leitura Dramatizada',
  'Drama',
];

export const PROGRAMA_FORMATOS: FormatoPartePrograma[] = ['Ao Vivo', 'Vídeo', 'Áudio'];

export const PARTICIPACAO_TIPOS: TipoParticipacao[] = [
  'Experiências',
  'Demonstração',
  'Encenação',
  'Entrevista',
  'Comentários',
];

export const MIDIA_TIPOS_AV: MidiaTipoAV[] = ['Vídeo', 'Áudio', 'Imagem', 'Slide', 'Cântico', 'Cronômetro'];

export const DEPARTAMENTOS_CONGRESSO: DepartamentoCongresso[] = [
  'Presidência',
  'Comissão do Congresso',
  'Áudio e Vídeo',
  'Batismo',
  'Contas',
  'Indicadores',
  'Segurança',
  'Limpeza',
  'Estacionamentos',
  'Cuidados Infantis',
  'Primeiros Socorros',
  'Hospedagem',
  'Achados e Perdidos',
  'Sistema de Transporte',
  'Informações e Serviço Voluntário',
];

export const AREAS_DESIGNACAO: AreaDesignacao[] = ['Departamento', 'Supervisão', 'Vídeo', 'Áudio', 'Palco'];

export const TIPOS_VOLUNTARIO: TipoVoluntario[] = [
  'Ancião',
  'Servo Ministerial',
  'Publicador Adulto',
  'Publicador Jovem',
  'Publicador Menor',
  'Irmã',
];

export const FUNCOES_SETOR: FuncaoSetor[] = [
  'Presidente',
  'Sup. Programa',
  'Presidente Sessão',
  'Homem-Chave',
  'Capitão',
  'Voluntário',
];

export const PRESIDENCIA_AUDIENCIAS: AudienciaLembrete[] = [
  'Todos',
  'Presidente',
  'Equipe Presidência',
  'Sup. Programa',
  'Presidente Sessão',
  'Áudio e Vídeo',
  'Orador',
];

export const CATEGORIAS_DOCUMENTO_REF: CategoriaDocumentoRef[] = [
  'Presidência',
  'Programa',
  'Áudio e Vídeo',
  'Sentinela',
  'Geral',
];

export const PRESIDENCIA_CHECKIN_ETAPAS = [
  { key: 'checkInDia1' as const, numero: 1, curto: '1º Dia', label: 'Apresentou-se no 1º dia do congresso' },
  { key: 'checkIn30MinDia' as const, numero: 2, curto: '30m Dia', label: 'Apresentou-se 30 min antes do início do dia' },
  { key: 'checkIn30MinPalco' as const, numero: 3, curto: '30m Palco', label: 'Apresentou-se 30 min antes de entrar no palco' },
];

/* ============================================================================
 * ENUMS & ORIENTAÇÕES DO APP EMBUTIDO 2 — RESUMO DE A SENTINELA
 * ============================================================================ */

export const POSICOES_PALCO: PosicaoPalco[] = ['ESQUERDA', 'DIREITA', 'TRIBUNA'];

export const POSICAO_PALCO_STYLE: Record<
  PosicaoPalco,
  { bg: string; text: string; border: string; bannerBg: string; label: string }
> = {
  ESQUERDA: {
    bg: 'bg-amber-100',
    text: 'text-amber-950',
    border: 'border-amber-400',
    bannerBg: 'bg-[#FFD700] text-slate-950',
    label: '⬅️ ESQUERDA',
  },
  DIREITA: {
    bg: 'bg-sky-100',
    text: 'text-sky-950',
    border: 'border-sky-400',
    bannerBg: 'bg-[#FFD700] text-slate-950',
    label: 'DIREITA ➡️',
  },
  TRIBUNA: {
    bg: 'bg-purple-100',
    text: 'text-purple-950',
    border: 'border-purple-400',
    bannerBg: 'bg-[#FFD700] text-slate-950',
    label: '🎙️ TRIBUNA',
  },
};

export const SENTINELA_ORIENTACOES = {
  palco: [
    'Entrar no palco somente na sua vez, seguindo a sinalização do irmão do Palco.',
    'Alternar rigorosamente os dois lados do palco (ESQUERDA ↔ DIREITA) para dar dinamismo e evitar filas no mesmo acesso.',
    'Casais entram juntos pelo mesmo lado; publicadores solteiros entram sozinhos.',
    'Sair discretamente pelo mesmo lado logo após concluir o comentário.',
  ],
  comentarios: [
    'Comentários devem ser breves (~30 segundos), naturais e com suas próprias palavras — NÃO ler no celular ou papel.',
    'Falar olhando para o dirigente na tribuna, como numa conversa calorosa — não discursar para a assistência.',
    'Irmãs devem responder de forma modesta e edificante, evitando tom de conselho ou ensino direto à assistência.',
    'Ao confirmar presença no 1º dia e participar do Ensaio no Palco (Domingo 8:30), alinhar microfone, postura e sinalização visual.',
  ],
  referencias: [
    { codigo: 'w19.01 p. 13 §18', tema: 'Como dar comentários breves, claros e edificantes' },
    { codigo: 'w16.09 pp. 18-19 §§5-8', tema: 'Modéstia, preparação e participação no estudo' },
    { codigo: 'th lição 5 p. 8', tema: 'Leitura exata, tom conversante e naturalidade' },
  ],
};

/**
 * Orientações oficiais do Departamento de Achados e Perdidos e Guarda-Volumes
 * (transcritas fielmente do quadro de instruções S-330 parágrafos 54 a 58 exibido no app Glide).
 */
export const ORIENTACOES_OFICIAIS = [
  {
    paragrafo: '54',
    titulo: 'Cobertura contínua do departamento',
    texto:
      'O Departamento de Achados e Perdidos e Guarda-Volumes deve ter voluntários durante todo o tempo em que o local da assembleia estiver aberto.',
    destaque: 'info' as const,
  },
  {
    paragrafo: '55',
    titulo: 'Achados e perdidos — Exposição e segurança',
    texto:
      'Itens de pouco valor devem ficar à mostra. Mas carteiras, bolsas e artigos de valor NÃO devem ficar expostos. As pessoas que procuram esses itens devem descrevê-los detalhadamente antes da conferência.',
    destaque: 'warning' as const,
  },
  {
    paragrafo: '56',
    titulo: 'Pessoas e crianças perdidas — Protocolo prioritário',
    texto:
      'Pessoas que se perdem de seus grupos, especialmente crianças que se perdem dos pais, devem ser levadas para o Departamento de Achados e Perdidos e Guarda-Volumes. Não se devem fazer anúncios sobre pessoas que se perderam. Sempre que isso acontecer, avisem imediatamente o Departamento de Indicadores, o Superintendente de Assembleia e o Superintendente de Circuito.',
    destaque: 'danger' as const,
  },
  {
    paragrafo: '57',
    titulo: 'Pós-evento, dinheiro e destinação pelo SA',
    texto:
      'Depois da assembleia, todos os itens perdidos que não forem retirados devem ficar com o encarregado do departamento. Dinheiro não procurado deve ser entregue ao Departamento de Contas no fim da assembleia. Objetos caros (como relógios, anéis e câmeras) ficam com o Superintendente de Assembleia até a próxima assembleia de circuito (ou prazo de retenção de 2 meses); depois disso, podem ser vendidos (valor depositado na conta do circuito), doados ou descartados conforme decisão do SA.',
    destaque: 'amber' as const,
  },
  {
    paragrafo: '58',
    titulo: 'Guarda-volumes — Identificação obrigatória',
    texto:
      'Os voluntários desse setor devem usar método seguro de etiquetas gêmeas (uma no item, outra no formulário) para identificar casacos, bagagens, pacotes e outros itens deixados ali. Todos os itens, com exceção de roupas, devem ser identificados com nome, congregação, endereço e telefone do dono.',
    destaque: 'teal' as const,
  },
];

export const COMANDOS_VOZ_GUIA = [
  { categoria: 'Achados & Perdidos', exemplo: '"Abrir itens" / "Novo item" / "Abrir guarda-volumes" / "Criança perdida"' },
  { categoria: 'Destinação & Relatório', exemplo: '"Abrir destinar" / "Abrir procurados" / "Abrir relatório"' },
  { categoria: 'Presidência do Congresso', exemplo: '"Abrir presidência" / "Abrir programa" / "Abrir demonstrações" / "Abrir guia áudio e vídeo" / "Abrir agenda"' },
  { categoria: 'Resumo de A Sentinela', exemplo: '"Abrir sentinela" / "Abrir palco" / "Abrir galeria" / "Abrir imagens" / "Abrir áudio completo"' },
  { categoria: 'Equipe, Sync & UML', exemplo: '"Abrir equipe" / "Abrir sincronização" / "Abrir arquitetura" / "Ler resumo"' },
  { categoria: 'Busca & Filtros', exemplo: '"Buscar garrafa" / "Filtrar guardados" / "Filtrar entregues"' },
  {
    categoria: 'Preencher Formulário',
    exemplo: '"Celular Samsung capa verde, valor alto, categoria perdido, quem trouxe Maria no banheiro"',
  },
  { categoria: 'Ações no Formulário', exemplo: '"Valor precioso" / "Categoria guardado" / "Salvar item"' },
];

export const VALOR_STYLE: Record<ValorItem, { bg: string; text: string; border: string; restricted: boolean }> = {
  Baixo: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', restricted: false },
  Comum: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', restricted: false },
  Médio: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', restricted: false },
  Alto: { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300', restricted: true },
  Precioso: { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300', restricted: true },
};

export const STATUS_STYLE: Record<StatusItem, { bg: string; text: string; dot: string }> = {
  'Ainda Guardado': { bg: 'bg-amber-100', text: 'text-amber-900', dot: 'bg-amber-500' },
  'Em Conferência': { bg: 'bg-indigo-100', text: 'text-indigo-900', dot: 'bg-indigo-500' },
  'Já Entregue': { bg: 'bg-emerald-100', text: 'text-emerald-900', dot: 'bg-emerald-500' },
  DESPACHADO: { bg: 'bg-slate-200', text: 'text-slate-800', dot: 'bg-slate-600' },
};

export const DESTINO_STYLE: Record<Exclude<DestinoSA, ''>, { bg: string; text: string; label: string }> = {
  DESCARTAR: { bg: 'bg-rose-100', text: 'text-rose-900', label: 'Descartar' },
  DOAR: { bg: 'bg-emerald-100', text: 'text-emerald-900', label: 'Doar' },
  VENDER: { bg: 'bg-amber-100', text: 'text-amber-900', label: 'Vender (Conta Circuito)' },
  CONTAS: { bg: 'bg-blue-100', text: 'text-blue-900', label: 'Entregue Depto. Contas' },
};

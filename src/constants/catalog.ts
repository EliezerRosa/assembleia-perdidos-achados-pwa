import type { CategoriaItem, DestinoSA, StatusItem, ValorItem } from '../types/domain';

export const SCHEMA_VERSION = 1;

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
  { categoria: 'Navegação', exemplo: '"Abrir eventos" / "Abrir itens" / "Abrir procurados"' },
  { categoria: 'Destinação SA', exemplo: '"Abrir destinar" / "Itens retidos"' },
  { categoria: 'Relatório & Sync', exemplo: '"Abrir relatório" / "Abrir sincronização" / "Abrir arquitetura"' },
  { categoria: 'Cadastro Rápido', exemplo: '"Novo item" / "Abrir guarda-volumes" / "Criança perdida"' },
  { categoria: 'Busca & Filtros', exemplo: '"Buscar garrafa" / "Filtrar guardados" / "Filtrar entregues"' },
  { categoria: 'Resumo Falado', exemplo: '"Ler resumo"' },
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

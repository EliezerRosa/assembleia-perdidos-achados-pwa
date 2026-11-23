import * as XLSX from 'xlsx';
import type {
  AppDatabase,
  CategoriaItem,
  DestinoSA,
  Evento,
  Item,
  RastreioEvento,
  StatusItem,
  SyncLogEntry,
  ValorItem,
} from '../types/domain';
import {
  buildLegacyDesc,
  createTrackingEvent,
  formatEtiquetaCodigo,
  generateId,
} from './trackingService';

function parseFlexibleDate(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString();
  }
  if (typeof val === 'number' && val > 20000) {
    // Excel serial date
    const utcDays = Math.floor(val - 25569);
    const frac = val - Math.floor(val);
    const ms = utcDays * 86400 * 1000 + Math.round(frac * 86400 * 1000);
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const str = String(val).trim();
  if (!str) return '';

  // Formato DD/MM/YYYY ou D/M/YYYY (com hora opcional)
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (brMatch) {
    const [, d, m, y, hh = '00', mm = '00', ss = '00'] = brMatch;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm}:${ss}.000Z`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  // Formato YYYY-MM-DD HH:MM:SS ou ISO
  const normalized = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return '';
}

function normalizeValor(raw: unknown): ValorItem {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s.includes('prec')) return 'Precioso';
  if (s.includes('alt')) return 'Alto';
  if (s.includes('méd') || s.includes('med')) return 'Médio';
  if (s.includes('com')) return 'Comum';
  return 'Baixo';
}

function normalizeCategoria(raw: unknown): CategoriaItem {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s.includes('guard')) return 'Guardado';
  if (s.includes('crian')) return 'Criança';
  if (s.includes('idos')) return 'Idoso';
  if (s.includes('adul')) return 'Adulto';
  return 'Perdido';
}

function normalizeStatus(raw: unknown, destino: DestinoSA, dataDespacho: string): StatusItem {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s.includes('entreg')) return 'Já Entregue';
  if (s.includes('despach')) return 'DESPACHADO';
  if (s.includes('confer')) return 'Em Conferência';
  if (destino) return 'DESPACHADO';
  if (dataDespacho) return 'Já Entregue';
  return 'Ainda Guardado';
}

function normalizeDestino(raw: unknown): DestinoSA {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'DESCARTAR' || s === 'DOAR' || s === 'VENDER' || s === 'CONTAS') return s;
  return '';
}

function cleanText(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw).trim();
}

function inferCircuit(codigo: string): string {
  const m = codigo.match(/^([A-Z]{2}-\d{3})/i);
  return m ? m[1].toUpperCase() : 'ES-005';
}

export interface ExcelImportResult {
  db: AppDatabase;
  log: SyncLogEntry;
  summary: {
    rowsProcessed: number;
    eventosCriados: number;
    itensImportados: number;
    itensIgnoradosDuplicados: number;
  };
}

/**
 * Importa diretamente a planilha "Perdidos e Achados (Guarda-Volumes).xlsx" ou CSV compatível,
 * preservando os Row IDs, eventos, etiquetas, fotos URL/base64, valores, status, destinos e datas.
 */
export function importFromSpreadsheetBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  localDb: AppDatabase,
): ExcelImportResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName =
    workbook.SheetNames.find((n) => n.toLowerCase() === 'itens') ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const now = new Date().toISOString();
  const eventosMap = new Map<string, Evento>(localDb.eventos.map((e) => [e.id, { ...e }]));
  const existingItemIds = new Set(localDb.itens.map((i) => i.id));
  const newItens: Item[] = [];
  const customTypes = new Set(localDb.tiposPersonalizados);

  let eventosCriados = 0;
  let itensIgnoradosDuplicados = 0;
  let rowsProcessed = 0;

  for (const row of rawRows) {
    const tipoItem = cleanText(row['Tipo de Item']);
    const descricao = cleanText(row['Descrição']);
    const etiquetaRaw = row['Etiqueta'];
    const rowId = cleanText(row['🔒 Row ID'] ?? row['Row ID'] ?? row['ID']);

    // Ignora linhas em branco (como a linha 2 ou linhas separadoras da planilha Glide)
    if (!tipoItem && !descricao && !etiquetaRaw && !rowId) continue;
    rowsProcessed++;

    const fkEvento = cleanText(row['fk_id_Eventos']);
    const eventoTipo = cleanText(row['Evento Tipo']) || 'Assembleia';
    const eventoCodigo = cleanText(row['Evento Código']) || 'EVENTO-IMPORTADO';
    const eventoDataIso =
      parseFlexibleDate(row['Evento Data']) ||
      parseFlexibleDate(row['X Evento Data']) ||
      parseFlexibleDate(row['Data-Hora-Guardado']) ||
      now;
    const eventoDataYmd = eventoDataIso.slice(0, 10);

    // Chave de agrupamento de evento: usa fk_id_Eventos se existir, senão tipo+código+data
    const eventoKey =
      fkEvento || `imp_${eventoTipo.toLowerCase()}_${eventoCodigo.toLowerCase()}_${eventoDataYmd}`;

    if (!eventosMap.has(eventoKey)) {
      eventosMap.set(eventoKey, {
        id: eventoKey,
        tipo: eventoTipo,
        codigo: eventoCodigo,
        circuito: inferCircuit(eventoCodigo),
        parte: '',
        data: eventoDataYmd,
        local: 'Salão de Assembleias — Guarapari/ES',
        superintendente: '',
        ajudantes: '',
        voluntariosNecessarios: 5,
        voluntariosUsados: 5,
        proximaEtiqueta: 1,
        status: 'encerrado',
        createdAt: eventoDataIso,
        updatedAt: now,
        deviceId: localDb.config.deviceId,
      });
      eventosCriados++;
    }

    const itemId = rowId || generateId('xls');
    if (existingItemIds.has(itemId)) {
      itensIgnoradosDuplicados++;
      continue;
    }

    const etiquetaNum = Number.parseInt(String(etiquetaRaw), 10) || 0;
    const formPaginaNum = Number.parseInt(String(row['Form Página'] ?? row['FormPágina'] ?? '1'), 10) || 1;
    const destino = normalizeDestino(row['DESTINO']);
    const dataGuardado = parseFlexibleDate(row['Data-Hora-Guardado']) || eventoDataIso;
    const dataDespacho = parseFlexibleDate(row['Data-Hora-Despachado']);
    const status = normalizeStatus(row['STATUS'], destino, dataDespacho);
    const valor = normalizeValor(row['Valor']);
    const categoria = normalizeCategoria(row['Categoria']);
    const quemTrouxe = cleanText(row['Quem-Trouxe-Nome-Tels']);
    const quemPegou = cleanText(row['Quem-Pegou-Nome-Tels']);
    const fotoUrl = cleanText(row['Fotox'] ?? row['Foto']);

    if (tipoItem) customTypes.add(tipoItem);

    const rastreio: RastreioEvento[] = [
      createTrackingEvent({
        etapa: 'RECEBIDO',
        titulo: 'Registro Importado da Planilha',
        detalhes: `Recebido de: ${quemTrouxe || 'Não informado'} • Etiqueta #${etiquetaNum} (Pág. ${formPaginaNum}).`,
        operador: 'Importação Excel',
        dispositivo: fileName,
        timestamp: dataGuardado,
      }),
    ];

    if (status === 'Já Entregue' && dataDespacho) {
      rastreio.push(
        createTrackingEvent({
          etapa: quemPegou.toLowerCase().includes('contas') ? 'ENTREGUE_CONTAS' : 'ENTREGUE',
          titulo: 'Entrega Registrada (Planilha)',
          detalhes: `Retirado por: ${quemPegou || cleanText(row['Dono-Nome-Tels']) || 'Não informado'}`,
          operador: 'Importação Excel',
          dispositivo: fileName,
          timestamp: dataDespacho,
        }),
      );
    } else if (status === 'DESPACHADO' && dataDespacho) {
      rastreio.push(
        createTrackingEvent({
          etapa: 'DESPACHADO_SA',
          titulo: `Despachado pelo SA (${destino || 'Sem destino'})`,
          detalhes: `Responsável: ${quemPegou || 'Superintendente de Assembleia'}`,
          operador: 'Importação Excel',
          dispositivo: fileName,
          timestamp: dataDespacho,
        }),
      );
    }

    const item: Item = {
      id: itemId,
      eventoId: eventoKey,
      etiqueta: etiquetaNum,
      etiquetaCodigo: formatEtiquetaCodigo(etiquetaNum),
      formPagina: formPaginaNum,
      tipoItem: tipoItem || 'Diversos Itens',
      descricao: descricao || tipoItem || 'Sem descrição',
      valor,
      categoria,
      fotoEntrada: fotoUrl,
      etiquetaConfirmadaNoItem: etiquetaNum > 0,
      etiquetaConfirmadaNoFormulario: formPaginaNum > 0,
      fotoEtiqueta: '',
      fotoEntrega: '',
      status,
      destino,
      dataHoraGuardado: dataGuardado,
      quemTrouxe,
      localAchado: '',
      recebidoPor: 'Importação Planilha',
      dataHoraDespachado: dataDespacho,
      quemPegou,
      entreguePor: dataDespacho ? 'Importação Planilha' : '',
      observacaoEntrega: '',
      donoNomeTels: cleanText(row['Dono-Nome-Tels']),
      congregacao: cleanText(row['Congregação']),
      endereco: cleanText(row['Endereço']),
      rastreio,
      deviceId: localDb.config.deviceId,
      deviceName: fileName,
      createdAt: dataGuardado,
      updatedAt: dataDespacho || dataGuardado,
    };

    existingItemIds.add(itemId);
    newItens.push(item);

    const ev = eventosMap.get(eventoKey)!;
    if (etiquetaNum >= ev.proximaEtiqueta) {
      ev.proximaEtiqueta = etiquetaNum + 1;
    }
  }

  const allEventos = Array.from(eventosMap.values()).sort((a, b) => b.data.localeCompare(a.data));
  const allItens = [...localDb.itens, ...newItens];

  const log: SyncLogEntry = {
    id: generateId('sync'),
    timestamp: now,
    tipo: 'IMPORT_EXCEL',
    origemDispositivo: fileName,
    eventosAdicionados: eventosCriados,
    itensAdicionados: newItens.length,
    itensAtualizados: 0,
    colisoesResolvidas: 0,
    procuradosAdicionados: 0,
    detalhes: `Importação da planilha "${fileName}" (${rowsProcessed} linhas lidas, ${newItens.length} itens importados, ${itensIgnoradosDuplicados} duplicados ignorados).`,
  };

  return {
    db: {
      ...localDb,
      activeEventoId: localDb.activeEventoId ?? (allEventos[0]?.id ?? null),
      eventos: allEventos,
      itens: allItens,
      tiposPersonalizados: Array.from(customTypes).sort(),
      syncHistory: [log, ...localDb.syncHistory].slice(0, 50),
    },
    log,
    summary: {
      rowsProcessed,
      eventosCriados,
      itensImportados: newItens.length,
      itensIgnoradosDuplicados,
    },
  };
}

/**
 * Exporta os itens no MESMO layout de 25 colunas da planilha Excel original
 * ("Perdidos e Achados (Guarda-Volumes).xlsx"), garantindo interoperabilidade total!
 */
export function exportToSpreadsheet(
  db: AppDatabase,
  format: 'xlsx' | 'csv',
  eventoId?: string,
): { blob: Blob; filename: string } {
  const eventosById = new Map(db.eventos.map((e) => [e.id, e]));
  const targetItens = eventoId ? db.itens.filter((i) => i.eventoId === eventoId) : db.itens;

  const rows = targetItens.map((item) => {
    const ev = eventosById.get(item.eventoId);
    const isPhotoDataUrl = item.fotoEntrada.startsWith('data:');
    return {
      'Form Página': item.formPagina,
      fk_id_Eventos: item.eventoId,
      DESTINO: item.destino,
      Evento: item.status,
      'Evento Tipo': ev?.tipo ?? 'Assembleia',
      'Evento Código': ev?.codigo ?? '',
      'X Evento Data': ev?.data ?? '',
      'Evento Data': ev?.data ?? '',
      Etiqueta: item.etiqueta,
      'Etiqueta Código': item.etiquetaCodigo,
      'Tipo de Item': item.tipoItem,
      Valor: item.valor,
      Categoria: item.categoria,
      Fotox: isPhotoDataUrl ? `[Foto embutida no App PWA - Etiqueta ${item.etiquetaCodigo}]` : item.fotoEntrada,
      'Tem Foto Etiqueta': item.fotoEtiqueta ? 'Sim' : 'Não',
      'Tem Foto Entrega': item.fotoEntrega ? 'Sim' : 'Não',
      Descrição: item.descricao,
      STATUS: item.status,
      DESC: buildLegacyDesc(item),
      'Data-Hora-Guardado': item.dataHoraGuardado,
      'Quem-Trouxe-Nome-Tels': [item.quemTrouxe, item.localAchado].filter(Boolean).join(' — '),
      'Data-Hora-Despachado': item.dataHoraDespachado,
      'Quem-Pegou-Nome-Tels': item.quemPegou,
      'Dono-Nome-Tels': item.donoNomeTels,
      Congregação: item.congregacao,
      Endereço: item.endereco,
      'Etapas Rastreio': item.rastreio.length,
      Dispositivo: item.deviceName,
      '🔒 Row ID': item.id,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Itens');

  const dateTag = new Date().toISOString().slice(0, 10);
  const evtSlug = eventoId ? `_${(eventosById.get(eventoId)?.codigo ?? 'evento').replace(/[^a-zA-Z0-9-]/g, '_')}` : '';

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return {
      blob: new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
      filename: `Perdidos_e_Achados${evtSlug}_${dateTag}.csv`,
    };
  }

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return {
    blob: new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename: `Perdidos_e_Achados${evtSlug}_${dateTag}.xlsx`,
  };
}

/**
 * Exporta arquivo PA.txt delimitado por TAB 100% compatível com o script JavaScript
 * embutido no PDF legado Anexo 1 (importTextData(".../PA.txt", H)).
 */
export function exportToAcrobatTxt(
  db: AppDatabase,
  eventoId?: string,
): { blob: Blob; filename: string } {
  const eventosById = new Map(db.eventos.map((e) => [e.id, e]));
  const targetItens = eventoId ? db.itens.filter((i) => i.eventoId === eventoId) : db.itens;

  const sanitize = (v: unknown) =>
    String(v ?? '')
      .replace(/\t/g, ' ')
      .replace(/\r?\n/g, ' ')
      .trim();

  const header = ['Form Página', 'Evento Código', 'Evento Data', 'STATUS', 'DESC', 'Row ID'].join('\t');
  const lines = targetItens.map((item) => {
    const ev = eventosById.get(item.eventoId);
    return [
      sanitize(item.formPagina || 1),
      sanitize(ev?.codigo ?? ''),
      sanitize(ev?.data ?? ''),
      sanitize(item.status),
      sanitize(buildLegacyDesc(item)),
      sanitize(item.id),
    ].join('\t');
  });

  const content = [header, ...lines].join('\r\n');
  return {
    blob: new Blob([content], { type: 'text/plain;charset=utf-8;' }),
    filename: 'PA.txt',
  };
}

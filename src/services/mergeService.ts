import type {
  AppDatabase,
  ColisaoEtiquetaPreview,
  ConflitoIdPreview,
  EstrategiaColisaoEtiqueta,
  EstrategiaConflitoId,
  Evento,
  Item,
  MergePreview,
  RastreioEvento,
  SyncBundle,
  SyncLogEntry,
} from '../types/domain';
import { createTrackingEvent, formatEtiquetaCodigo, generateId } from './trackingService';

export function buildSyncBundle(db: AppDatabase, scope: 'all' | 'single_event', eventoId?: string): SyncBundle {
  const targetEventoId = scope === 'single_event' ? eventoId ?? db.activeEventoId : null;
  const eventos = targetEventoId ? db.eventos.filter((e) => e.id === targetEventoId) : db.eventos;
  const eventoIds = new Set(eventos.map((e) => e.id));
  const itens = targetEventoId ? db.itens.filter((i) => eventoIds.has(i.eventoId)) : db.itens;
  const procurados = targetEventoId ? db.procurados.filter((p) => eventoIds.has(p.eventoId)) : db.procurados;
  const relatorios = targetEventoId ? db.relatorios.filter((r) => eventoIds.has(r.eventoId)) : db.relatorios;

  return {
    format: 'ASSEMBLEIA_PA_SYNC_V1',
    exportedAt: new Date().toISOString(),
    sourceDeviceId: db.config.deviceId,
    sourceDeviceName: db.config.deviceName,
    scope,
    eventos,
    itens,
    procurados,
    relatorios,
    tiposPersonalizados: db.tiposPersonalizados,
  };
}

export function parseSyncBundle(jsonText: string): { bundle?: SyncBundle; error?: string } {
  try {
    const parsed = JSON.parse(jsonText) as Partial<SyncBundle>;
    if (parsed.format !== 'ASSEMBLEIA_PA_SYNC_V1' || !Array.isArray(parsed.itens) || !Array.isArray(parsed.eventos)) {
      return { error: 'Arquivo JSON inválido ou formato não reconhecido (esperado pacote ASSEMBLEIA_PA_SYNC_V1).' };
    }
    return { bundle: parsed as SyncBundle };
  } catch {
    return { error: 'Não foi possível ler o arquivo JSON. Verifique se o arquivo não está corrompido.' };
  }
}

/**
 * Mapeia eventos recebidos para eventos locais equivalentes (mesmo ID ou mesmo Código + Data)
 * para permitir juntar itens registrados em celulares/PCs diferentes para o MESMO evento!
 */
function buildEventMapping(localEventos: Evento[], incomingEventos: Evento[]): {
  eventIdMap: Map<string, string>;
  novosEventos: Evento[];
  mescladosCount: number;
} {
  const eventIdMap = new Map<string, string>();
  const novosEventos: Evento[] = [];
  let mescladosCount = 0;

  for (const inc of incomingEventos) {
    const matchById = localEventos.find((e) => e.id === inc.id);
    if (matchById) {
      eventIdMap.set(inc.id, matchById.id);
      mescladosCount++;
      continue;
    }
    const normCode = inc.codigo.trim().toLowerCase();
    const normDate = (inc.data || '').slice(0, 10);
    const matchByKey = localEventos.find(
      (e) => e.codigo.trim().toLowerCase() === normCode && (e.data || '').slice(0, 10) === normDate,
    );
    if (matchByKey) {
      eventIdMap.set(inc.id, matchByKey.id);
      mescladosCount++;
    } else {
      eventIdMap.set(inc.id, inc.id);
      novosEventos.push(inc);
    }
  }
  return { eventIdMap, novosEventos, mescladosCount };
}

function diffItemFields(a: Item, b: Item): string[] {
  const diffs: string[] = [];
  if (a.status !== b.status) diffs.push(`Status: ${a.status} → ${b.status}`);
  if (a.destino !== b.destino) diffs.push(`Destino: ${a.destino || '-'} → ${b.destino || '-'}`);
  if (a.descricao !== b.descricao) diffs.push('Descrição alterada');
  if (a.quemPegou !== b.quemPegou) diffs.push('Quem pegou atualizado');
  if (a.donoNomeTels !== b.donoNomeTels) diffs.push('Dados do dono atualizados');
  if (a.fotoEntrada !== b.fotoEntrada) diffs.push('Foto de entrada alterada');
  if (a.fotoEtiqueta !== b.fotoEtiqueta) diffs.push('Foto da etiqueta alterada');
  if (a.fotoEntrega !== b.fotoEntrega) diffs.push('Foto de entrega alterada');
  if (a.rastreio.length !== b.rastreio.length) diffs.push('Histórico de rastreio atualizado');
  return diffs;
}

export function previewMerge(localDb: AppDatabase, bundle: SyncBundle): MergePreview {
  const { eventIdMap, novosEventos, mescladosCount } = buildEventMapping(localDb.eventos, bundle.eventos);

  const localById = new Map(localDb.itens.map((i) => [i.id, i]));
  const allEventsById = new Map<string, Evento>();
  localDb.eventos.forEach((e) => allEventsById.set(e.id, e));
  novosEventos.forEach((e) => allEventsById.set(e.id, e));

  const novosItens: Item[] = [];
  const conflitosId: ConflitoIdPreview[] = [];
  const colisoesEtiqueta: ColisaoEtiquetaPreview[] = [];
  let itensIdenticos = 0;

  for (const inc of bundle.itens) {
    const mappedEventoId = eventIdMap.get(inc.eventoId) ?? inc.eventoId;
    const normalizedInc: Item = { ...inc, eventoId: mappedEventoId };
    const existingById = localById.get(inc.id);

    if (existingById) {
      const diffs = diffItemFields(existingById, normalizedInc);
      if (diffs.length === 0) {
        itensIdenticos++;
      } else {
        conflitosId.push({ existingItem: existingById, incomingItem: normalizedInc, diferencas: diffs });
      }
      continue;
    }

    // Novo ID: verifica se já existe item local no mesmo evento com o mesmo número/código de etiqueta
    const collidingLocal = localDb.itens.find(
      (loc) =>
        loc.eventoId === mappedEventoId &&
        (loc.etiqueta === normalizedInc.etiqueta || loc.etiquetaCodigo === normalizedInc.etiquetaCodigo),
    );
    if (collidingLocal) {
      colisoesEtiqueta.push({
        existingItem: collidingLocal,
        incomingItem: normalizedInc,
        eventoCodigo: allEventsById.get(mappedEventoId)?.codigo ?? mappedEventoId,
      });
    } else {
      novosItens.push(normalizedInc);
    }
  }

  const localProcuradoIds = new Set(localDb.procurados.map((p) => p.id));
  const novosProcurados = bundle.procurados
    .filter((p) => !localProcuradoIds.has(p.id))
    .map((p) => ({ ...p, eventoId: eventIdMap.get(p.eventoId) ?? p.eventoId }));

  const localRelatorioEvtIds = new Set(localDb.relatorios.map((r) => r.eventoId));
  const novosRelatorios = bundle.relatorios
    .map((r) => ({ ...r, eventoId: eventIdMap.get(r.eventoId) ?? r.eventoId }))
    .filter((r) => !localRelatorioEvtIds.has(r.eventoId));

  return {
    sourceDeviceName: bundle.sourceDeviceName,
    exportedAt: bundle.exportedAt,
    novosEventos,
    eventosExistentesMesclados: mescladosCount,
    novosItens,
    itensIdenticos,
    conflitosId,
    colisoesEtiqueta,
    novosProcurados,
    novosRelatorios,
  };
}

function mergeTrackingTimelines(a: RastreioEvento[], b: RastreioEvento[]): RastreioEvento[] {
  const byId = new Map<string, RastreioEvento>();
  [...a, ...b].forEach((ev) => byId.set(ev.id, ev));
  return Array.from(byId.values()).sort((x, y) => x.timestamp.localeCompare(y.timestamp));
}

function makeShortDeviceTag(deviceName: string): string {
  const cleaned = deviceName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return (cleaned.slice(0, 3) || 'EXT') + '-';
}

export function executeMerge(
  localDb: AppDatabase,
  bundle: SyncBundle,
  options: {
    estrategiaColisaoEtiqueta: EstrategiaColisaoEtiqueta;
    estrategiaConflitoId: EstrategiaConflitoId;
  },
): { db: AppDatabase; log: SyncLogEntry } {
  const { eventIdMap, novosEventos } = buildEventMapping(localDb.eventos, bundle.eventos);

  const mergedEventos: Evento[] = [...localDb.eventos, ...novosEventos];
  const mergedItens: Item[] = [...localDb.itens];
  const itemIndexById = new Map(mergedItens.map((item, idx) => [item.id, idx]));

  let itensAdicionados = 0;
  let itensAtualizados = 0;
  let colisoesResolvidas = 0;

  const devicePrefix = makeShortDeviceTag(bundle.sourceDeviceName);
  const now = new Date().toISOString();

  const getNextFreeTag = (eventoId: string): number => {
    const maxMerged = mergedItens
      .filter((i) => i.eventoId === eventoId)
      .reduce((acc, i) => Math.max(acc, i.etiqueta), 0);
    const maxIncoming = bundle.itens
      .filter((i) => (eventIdMap.get(i.eventoId) ?? i.eventoId) === eventoId)
      .reduce((acc, i) => Math.max(acc, i.etiqueta), 0);
    return Math.max(maxMerged, maxIncoming) + 1;
  };

  for (const rawInc of bundle.itens) {
    const mappedEventoId = eventIdMap.get(rawInc.eventoId) ?? rawInc.eventoId;
    const inc: Item = { ...rawInc, eventoId: mappedEventoId };
    const existingIdx = itemIndexById.get(inc.id);

    if (existingIdx !== undefined) {
      const existing = mergedItens[existingIdx];
      const diffs = diffItemFields(existing, inc);
      if (diffs.length === 0) continue;

      if (options.estrategiaConflitoId === 'manter_local') continue;

      const pickIncoming =
        options.estrategiaConflitoId === 'sobrescrever_importado' ||
        new Date(inc.updatedAt).getTime() >= new Date(existing.updatedAt).getTime();

      const winner = pickIncoming ? inc : existing;
      const loser = pickIncoming ? existing : inc;

      const transferEv = createTrackingEvent({
        etapa: 'TRANSFERIDO_DISPOSITIVO',
        titulo: `Mesclado com ${bundle.sourceDeviceName}`,
        detalhes: `Sincronização consolidada (${diffs.join('; ')}).`,
        operador: localDb.config.operadorPadrao,
        dispositivo: localDb.config.deviceName,
        timestamp: now,
      });

      mergedItens[existingIdx] = {
        ...winner,
        // Preserva fotos caso apenas um dos lados tenha foto
        fotoEntrada: winner.fotoEntrada || loser.fotoEntrada,
        fotoEtiqueta: winner.fotoEtiqueta || loser.fotoEtiqueta,
        fotoEntrega: winner.fotoEntrega || loser.fotoEntrega,
        rastreio: [...mergeTrackingTimelines(existing.rastreio, inc.rastreio), transferEv],
        syncedFromDevices: Array.from(
          new Set([...(existing.syncedFromDevices ?? []), bundle.sourceDeviceName]),
        ),
        updatedAt: now,
      };
      itensAtualizados++;
      continue;
    }

    // Novo item vindo de outro equipamento
    const hasCollision = mergedItens.some(
      (m) => m.eventoId === mappedEventoId && (m.etiqueta === inc.etiqueta || m.etiquetaCodigo === inc.etiquetaCodigo),
    );

    let finalItem: Item = { ...inc };
    if (hasCollision) {
      colisoesResolvidas++;
      const originalTag = inc.etiquetaCodigo || formatEtiquetaCodigo(inc.etiqueta);
      if (options.estrategiaColisaoEtiqueta === 'renumerar') {
        const nextNum = getNextFreeTag(mappedEventoId);
        finalItem = {
          ...inc,
          etiquetaOrigem: inc.etiquetaOrigem ?? `${bundle.sourceDeviceName} #${originalTag}`,
          etiqueta: nextNum,
          etiquetaCodigo: formatEtiquetaCodigo(nextNum),
        };
      } else if (options.estrategiaColisaoEtiqueta === 'prefixo_dispositivo') {
        finalItem = {
          ...inc,
          etiquetaOrigem: inc.etiquetaOrigem ?? `${bundle.sourceDeviceName} #${originalTag}`,
          etiquetaCodigo: `${devicePrefix}${originalTag}`,
        };
      }
    }

    const syncEv = createTrackingEvent({
      etapa: 'TRANSFERIDO_DISPOSITIVO',
      titulo: `Importado de ${bundle.sourceDeviceName}`,
      detalhes: finalItem.etiquetaOrigem
        ? `Mesclado neste equipamento. Etiqueta original (${finalItem.etiquetaOrigem}) ajustada para #${finalItem.etiquetaCodigo}.`
        : `Item importado e consolidado a partir de ${bundle.sourceDeviceName}.`,
      operador: localDb.config.operadorPadrao,
      dispositivo: localDb.config.deviceName,
      timestamp: now,
    });

    finalItem.rastreio = [...(finalItem.rastreio ?? []), syncEv];
    finalItem.syncedFromDevices = Array.from(
      new Set([...(finalItem.syncedFromDevices ?? []), bundle.sourceDeviceName]),
    );

    itemIndexById.set(finalItem.id, mergedItens.length);
    mergedItens.push(finalItem);
    itensAdicionados++;
  }

  // Atualiza proximaEtiqueta de cada evento com base nos itens consolidados
  const finalEventos = mergedEventos.map((ev) => {
    const maxEtq = mergedItens
      .filter((i) => i.eventoId === ev.id)
      .reduce((acc, i) => Math.max(acc, i.etiqueta), 0);
    return {
      ...ev,
      proximaEtiqueta: Math.max(ev.proximaEtiqueta, maxEtq + 1),
    };
  });

  // Mescla procurados
  const existingProcuradoIds = new Set(localDb.procurados.map((p) => p.id));
  const novosProcurados = bundle.procurados
    .filter((p) => !existingProcuradoIds.has(p.id))
    .map((p) => ({ ...p, eventoId: eventIdMap.get(p.eventoId) ?? p.eventoId }));

  // Mescla relatórios (adiciona se não houver relatório para o evento)
  const existingRelEvtIds = new Set(localDb.relatorios.map((r) => r.eventoId));
  const novosRelatorios = bundle.relatorios
    .map((r) => ({ ...r, eventoId: eventIdMap.get(r.eventoId) ?? r.eventoId }))
    .filter((r) => !existingRelEvtIds.has(r.eventoId));

  const tiposPersonalizados = Array.from(
    new Set([...localDb.tiposPersonalizados, ...(bundle.tiposPersonalizados ?? [])]),
  ).sort();

  const log: SyncLogEntry = {
    id: generateId('sync'),
    timestamp: now,
    tipo: 'IMPORT_MERGE_JSON',
    origemDispositivo: bundle.sourceDeviceName,
    eventosAdicionados: novosEventos.length,
    itensAdicionados,
    itensAtualizados,
    colisoesResolvidas,
    procuradosAdicionados: novosProcurados.length,
    detalhes: `Mesclagem de "${bundle.sourceDeviceName}" (estratégia colisão: ${options.estrategiaColisaoEtiqueta}, conflito ID: ${options.estrategiaConflitoId}).`,
  };

  const activeEventoId =
    localDb.activeEventoId ?? (finalEventos.length > 0 ? finalEventos[0].id : null);

  return {
    db: {
      ...localDb,
      activeEventoId,
      eventos: finalEventos,
      itens: mergedItens,
      procurados: [...localDb.procurados, ...novosProcurados],
      relatorios: [...localDb.relatorios, ...novosRelatorios],
      tiposPersonalizados,
      syncHistory: [log, ...localDb.syncHistory].slice(0, 50),
    },
    log,
  };
}

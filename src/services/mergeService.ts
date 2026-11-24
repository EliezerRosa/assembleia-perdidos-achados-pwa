import type {
  AppDatabase,
  ColisaoEtiquetaPreview,
  ConflitoIdPreview,
  ConversaMensagem,
  DocumentoReferencia,
  EstrategiaColisaoEtiqueta,
  EstrategiaConflitoId,
  Evento,
  GuiaAudioVideo,
  Item,
  LembreteAgenda,
  MergePreview,
  ParticipacaoPrograma,
  ProgramaParte,
  RastreioEvento,
  SentinelaComentario,
  SentinelaEstudo,
  SyncBundle,
  SyncLogEntry,
  Voluntario,
} from '../types/domain';
import { createTrackingEvent, formatEtiquetaCodigo, generateId } from './trackingService';

export function buildSyncBundle(db: AppDatabase, scope: 'all' | 'single_event', eventoId?: string): SyncBundle {
  const targetEventoId = scope === 'single_event' ? eventoId ?? db.activeEventoId : null;
  const eventos = targetEventoId ? db.eventos.filter((e) => e.id === targetEventoId) : db.eventos;
  const eventoIds = new Set(eventos.map((e) => e.id));
  const filterByEvent = <T extends { eventoId: string }>(arr: T[]): T[] =>
    targetEventoId ? arr.filter((x) => eventoIds.has(x.eventoId)) : arr;

  return {
    format: 'ASSEMBLEIA_PA_SYNC_V1',
    exportedAt: new Date().toISOString(),
    sourceDeviceId: db.config.deviceId,
    sourceDeviceName: db.config.deviceName,
    scope,
    eventos,
    itens: filterByEvent(db.itens),
    procurados: filterByEvent(db.procurados),
    relatorios: filterByEvent(db.relatorios),
    tiposPersonalizados: db.tiposPersonalizados,
    voluntarios: filterByEvent(db.voluntarios),
    conversas: filterByEvent(db.conversas),
    programaPartes: filterByEvent(db.programaPartes),
    participacoes: filterByEvent(db.participacoes),
    guiaAV: filterByEvent(db.guiaAV),
    lembretes: filterByEvent(db.lembretes),
    referencias: filterByEvent(db.referencias),
    sentinelaEstudos: filterByEvent(db.sentinelaEstudos),
    sentinelaComentarios: filterByEvent(db.sentinelaComentarios),
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
 * para permitir juntar registros criados em celulares/PCs diferentes para o MESMO evento!
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

function mergeByIdNewestWins<T extends { id: string; eventoId: string; updatedAt: string }>(
  localList: T[],
  incomingList: T[] | undefined,
  eventIdMap: Map<string, string>,
  estrategia: EstrategiaConflitoId,
): { merged: T[]; added: number; updated: number } {
  if (!Array.isArray(incomingList) || incomingList.length === 0) {
    return { merged: localList, added: 0, updated: 0 };
  }
  const merged = [...localList];
  const idxMap = new Map(merged.map((x, idx) => [x.id, idx]));
  let added = 0;
  let updated = 0;

  for (const rawInc of incomingList) {
    const inc: T = { ...rawInc, eventoId: eventIdMap.get(rawInc.eventoId) ?? rawInc.eventoId };
    const idx = idxMap.get(inc.id);
    if (idx === undefined) {
      idxMap.set(inc.id, merged.length);
      merged.push(inc);
      added++;
    } else if (estrategia !== 'manter_local') {
      const existing = merged[idx];
      const pickIncoming =
        estrategia === 'sobrescrever_importado' ||
        new Date(inc.updatedAt).getTime() > new Date(existing.updatedAt).getTime();
      if (pickIncoming) {
        merged[idx] = inc;
        updated++;
      }
    }
  }
  return { merged, added, updated };
}

function mergeAppendOnlyById<T extends { id: string; eventoId: string }>(
  localList: T[],
  incomingList: T[] | undefined,
  eventIdMap: Map<string, string>,
): { merged: T[]; added: number } {
  if (!Array.isArray(incomingList) || incomingList.length === 0) {
    return { merged: localList, added: 0 };
  }
  const existingIds = new Set(localList.map((x) => x.id));
  const additions = incomingList
    .filter((x) => !existingIds.has(x.id))
    .map((x) => ({ ...x, eventoId: eventIdMap.get(x.eventoId) ?? x.eventoId }));
  return { merged: [...localList, ...additions], added: additions.length };
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

  // Preview dos novos módulos (Presidência + Sentinela + Equipe)
  const volPrev = mergeByIdNewestWins(localDb.voluntarios, bundle.voluntarios, eventIdMap, 'mais_recente');
  const prgPrev = mergeByIdNewestWins(localDb.programaPartes, bundle.programaPartes, eventIdMap, 'mais_recente');
  const prtPrev = mergeByIdNewestWins(localDb.participacoes, bundle.participacoes, eventIdMap, 'mais_recente');
  const avPrev = mergeByIdNewestWins(localDb.guiaAV, bundle.guiaAV, eventIdMap, 'mais_recente');
  const lemPrev = mergeByIdNewestWins(localDb.lembretes, bundle.lembretes, eventIdMap, 'mais_recente');
  const estPrev = mergeByIdNewestWins(localDb.sentinelaEstudos, bundle.sentinelaEstudos, eventIdMap, 'mais_recente');
  const comPrev = mergeByIdNewestWins(localDb.sentinelaComentarios, bundle.sentinelaComentarios, eventIdMap, 'mais_recente');
  const msgPrev = mergeAppendOnlyById(localDb.conversas, bundle.conversas, eventIdMap);

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
    novosVoluntarios: volPrev.added,
    novasPartesPrograma: prgPrev.added,
    partesAtualizadas: prgPrev.updated,
    novasParticipacoes: prtPrev.added,
    novosGuiasAV: avPrev.added,
    novosLembretes: lemPrev.added,
    novosEstudosSentinela: estPrev.added,
    novosComentariosSentinela: comPrev.added,
    comentariosAtualizados: comPrev.updated,
    novasConversas: msgPrev.added,
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

  const finalEventos = mergedEventos.map((ev) => {
    const maxEtq = mergedItens
      .filter((i) => i.eventoId === ev.id)
      .reduce((acc, i) => Math.max(acc, i.etiqueta), 0);
    return {
      ...ev,
      proximaEtiqueta: Math.max(ev.proximaEtiqueta, maxEtq + 1),
    };
  });

  const existingProcuradoIds = new Set(localDb.procurados.map((p) => p.id));
  const novosProcurados = bundle.procurados
    .filter((p) => !existingProcuradoIds.has(p.id))
    .map((p) => ({ ...p, eventoId: eventIdMap.get(p.eventoId) ?? p.eventoId }));

  const existingRelEvtIds = new Set(localDb.relatorios.map((r) => r.eventoId));
  const novosRelatorios = bundle.relatorios
    .map((r) => ({ ...r, eventoId: eventIdMap.get(r.eventoId) ?? r.eventoId }))
    .filter((r) => !existingRelEvtIds.has(r.eventoId));

  const tiposPersonalizados = Array.from(
    new Set([...localDb.tiposPersonalizados, ...(bundle.tiposPersonalizados ?? [])]),
  ).sort();

  // Mesclagem dos Apps Embutidos (Presidência + Sentinela + Equipe)
  const volM = mergeByIdNewestWins<Voluntario>(localDb.voluntarios, bundle.voluntarios, eventIdMap, options.estrategiaConflitoId);
  const prgM = mergeByIdNewestWins<ProgramaParte>(localDb.programaPartes, bundle.programaPartes, eventIdMap, options.estrategiaConflitoId);
  const prtM = mergeByIdNewestWins<ParticipacaoPrograma>(localDb.participacoes, bundle.participacoes, eventIdMap, options.estrategiaConflitoId);
  const avM = mergeByIdNewestWins<GuiaAudioVideo>(localDb.guiaAV, bundle.guiaAV, eventIdMap, options.estrategiaConflitoId);
  const lemM = mergeByIdNewestWins<LembreteAgenda>(localDb.lembretes, bundle.lembretes, eventIdMap, options.estrategiaConflitoId);
  const refM = mergeByIdNewestWins<DocumentoReferencia>(localDb.referencias, bundle.referencias, eventIdMap, options.estrategiaConflitoId);
  const estM = mergeByIdNewestWins<SentinelaEstudo>(localDb.sentinelaEstudos, bundle.sentinelaEstudos, eventIdMap, options.estrategiaConflitoId);
  const comM = mergeByIdNewestWins<SentinelaComentario>(localDb.sentinelaComentarios, bundle.sentinelaComentarios, eventIdMap, options.estrategiaConflitoId);
  const msgM = mergeAppendOnlyById<ConversaMensagem>(localDb.conversas, bundle.conversas, eventIdMap);

  const extraResumoParts: string[] = [];
  if (prgM.added + prgM.updated > 0) extraResumoParts.push(`Programa: +${prgM.added}/${prgM.updated} atu.`);
  if (comM.added + comM.updated > 0) extraResumoParts.push(`Sentinela: +${comM.added}/${comM.updated} atu.`);
  if (volM.added > 0) extraResumoParts.push(`Equipe: +${volM.added}`);
  const extraSuffix = extraResumoParts.length > 0 ? ` • ${extraResumoParts.join(' | ')}` : '';

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
    detalhes: `Mesclagem de "${bundle.sourceDeviceName}" (colisão: ${options.estrategiaColisaoEtiqueta}, conflito: ${options.estrategiaConflitoId})${extraSuffix}.`,
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
      voluntarios: volM.merged,
      programaPartes: prgM.merged,
      participacoes: prtM.merged,
      guiaAV: avM.merged,
      lembretes: lemM.merged,
      referencias: refM.merged,
      sentinelaEstudos: estM.merged,
      sentinelaComentarios: comM.merged,
      conversas: msgM.merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      syncHistory: [log, ...localDb.syncHistory].slice(0, 50),
    },
    log,
  };
}

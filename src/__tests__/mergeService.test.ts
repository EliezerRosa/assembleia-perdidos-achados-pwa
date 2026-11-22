import { describe, expect, it } from 'vitest';
import { buildSyncBundle, executeMerge, parseSyncBundle, previewMerge } from '../services/mergeService';
import { createEmptyDatabase } from '../services/storageService';
import { createTrackingEvent } from '../services/trackingService';
import type { AppDatabase, Evento, Item } from '../types/domain';

function makeEvent(id: string, codigo: string, data: string): Evento {
  return {
    id,
    tipo: 'Assembleia',
    codigo,
    circuito: 'ES-005',
    parte: 'B',
    data,
    local: 'Guarapari/ES',
    superintendente: '',
    ajudantes: '',
    voluntariosNecessarios: 5,
    voluntariosUsados: 5,
    proximaEtiqueta: 2,
    status: 'ativo',
    createdAt: '2026-11-22T10:00:00.000Z',
    updatedAt: '2026-11-22T10:00:00.000Z',
    deviceId: 'dev_a',
  };
}

function makeItem(id: string, eventoId: string, etiqueta: number, tipoItem: string, deviceName: string): Item {
  return {
    id,
    eventoId,
    etiqueta,
    etiquetaCodigo: String(etiqueta).padStart(2, '0'),
    formPagina: 1,
    tipoItem,
    descricao: `Desc ${tipoItem}`,
    valor: 'Médio',
    categoria: 'Perdido',
    fotoEntrada: `data:image/jpeg;base64,${id}`,
    etiquetaConfirmadaNoItem: true,
    etiquetaConfirmadaNoFormulario: true,
    fotoEtiqueta: '',
    fotoEntrega: '',
    status: 'Ainda Guardado',
    destino: '',
    dataHoraGuardado: '2026-11-22T10:05:00.000Z',
    quemTrouxe: 'Voluntário',
    localAchado: 'Auditório',
    recebidoPor: 'Op',
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
        titulo: 'Recebido',
        detalhes: 'Entrada',
        operador: 'Op',
        dispositivo: deviceName,
        timestamp: '2026-11-22T10:05:00.000Z',
      }),
    ],
    deviceId: deviceName,
    deviceName,
    createdAt: '2026-11-22T10:05:00.000Z',
    updatedAt: '2026-11-22T10:05:00.000Z',
  };
}

describe('mergeService — Sincronização e Mesclagem Multi-Dispositivo', () => {
  it('detecta colisão de etiqueta para o mesmo evento (mesmo código+data) e renumera preservando etiquetaOrigem', () => {
    const dbA: AppDatabase = createEmptyDatabase();
    dbA.config.deviceName = 'PC Coordenação';
    dbA.eventos = [makeEvent('evt_local', 'ES-005.27.1', '2027-02-15')];
    dbA.activeEventoId = 'evt_local';
    dbA.itens = [makeItem('itm_a1', 'evt_local', 1, 'Celular', 'PC Coordenação')];

    const dbB: AppDatabase = createEmptyDatabase();
    dbB.config.deviceName = 'Celular Balcão B';
    // Mesmo código + data, mas ID de evento criado separadamente no Celular B!
    dbB.eventos = [makeEvent('evt_remoto', 'ES-005.27.1', '2027-02-15')];
    dbB.itens = [
      makeItem('itm_b1', 'evt_remoto', 1, 'Óculos', 'Celular Balcão B'),
      makeItem('itm_b2', 'evt_remoto', 2, 'Bíblia', 'Celular Balcão B'),
    ];

    const bundle = buildSyncBundle(dbB, 'all');
    const parsed = parseSyncBundle(JSON.stringify(bundle));
    expect(parsed.bundle).toBeDefined();

    const preview = previewMerge(dbA, parsed.bundle!);
    expect(preview.novosEventos).toHaveLength(0); // Evento unificado por código+data!
    expect(preview.eventosExistentesMesclados).toBe(1);
    expect(preview.colisoesEtiqueta).toHaveLength(1); // Etiqueta #01 colidiu
    expect(preview.novosItens).toHaveLength(1); // Etiqueta #02 livre

    const merged = executeMerge(dbA, parsed.bundle!, {
      estrategiaColisaoEtiqueta: 'renumerar',
      estrategiaConflitoId: 'mais_recente',
    });

    expect(merged.db.eventos).toHaveLength(1);
    expect(merged.db.itens).toHaveLength(3);
    expect(merged.log.colisoesResolvidas).toBe(1);

    const importedOculos = merged.db.itens.find((i) => i.id === 'itm_b1')!;
    const importedBiblia = merged.db.itens.find((i) => i.id === 'itm_b2')!;
    expect(importedOculos.eventoId).toBe('evt_local');
    expect(importedOculos.etiqueta).toBe(3); // Pula para #03 para não invadir a etiqueta física #02 da Bíblia!
    expect(importedOculos.etiquetaOrigem).toContain('#01');
    expect(importedBiblia.etiqueta).toBe(2); // Etiqueta física #02 preservada intacta!
    expect(importedOculos.rastreio.some((r) => r.etapa === 'TRANSFERIDO_DISPOSITIVO')).toBe(true);
  });

  it('une histórico de rastreio e preserva fotos quando o mesmo ID foi atualizado em outro equipamento', () => {
    const dbA: AppDatabase = createEmptyDatabase();
    dbA.eventos = [makeEvent('evt_1', 'ES-005.27.1', '2027-02-15')];
    const itemA = makeItem('itm_shared', 'evt_1', 1, 'Chave', 'Celular A');
    itemA.fotoEtiqueta = 'data:image/jpeg;base64,FOTO_ETIQUETA_A';
    dbA.itens = [itemA];

    const dbB: AppDatabase = createEmptyDatabase();
    dbB.config.deviceName = 'PC Balcão';
    dbB.eventos = [makeEvent('evt_1', 'ES-005.27.1', '2027-02-15')];
    const itemB: Item = {
      ...itemA,
      fotoEtiqueta: '',
      status: 'Já Entregue',
      quemPegou: 'Dono Confirmado',
      fotoEntrega: 'data:image/jpeg;base64,FOTO_ENTREGA_B',
      updatedAt: '2026-11-22T14:00:00.000Z',
      rastreio: [
        ...itemA.rastreio,
        createTrackingEvent({
          etapa: 'ENTREGUE',
          titulo: 'Entregue',
          detalhes: 'Retirado no PC Balcão',
          operador: 'Op2',
          dispositivo: 'PC Balcão',
          timestamp: '2026-11-22T14:00:00.000Z',
        }),
      ],
    };
    dbB.itens = [itemB];

    const bundle = buildSyncBundle(dbB, 'all');
    const merged = executeMerge(dbA, bundle, {
      estrategiaColisaoEtiqueta: 'renumerar',
      estrategiaConflitoId: 'mais_recente',
    });

    const consolidated = merged.db.itens[0];
    expect(consolidated.status).toBe('Já Entregue');
    expect(consolidated.fotoEtiqueta).toBe('data:image/jpeg;base64,FOTO_ETIQUETA_A'); // Preservada do lado A!
    expect(consolidated.fotoEntrega).toBe('data:image/jpeg;base64,FOTO_ENTREGA_B'); // Preservada do lado B!
    expect(consolidated.rastreio.length).toBeGreaterThanOrEqual(3); // Recebido + Entregue + Mesclado
  });
});

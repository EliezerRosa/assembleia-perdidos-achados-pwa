import { describe, expect, it } from 'vitest';
import {
  buildLegacyDesc,
  createTrackingEvent,
  getDiasGuardado,
  isCashItem,
  isItemRetido,
  isLostPerson,
  isRestrictedDisplay,
  requiresOwnerIdentification,
  transitionItemReopen,
  transitionItemToConference,
  transitionItemToDelivered,
  transitionItemToDispatchedSA,
} from '../services/trackingService';
import type { Item } from '../types/domain';

function makeBaseItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'itm_test_1',
    eventoId: 'evt_1',
    etiqueta: 1,
    etiquetaCodigo: '01',
    formPagina: 1,
    tipoItem: 'Garrafa Térmica',
    descricao: 'Preta 500ml',
    valor: 'Médio',
    categoria: 'Perdido',
    fotoEntrada: '',
    etiquetaConfirmadaNoItem: true,
    etiquetaConfirmadaNoFormulario: true,
    fotoEtiqueta: '',
    fotoEntrega: '',
    status: 'Ainda Guardado',
    destino: '',
    dataHoraGuardado: '2026-01-01T10:00:00.000Z',
    quemTrouxe: 'Voluntário A',
    localAchado: 'Auditório',
    recebidoPor: 'Op1',
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
        detalhes: 'Entrada inicial',
        operador: 'Op1',
        dispositivo: 'Celular 1',
        timestamp: '2026-01-01T10:00:00.000Z',
      }),
    ],
    deviceId: 'dev_1',
    deviceName: 'Celular 1',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('trackingService — Ciclo de vida e Políticas §54-58', () => {
  it('aplica corretamente Política #55 (itens restritos não expostos)', () => {
    expect(isRestrictedDisplay({ valor: 'Alto', tipoItem: 'Garrafa', categoria: 'Perdido' })).toBe(true);
    expect(isRestrictedDisplay({ valor: 'Precioso', tipoItem: 'Bíblia', categoria: 'Perdido' })).toBe(true);
    expect(isRestrictedDisplay({ valor: 'Baixo', tipoItem: 'Carteira', categoria: 'Perdido' })).toBe(true);
    expect(isRestrictedDisplay({ valor: 'Baixo', tipoItem: 'Garrafa', categoria: 'Perdido' })).toBe(false);
  });

  it('identifica Política #56 (pessoas perdidas) e Política #58 (Guarda-Volumes exceto roupas)', () => {
    expect(isLostPerson('Criança')).toBe(true);
    expect(isLostPerson('Idoso')).toBe(true);
    expect(isLostPerson('Perdido')).toBe(false);

    expect(requiresOwnerIdentification({ categoria: 'Guardado', tipoItem: 'Carrinho de Bebê' })).toBe(true);
    expect(requiresOwnerIdentification({ categoria: 'Guardado', tipoItem: 'Paletó' })).toBe(false);
    expect(requiresOwnerIdentification({ categoria: 'Perdido', tipoItem: 'Mochila' })).toBe(false);
  });

  it('detecta dinheiro (§57) e calcula retenção de 60 dias', () => {
    expect(isCashItem({ tipoItem: 'Dinheiro', descricao: 'R$ 25,00' })).toBe(true);
    expect(isCashItem({ tipoItem: 'Copo', descricao: 'Plástico' })).toBe(false);

    const item = makeBaseItem({ dataHoraGuardado: '2026-01-01T10:00:00.000Z' });
    const refAfter70Days = new Date('2026-03-15T10:00:00.000Z');
    const refAfter10Days = new Date('2026-01-11T10:00:00.000Z');
    expect(getDiasGuardado(item.dataHoraGuardado, refAfter70Days)).toBeGreaterThanOrEqual(60);
    expect(isItemRetido(item, 60, refAfter70Days)).toBe(true);
    expect(isItemRetido(item, 60, refAfter10Days)).toBe(false);
  });

  it('percorre o ciclo completo: Ainda Guardado -> Em Conferência -> Já Entregue -> Reaberto -> Despachado SA', () => {
    const base = makeBaseItem();

    const conf = transitionItemToConference(base, 'Op1', 'PC', 'Solicitante descreveu marca');
    expect(conf.valid).toBe(true);
    expect(conf.item.status).toBe('Em Conferência');
    expect(conf.item.rastreio).toHaveLength(2);

    const invalidDeliv = transitionItemToDelivered(
      conf.item,
      { quemPegou: '', donoNomeTels: '', congregacao: '', endereco: '' },
      'Op1',
      'PC',
    );
    expect(invalidDeliv.valid).toBe(false);

    const deliv = transitionItemToDelivered(
      conf.item,
      {
        quemPegou: 'Solicitante Demo',
        donoNomeTels: 'Solicitante Demo',
        congregacao: 'Central',
        endereco: 'Rua A, 10',
      },
      'Op1',
      'PC',
    );
    expect(deliv.valid).toBe(true);
    expect(deliv.item.status).toBe('Já Entregue');
    expect(deliv.item.rastreio).toHaveLength(3);
    expect(buildLegacyDesc(deliv.item)).toContain('Etiqueta = 1');

    const reopened = transitionItemReopen(deliv.item, 'Erro de etiqueta', 'Op2', 'PC');
    expect(reopened.item.status).toBe('Ainda Guardado');
    expect(reopened.item.rastreio).toHaveLength(4);

    const dispatched = transitionItemToDispatchedSA(reopened.item, 'DOAR', 'SA', 'Tablet');
    expect(dispatched.item.status).toBe('DESPACHADO');
    expect(dispatched.item.destino).toBe('DOAR');
    expect(dispatched.item.quemPegou).toBe('Superintendente de Assembleia');
    expect(dispatched.item.rastreio).toHaveLength(5);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildSpeakerWhatsappUrl,
  computePresidenciaKpis,
  computeProgramEndTime,
  computeStopwatchStatus,
  countSpeakerCheckIns,
  deriveTurno,
  extractSpeakerCloneFields,
  getNeighborPartes,
  requiresStageRehearsal,
  sortProgramaPartes,
} from '../services/presidenciaService';
import type { ProgramaParte } from '../types/domain';

function makeParte(overrides: Partial<ProgramaParte> = {}): ProgramaParte {
  return {
    id: overrides.id ?? 'prg_1',
    eventoId: 'evt_1',
    dia: 'Sexta-feira',
    dataHoraInicioProgramada: '2026-11-23T09:40',
    tempoProgramadoMin: 20,
    tipo: 'Discurso',
    formato: 'Ao Vivo',
    tema: 'Tema Exemplo',
    ehSerie: false,
    linkEsboco: '',
    oradorNome: 'Carlos Demo',
    oradorCongregacao: 'Central',
    oradorCircuito: 'ES-005',
    oradorTelefone: '(27) 90000-1001',
    oradorEmailSecular: 'carlos@exemplo.local',
    oradorEmailJwpub: '',
    oradorConfirmado: true,
    substitutos: [],
    checkInDia1: false,
    checkIn30MinDia: false,
    checkIn30MinPalco: false,
    ensaioPalcoFeito: false,
    ensaioPalcoHorario: '',
    modoCronometro: 'parado',
    inicioRealIso: '',
    fimRealIso: '',
    duracaoRealSegundos: 0,
    ensaioInicioIso: '',
    ensaioDuracaoSegundos: 0,
    observacoes: '',
    mensagensLog: [],
    deviceId: 'dev_1',
    createdAt: '2026-11-23T08:00:00.000Z',
    updatedAt: '2026-11-23T08:00:00.000Z',
    ...overrides,
  };
}

describe('presidenciaService — Presidência do Congresso', () => {
  it('deriva turno Manhã/Tarde, calcula horário final e ordena dias corretamente', () => {
    expect(deriveTurno('2026-11-23T09:20')).toBe('Manhã');
    expect(deriveTurno('2026-11-23T13:50')).toBe('Tarde');
    expect(computeProgramEndTime('2026-11-23T09:40', 25)).toBe('10:05');

    const pDom = makeParte({ id: 'p_dom', dia: 'Domingo', dataHoraInicioProgramada: '2026-11-25T10:30' });
    const pSex2 = makeParte({ id: 'p_sex2', dia: 'Sexta-feira', dataHoraInicioProgramada: '2026-11-23T14:00' });
    const pSex1 = makeParte({ id: 'p_sex1', dia: 'Sexta-feira', dataHoraInicioProgramada: '2026-11-23T09:40' });

    const sorted = sortProgramaPartes([pDom, pSex2, pSex1]);
    expect(sorted.map((p) => p.id)).toEqual(['p_sex1', 'p_sex2', 'p_dom']);

    const nb = getNeighborPartes(sorted, 'p_sex2');
    expect(nb.anterior?.id).toBe('p_sex1');
    expect(nb.posterior?.id).toBe('p_dom');
  });

  it('calcula KPIs de check-in 3 etapas, faltam 1º dia e elegibilidade de ensaio no palco', () => {
    const p1 = makeParte({
      id: 'p1',
      formato: 'Ao Vivo',
      tipo: 'Discurso',
      checkInDia1: true,
      checkIn30MinDia: true,
      ensaioPalcoFeito: true,
    });
    const p2 = makeParte({
      id: 'p2',
      formato: 'Ao Vivo',
      tipo: 'Oração',
      checkInDia1: false,
      ensaioPalcoFeito: false,
    });
    const p3 = makeParte({
      id: 'p3',
      formato: 'Vídeo',
      tipo: 'Drama',
      checkInDia1: true,
      oradorNome: 'Equipe A/V',
    });

    expect(countSpeakerCheckIns(p1)).toBe(2);
    expect(requiresStageRehearsal(p1)).toBe(true);
    expect(requiresStageRehearsal(p2)).toBe(true);
    expect(requiresStageRehearsal(p3)).toBe(false);

    const kpis = computePresidenciaKpis([p1, p2, p3]);
    expect(kpis.jaCompareceram).toBe(2);
    expect(kpis.faltamDia1).toBe(1);
    expect(kpis.ensaiosElegiveis).toBe(2);
    expect(kpis.ensaiosFeitos).toBe(1);
  });

  it('monitora cronômetro dual-mode com alerta de último minuto (-1 min) e estouro (Passou da Hora)', () => {
    const startMs = Date.parse('2026-11-23T10:00:00.000Z');
    const liveParte = makeParte({
      tempoProgramadoMin: 10, // 600s
      modoCronometro: 'ao_vivo',
      inicioRealIso: '2026-11-23T10:00:00.000Z',
    });

    // Aos 5 minutos (300s): normal
    const mid = computeStopwatchStatus(liveParte, startMs + 300 * 1000);
    expect(mid.isFinalMinute).toBe(false);
    expect(mid.isOvertime).toBe(false);
    expect(mid.formattedElapsed).toBe('05:00');
    expect(mid.formattedRemaining).toBe('05:00');

    // Aos 9m20s (560s): último minuto (-1 min)!
    const finalMin = computeStopwatchStatus(liveParte, startMs + 560 * 1000);
    expect(finalMin.isFinalMinute).toBe(true);
    expect(finalMin.isOvertime).toBe(false);

    // Aos 10m30s (630s): estourou!
    const over = computeStopwatchStatus(liveParte, startMs + 630 * 1000);
    expect(over.isFinalMinute).toBe(false);
    expect(over.isOvertime).toBe(true);
    expect(over.formattedRemaining).toBe('-00:30');
  });

  it('gera link WhatsApp com Salmo 134:3 e clona orador de parte de referência', () => {
    const p = makeParte({ oradorNome: 'Daniel Demo', oradorTelefone: '(27) 99999-1234' });
    const url = buildSpeakerWhatsappUrl(p, 'boas_vindas');
    expect(url).toContain('https://wa.me/5527999991234?text=');
    expect(decodeURIComponent(url)).toContain('Salmo 134:3');

    const cloned = extractSpeakerCloneFields(p);
    expect(cloned.oradorNome).toBe('Daniel Demo');
    expect(cloned.oradorTelefone).toBe('(27) 99999-1234');
  });
});

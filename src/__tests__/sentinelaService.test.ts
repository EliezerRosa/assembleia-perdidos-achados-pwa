import { describe, expect, it } from 'vitest';
import {
  buildBackupCoverageMatrix,
  computeSentinelaSchedule,
  createSentinelaBackup,
  reorderSentinelaComentario,
  restoreSentinelaFromBackup,
} from '../services/sentinelaService';
import type { SentinelaComentario } from '../types/domain';

function makeCom(overrides: Partial<SentinelaComentario> = {}): SentinelaComentario {
  return {
    id: overrides.id ?? 'scm_1',
    eventoId: 'evt_1',
    estudoId: 'snt_1',
    ordenacao: overrides.ordenacao ?? 1,
    subtopico: 'Tópico 1',
    paragrafos: '1-2',
    parteAB: '',
    linkParagrafo: '',
    pergunta: 'Pergunta de exemplo?',
    paragrafoResposta: '§1',
    respostaLiteral: 'Resposta literal',
    comentarioSugerido: 'Comentário original',
    comentarioTextoBiblico: 'Salmo 31:24',
    conectivo: 'Vamos ao próximo.',
    tempoSegundos: 30,
    posicaoPalco: 'ESQUERDA',
    comentaristaNome: 'Comentarista 1',
    comentaristaCongregacao: 'Central',
    comentaristaTelefone: '(27) 90000-1111',
    comentaristaFoto: '',
    ehCasal: false,
    substitutoNome: 'Substituto A',
    substitutoTelefone: '(27) 90000-9999',
    substitutoCongregacao: 'Sul',
    presenteDia1: true,
    ensaioPalcoFeito: false,
    jaFeito: false,
    imagemRelacionada: '',
    imagemLegenda: '',
    audioPergunta: '',
    audioComentario: '',
    audioConectivo: '',
    createdAt: '2026-11-23T08:00:00.000Z',
    updatedAt: '2026-11-23T08:00:00.000Z',
    ...overrides,
  };
}

describe('sentinelaService — Resumo de A Sentinela (Cascata, Alternância e Backup)', () => {
  it('calcula encadeamento cronológico em cascata (precisão em segundos) e detecta repetição de lado no palco', () => {
    const c1 = makeCom({ id: 'c1', ordenacao: 1, tempoSegundos: 35, posicaoPalco: 'ESQUERDA', imagemRelacionada: 'img1' });
    const c2 = makeCom({ id: 'c2', ordenacao: 2, tempoSegundos: 30, posicaoPalco: 'ESQUERDA' }); // Lado repetido!
    const c3 = makeCom({ id: 'c3', ordenacao: 3, tempoSegundos: 40, posicaoPalco: 'DIREITA' });

    const schedule = computeSentinelaSchedule({ horaInicio: '10:30', duracaoPrevistaMin: 30 }, [c3, c1, c2]);

    expect(schedule.items.map((i) => i.comentario.id)).toEqual(['c1', 'c2', 'c3']);
    expect(schedule.items[0].horaInicioCalc).toBe('10:30:00');
    expect(schedule.items[0].horaFimCalc).toBe('10:30:35');
    expect(schedule.items[1].horaInicioCalc).toBe('10:30:35');
    expect(schedule.items[1].horaFimCalc).toBe('10:31:05');
    expect(schedule.items[2].horaInicioCalc).toBe('10:31:05');
    expect(schedule.items[2].horaFimCalc).toBe('10:31:45');

    // Detecção de lado consecutivo repetido (ESQUERDA -> ESQUERDA)
    expect(schedule.items[0].alertaLadoRepetido).toBe(false);
    expect(schedule.items[1].alertaLadoRepetido).toBe(true);
    expect(schedule.items[2].alertaLadoRepetido).toBe(false);
    expect(schedule.conflitosAlternancia).toBe(1);
    expect(schedule.comImagemCount).toBe(1);
    expect(schedule.dentroDoTempo).toBe(true);
  });

  it('reordena comentários mantendo numeração contígua 1..N e monta matriz de substituições', () => {
    const c1 = makeCom({ id: 'c1', ordenacao: 1, substitutoNome: 'Fernanda' });
    const c2 = makeCom({ id: 'c2', ordenacao: 2, substitutoNome: 'Fernanda' });
    const c3 = makeCom({ id: 'c3', ordenacao: 3, substitutoNome: 'Lucas' });

    const moved = reorderSentinelaComentario([c1, c2, c3], 'c3', 'up');
    expect(moved.map((c) => `${c.id}:${c.ordenacao}`)).toEqual(['c1:1', 'c3:2', 'c2:3']);

    const matrix = buildBackupCoverageMatrix(moved);
    expect(matrix[0].substitutoNome).toBe('Fernanda');
    expect(matrix[0].comentarios).toHaveLength(2);
    expect(matrix[1].substitutoNome).toBe('Lucas');
  });

  it('salva e restaura snapshot de backup do comentário (Salvar / Recuperar Comentário)', () => {
    const original = makeCom({
      comentarioSugerido: 'Texto aprovado no ensaio',
      conectivo: 'Conectivo original',
      audioComentario: 'data:audio/webm;base64,ORIGINAL',
    });
    const withBackup: SentinelaComentario = {
      ...original,
      backupSnapshot: createSentinelaBackup(original),
      comentarioSugerido: 'Texto alterado por acidente',
      audioComentario: '',
    };

    const restored = restoreSentinelaFromBackup(withBackup);
    expect(restored.comentarioSugerido).toBe('Texto aprovado no ensaio');
    expect(restored.conectivo).toBe('Conectivo original');
    expect(restored.audioComentario).toBe('data:audio/webm;base64,ORIGINAL');
  });
});

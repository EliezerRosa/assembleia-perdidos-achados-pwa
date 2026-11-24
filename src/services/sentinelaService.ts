import type {
  SentinelaBackupSnapshot,
  SentinelaComentario,
  SentinelaEstudo,
} from '../types/domain';
import { normalizePhoneForWhatsapp } from './presidenciaService';

export function sortSentinelaComentarios(comentarios: SentinelaComentario[]): SentinelaComentario[] {
  return [...comentarios].sort((a, b) => a.ordenacao - b.ordenacao || a.createdAt.localeCompare(b.createdAt));
}

/**
 * Move um comentário para cima ou para baixo na ordem de entrada e normaliza a sequência 1..N.
 */
export function reorderSentinelaComentario(
  comentarios: SentinelaComentario[],
  comentarioId: string,
  direction: 'up' | 'down',
): SentinelaComentario[] {
  const sorted = sortSentinelaComentarios(comentarios);
  const idx = sorted.findIndex((c) => c.id === comentarioId);
  if (idx === -1) return sorted;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= sorted.length) return sorted;

  const copy = [...sorted];
  const [moved] = copy.splice(idx, 1);
  copy.splice(targetIdx, 0, moved);

  const now = new Date().toISOString();
  return copy.map((c, index) => ({
    ...c,
    ordenacao: index + 1,
    updatedAt: c.ordenacao !== index + 1 ? now : c.updatedAt,
  }));
}

export function parseClockToSeconds(hhmm: string): number {
  const parts = (hhmm || '10:30').trim().split(':').map((p) => Number.parseInt(p, 10) || 0);
  const hours = parts[0] ?? 10;
  const minutes = parts[1] ?? 30;
  const seconds = parts[2] ?? 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatSecondsToClock(totalSec: number): string {
  const normalized = ((totalSec % 86400) + 86400) % 86400;
  const h = Math.floor(normalized / 3600);
  const m = Math.floor((normalized % 3600) / 60);
  const s = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDurationCompact(totalSec: number): string {
  const abs = Math.abs(Math.round(totalSec));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m} min` : `${m}m ${String(s).padStart(2, '0')}s`;
}

export interface SentinelaScheduledItem {
  comentario: SentinelaComentario;
  horaInicioCalc: string; // HH:MM:SS
  horaFimCalc: string; // HH:MM:SS
  acumuladoSegundos: number;
  alertaLadoRepetido: boolean; // True se o anterior tiver o mesmo lado ESQUERDA ou DIREITA!
  anteriorId: string | null;
  proximoId: string | null;
}

export interface SentinelaScheduleSummary {
  items: SentinelaScheduledItem[];
  totalSegundos: number;
  horaInicioEstudo: string;
  horaFimTotal: string;
  duracaoPrevistaSegundos: number;
  dentroDoTempo: boolean;
  diferencaSegundos: number; // positivo = sobra tempo; negativo = estouro
  conflitosAlternancia: number;
  presentesDia1: number;
  ensaiosFeitos: number;
  concluidos: number;
  comImagemCount: number;
}

/**
 * Motor cronológico em cascata fiel ao Glide "Resumo de A Sentinela (Grok)":
 * - Cada comentário usa `tempoSegundos` (padrão 30s).
 * - Hora Início[i] = Hora Fim Calculada[i - 1], iniciando em `estudo.horaInicio`.
 * - Detecta violações de alternância de palco (ESQUERDA ↔ DIREITA consecutivos).
 */
export function computeSentinelaSchedule(
  estudo: Pick<SentinelaEstudo, 'horaInicio' | 'duracaoPrevistaMin'> | null,
  comentarios: SentinelaComentario[],
): SentinelaScheduleSummary {
  const sorted = sortSentinelaComentarios(comentarios);
  const startSec = parseClockToSeconds(estudo?.horaInicio ?? '10:30');
  const previstaSec = Math.max(60, (estudo?.duracaoPrevistaMin ?? 30) * 60);

  let cursor = startSec;
  let acumulado = 0;
  let conflitosAlternancia = 0;

  const items: SentinelaScheduledItem[] = sorted.map((c, idx) => {
    const dur = Math.max(5, c.tempoSegundos || 30);
    const itemStart = cursor;
    const itemEnd = cursor + dur;
    cursor = itemEnd;
    acumulado += dur;

    const prev = idx > 0 ? sorted[idx - 1] : null;
    const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

    // Alerta se dois comentaristas seguidos entrarem pelo MESMO lado do palco (ESQUERDA->ESQUERDA ou DIREITA->DIREITA)
    const alertaLadoRepetido =
      Boolean(prev) &&
      c.posicaoPalco !== 'TRIBUNA' &&
      prev!.posicaoPalco === c.posicaoPalco;
    if (alertaLadoRepetido) conflitosAlternancia++;

    return {
      comentario: c,
      horaInicioCalc: formatSecondsToClock(itemStart),
      horaFimCalc: formatSecondsToClock(itemEnd),
      acumuladoSegundos: acumulado,
      alertaLadoRepetido,
      anteriorId: prev?.id ?? null,
      proximoId: next?.id ?? null,
    };
  });

  const diferencaSegundos = previstaSec - acumulado;

  return {
    items,
    totalSegundos: acumulado,
    horaInicioEstudo: formatSecondsToClock(startSec),
    horaFimTotal: formatSecondsToClock(cursor),
    duracaoPrevistaSegundos: previstaSec,
    dentroDoTempo: diferencaSegundos >= 0,
    diferencaSegundos,
    conflitosAlternancia,
    presentesDia1: sorted.filter((c) => c.presenteDia1).length,
    ensaiosFeitos: sorted.filter((c) => c.ensaioPalcoFeito).length,
    concluidos: sorted.filter((c) => c.jaFeito).length,
    comImagemCount: sorted.filter((c) => Boolean(c.imagemRelacionada.trim())).length,
  };
}

/**
 * Snapshot de segurança ("Salvar Comentário" / "Recuperar Comentário" do Glide).
 */
export function createSentinelaBackup(comentario: SentinelaComentario): SentinelaBackupSnapshot {
  return {
    savedAt: new Date().toISOString(),
    comentarioSugerido: comentario.comentarioSugerido,
    comentarioTextoBiblico: comentario.comentarioTextoBiblico,
    conectivo: comentario.conectivo,
    audioComentario: comentario.audioComentario,
  };
}

export function restoreSentinelaFromBackup(comentario: SentinelaComentario): SentinelaComentario {
  if (!comentario.backupSnapshot) return comentario;
  return {
    ...comentario,
    comentarioSugerido: comentario.backupSnapshot.comentarioSugerido,
    comentarioTextoBiblico: comentario.backupSnapshot.comentarioTextoBiblico,
    conectivo: comentario.backupSnapshot.conectivo,
    audioComentario: comentario.backupSnapshot.audioComentario,
    updatedAt: new Date().toISOString(),
  };
}

export interface SubstituicaoGroup {
  substitutoNome: string;
  substitutoTelefone: string;
  substitutoCongregacao: string;
  comentarios: SentinelaComentario[];
}

/**
 * Matriz de Substituições (mostra todas as perguntas que cada substituto cobre).
 */
export function buildBackupCoverageMatrix(comentarios: SentinelaComentario[]): SubstituicaoGroup[] {
  const sorted = sortSentinelaComentarios(comentarios);
  const map = new Map<string, SubstituicaoGroup>();

  for (const c of sorted) {
    const key = c.substitutoNome.trim();
    if (!key) continue;
    const norm = key.toLowerCase();
    const existing = map.get(norm);
    if (existing) {
      existing.comentarios.push(c);
    } else {
      map.set(norm, {
        substitutoNome: key,
        substitutoTelefone: c.substitutoTelefone,
        substitutoCongregacao: c.substitutoCongregacao,
        comentarios: [c],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.comentarios.length - a.comentarios.length);
}

/**
 * Gera convite WhatsApp para o Ensaio no Palco (Domingo 8:30) ou contato direto com Comentarista/Substituto.
 */
export function buildSentinelaWhatsappUrl(
  comentario: SentinelaComentario,
  estudo: SentinelaEstudo | null,
  destino: 'comentarista' | 'substituto',
  tipoMsg: 'ensaio_domingo' | 'lembrete_geral',
): string {
  const nome = destino === 'comentarista' ? comentario.comentaristaNome : comentario.substitutoNome;
  const tel = destino === 'comentarista' ? comentario.comentaristaTelefone : comentario.substitutoTelefone;
  const phone = normalizePhoneForWhatsapp(tel);
  const papel = destino === 'substituto' ? 'como Substituto(a) na ' : 'na ';

  const msg =
    tipoMsg === 'ensaio_domingo'
      ? `Olá ${nome || 'irmão(ã)'}! Tudo bem? Convite para o *Ensaio no Palco do Resumo de A Sentinela* (${estudo?.dia ?? 'Domingo'} às 08:30). Sua participação ${papel}Ordem #${comentario.ordenacao} (§${comentario.paragrafos || '-'}, lado *${comentario.posicaoPalco}*, tempo ~${comentario.tempoSegundos}s). Pergunta: "${comentario.pergunta}". Contamos com sua presença!`
      : `Olá ${nome || 'irmão(ã)'}! Sobre o *Resumo de A Sentinela* ("${estudo?.tituloArtigo ?? ''}") — Ordem #${comentario.ordenacao} (§${comentario.paragrafos || '-'}, lado ${comentario.posicaoPalco}). Por favor confirme quando chegar no 1º dia do congresso!`;

  const encoded = encodeURIComponent(msg);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

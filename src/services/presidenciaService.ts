import { DIAS_CONGRESSO } from '../constants/catalog';
import type { DiaCongresso, ProgramaParte, TurnoCongresso } from '../types/domain';

/**
 * Deriva o turno (Manhã < 13h, Tarde >= 13h) a partir da data/hora programada ("YYYY-MM-DDTHH:mm").
 */
export function deriveTurno(dataHoraInicioProgramada: string): TurnoCongresso {
  const match = dataHoraInicioProgramada.match(/T(\d{2}):(\d{2})/);
  if (!match) return 'Manhã';
  const hour = Number.parseInt(match[1], 10);
  return hour < 13 ? 'Manhã' : 'Tarde';
}

export function extractTimeHHMM(dataHoraIso: string): string {
  const match = dataHoraIso.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  return dataHoraIso.slice(0, 5) || '09:00';
}

/**
 * Calcula o horário final programado (HH:MM) somando `tempoProgramadoMin` ao início.
 */
export function computeProgramEndTime(dataHoraInicioProgramada: string, tempoProgramadoMin: number): string {
  const hhmm = extractTimeHHMM(dataHoraInicioProgramada);
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr || '9', 10);
  const m = Number.parseInt(mStr || '0', 10);
  const totalMin = h * 60 + m + Math.max(0, tempoProgramadoMin || 0);
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function sortProgramaPartes(partes: ProgramaParte[]): ProgramaParte[] {
  const diaRank = (d: DiaCongresso) => {
    const idx = DIAS_CONGRESSO.indexOf(d);
    return idx === -1 ? 99 : idx;
  };
  return [...partes].sort((a, b) => {
    const dr = diaRank(a.dia) - diaRank(b.dia);
    if (dr !== 0) return dr;
    return a.dataHoraInicioProgramada.localeCompare(b.dataHoraInicioProgramada);
  });
}

export function getNeighborPartes(
  partes: ProgramaParte[],
  parteId: string,
): { anterior: ProgramaParte | null; posterior: ProgramaParte | null } {
  const sorted = sortProgramaPartes(partes);
  const idx = sorted.findIndex((p) => p.id === parteId);
  if (idx === -1) return { anterior: null, posterior: null };
  return {
    anterior: idx > 0 ? sorted[idx - 1] : null,
    posterior: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}

/**
 * Regra fiel do Glide: partes elegíveis a Ensaio no Palco são Formato="Ao Vivo" e Tipo IN ("Discurso", "Oração").
 */
export function requiresStageRehearsal(parte: Pick<ProgramaParte, 'formato' | 'tipo' | 'oradorNome'>): boolean {
  return (
    parte.formato === 'Ao Vivo' &&
    (parte.tipo === 'Discurso' || parte.tipo === 'Oração') &&
    Boolean(parte.oradorNome.trim())
  );
}

export function countSpeakerCheckIns(
  parte: Pick<ProgramaParte, 'checkInDia1' | 'checkIn30MinDia' | 'checkIn30MinPalco'>,
): number {
  return (parte.checkInDia1 ? 1 : 0) + (parte.checkIn30MinDia ? 1 : 0) + (parte.checkIn30MinPalco ? 1 : 0);
}

export interface PresidenciaKpis {
  totalPartes: number;
  partesComOrador: number;
  jaCompareceram: number; // >= 1 etapa de check-in
  faltamDia1: number; // orador designado mas checkInDia1 = false
  ensaiosElegiveis: number;
  ensaiosFeitos: number;
  emAndamento: ProgramaParte | null;
  proximaParte: ProgramaParte | null;
  concluidas: number;
}

export function computePresidenciaKpis(partes: ProgramaParte[]): PresidenciaKpis {
  const sorted = sortProgramaPartes(partes);
  const comOrador = sorted.filter((p) => p.oradorNome.trim().length > 0);
  const jaCompareceram = comOrador.filter((p) => countSpeakerCheckIns(p) >= 1).length;
  const faltamDia1 = comOrador.filter((p) => !p.checkInDia1).length;
  const elegiveisEnsaio = sorted.filter(requiresStageRehearsal);
  const ensaiosFeitos = elegiveisEnsaio.filter((p) => p.ensaioPalcoFeito).length;
  const emAndamento = sorted.find((p) => p.modoCronometro === 'ao_vivo' || p.modoCronometro === 'ensaio_pessoal') ?? null;
  const concluidas = sorted.filter((p) => p.modoCronometro === 'concluido').length;

  let proximaParte: ProgramaParte | null = null;
  if (emAndamento) {
    const idx = sorted.findIndex((p) => p.id === emAndamento.id);
    proximaParte = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  } else {
    proximaParte = sorted.find((p) => p.modoCronometro === 'parado') ?? null;
  }

  return {
    totalPartes: sorted.length,
    partesComOrador: comOrador.length,
    jaCompareceram,
    faltamDia1,
    ensaiosElegiveis: elegiveisEnsaio.length,
    ensaiosFeitos,
    emAndamento,
    proximaParte,
    concluidas,
  };
}

export interface StopwatchSnapshot {
  elapsedSeconds: number;
  programmedSeconds: number;
  remainingSeconds: number; // negativo quando estourado!
  isFinalMinute: boolean; // faltando <= 60s e ainda não estourado
  isOvertime: boolean; // passou da hora programada
  progressPercent: number; // 0..100+
  formattedElapsed: string;
  formattedRemaining: string;
}

export function formatMmSs(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  const abs = Math.abs(Math.floor(totalSeconds));
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${neg ? '-' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calcula estado em tempo real do cronômetro (Ao Vivo, Ensaio Pessoal ou Concluído)
 * com alerta de Último Minuto (-1 min) e alerta de Estouro (Passou da Hora).
 */
export function computeStopwatchStatus(parte: ProgramaParte, nowMs: number = Date.now()): StopwatchSnapshot {
  const programmedSeconds = Math.max(60, (parte.tempoProgramadoMin || 1) * 60);
  let elapsedSeconds = 0;

  if (parte.modoCronometro === 'ao_vivo' && parte.inicioRealIso) {
    elapsedSeconds = Math.max(0, Math.floor((nowMs - new Date(parte.inicioRealIso).getTime()) / 1000));
  } else if (parte.modoCronometro === 'ensaio_pessoal' && parte.ensaioInicioIso) {
    elapsedSeconds = Math.max(0, Math.floor((nowMs - new Date(parte.ensaioInicioIso).getTime()) / 1000));
  } else if (parte.modoCronometro === 'concluido') {
    elapsedSeconds = parte.duracaoRealSegundos;
  } else {
    elapsedSeconds = parte.ensaioDuracaoSegundos || 0;
  }

  const remainingSeconds = programmedSeconds - elapsedSeconds;
  const isOvertime = elapsedSeconds > programmedSeconds;
  const isFinalMinute =
    (parte.modoCronometro === 'ao_vivo' || parte.modoCronometro === 'ensaio_pessoal') &&
    !isOvertime &&
    remainingSeconds <= 60 &&
    remainingSeconds >= 0;
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / programmedSeconds) * 100));

  return {
    elapsedSeconds,
    programmedSeconds,
    remainingSeconds,
    isFinalMinute,
    isOvertime,
    progressPercent,
    formattedElapsed: formatMmSs(elapsedSeconds),
    formattedRemaining: formatMmSs(remainingSeconds),
  };
}

export function normalizePhoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

/**
 * Gera link WhatsApp com modelo cordial da Presidência do Congresso (incluindo Salmo 134:3 como no Glide).
 */
export function buildSpeakerWhatsappUrl(
  parte: ProgramaParte,
  tipoMsg: 'boas_vindas' | 'checkin_dia1' | 'ensaio_palco' | 'alerta_30min',
): string {
  const phone = normalizePhoneForWhatsapp(parte.oradorTelefone);
  const hora = extractTimeHHMM(parte.dataHoraInicioProgramada);
  const templates: Record<typeof tipoMsg, string> = {
    boas_vindas: `Olá irmão ${parte.oradorNome || ''}! Tudo bem? Aqui é da Presidência do Congresso. Confirmando sua designação "${parte.tema}" (${parte.dia} às ${hora} — ${parte.tempoProgramadoMin} min). "Que Jeová, que fez o céu e a terra, o abençoe desde Sião." — Salmo 134:3.`,
    checkin_dia1: `Olá irmão ${parte.oradorNome || ''}! Lembrete cordial: ao chegar no 1º dia do congresso, por favor apresente-se à Presidência / Palco para registrar sua presença e alinhar o ensaio da parte "${parte.tema}" (${parte.dia} às ${hora}).`,
    ensaio_palco: `Olá irmão ${parte.oradorNome || ''}! Convidamos para o Ensaio no Palco referente à parte "${parte.tema}" (${parte.dia} às ${hora}). ${parte.ensaioPalcoHorario ? `Horário previsto: ${parte.ensaioPalcoHorario}.` : 'Por favor procure a equipe do Palco para alinhar microfone e áudio/vídeo.'}`,
    alerta_30min: `Olá irmão ${parte.oradorNome || ''}! Sua parte "${parte.tema}" começa às ${hora} (${parte.tempoProgramadoMin} min). Por favor apresente-se na lateral do palco 30 minutos antes do horário programado.`,
  };
  const encoded = encodeURIComponent(templates[tipoMsg]);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/**
 * Clona os dados de contato/identificação do orador de uma parte de referência para preencher rapidamente outra parte.
 */
export function extractSpeakerCloneFields(
  source: ProgramaParte,
): Pick<
  ProgramaParte,
  | 'oradorId'
  | 'oradorNome'
  | 'oradorCongregacao'
  | 'oradorCircuito'
  | 'oradorTelefone'
  | 'oradorEmailSecular'
  | 'oradorEmailJwpub'
  | 'oradorConfirmado'
> {
  return {
    oradorId: source.oradorId,
    oradorNome: source.oradorNome,
    oradorCongregacao: source.oradorCongregacao,
    oradorCircuito: source.oradorCircuito,
    oradorTelefone: source.oradorTelefone,
    oradorEmailSecular: source.oradorEmailSecular,
    oradorEmailJwpub: source.oradorEmailJwpub,
    oradorConfirmado: source.oradorConfirmado,
  };
}

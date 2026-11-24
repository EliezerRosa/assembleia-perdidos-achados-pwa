import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Film,
  Mic2,
  Play,
  Printer,
  Radio,
  Sparkles,
  Square,
  Users,
  Video,
} from 'lucide-react';
import { DIAS_CONGRESSO } from '../../constants/catalog';
import {
  computePresidenciaKpis,
  computeProgramEndTime,
  computeStopwatchStatus,
  countSpeakerCheckIns,
  deriveTurno,
  extractTimeHHMM,
  requiresStageRehearsal,
  sortProgramaPartes,
} from '../../services/presidenciaService';
import { useAppStore } from '../../store/useAppStore';
import type { DiaCongresso, TurnoCongresso } from '../../types/domain';

interface PresidenciaHubViewProps {
  onOpenParte: (parteId: string) => void;
}

export const PresidenciaHubView: React.FC<PresidenciaHubViewProps> = ({ onOpenParte }) => {
  const {
    db,
    activeEvento,
    setActiveTab,
    setProgramaQuickFilter,
    startProgramaParteLive,
    finishProgramaParte,
    loadDemoData,
  } = useAppStore();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedDia, setSelectedDia] = useState<DiaCongresso>('Sexta-feira');
  const [selectedTurno, setSelectedTurno] = useState<TurnoCongresso>('Manhã');

  const eventPartes = useMemo(() => {
    const list = activeEvento
      ? db.programaPartes.filter((p) => p.eventoId === activeEvento.id)
      : db.programaPartes;
    return sortProgramaPartes(list);
  }, [db.programaPartes, activeEvento]);

  const kpis = useMemo(() => computePresidenciaKpis(eventPartes), [eventPartes]);

  // Atualiza cronômetro a cada 1s quando houver parte em andamento
  useEffect(() => {
    if (!kpis.emAndamento) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [kpis.emAndamento]);

  const sessionPartes = useMemo(
    () => eventPartes.filter((p) => p.dia === selectedDia && deriveTurno(p.dataHoraInicioProgramada) === selectedTurno),
    [eventPartes, selectedDia, selectedTurno],
  );

  const eventParticipacoes = useMemo(
    () => (activeEvento ? db.participacoes.filter((x) => x.eventoId === activeEvento.id) : db.participacoes),
    [db.participacoes, activeEvento],
  );

  const eventGuiaAV = useMemo(
    () => (activeEvento ? db.guiaAV.filter((x) => x.eventoId === activeEvento.id) : db.guiaAV),
    [db.guiaAV, activeEvento],
  );

  const liveWatch = kpis.emAndamento ? computeStopwatchStatus(kpis.emAndamento, nowMs) : null;

  const jumpToFilteredProgram = (
    filter: 'todos' | 'oradores' | 'ja_compareceram' | 'faltam_dia1' | 'ensaios_pendentes',
  ) => {
    setProgramaQuickFilter(filter);
    setActiveTab('presidencia_programa');
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho Comando Presidência */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#1e3a5f] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
              EVENTO EM FOCO
            </span>
            {activeEvento && (
              <span className="text-xs font-bold text-slate-500">
                {activeEvento.tipo} • {activeEvento.codigo}
              </span>
            )}
          </div>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">Presidência do Congresso</h2>
          <p className="text-xs text-slate-500">
            Controle ao vivo do programa, check-in em 3 etapas, ensaios no palco, demonstrações e Guia Áudio & Vídeo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 text-[#1e3a5f]" />
            Imprimir Sessão (A4)
          </button>
          <button
            type="button"
            onClick={() => jumpToFilteredProgram('todos')}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#142944]"
          >
            <CalendarClock className="h-4 w-4 text-amber-300" />
            Gerenciar Programa ({eventPartes.length})
          </button>
        </div>
      </div>

      {/* Estado vazio com atalho de demonstração */}
      {eventPartes.length === 0 && (
        <div className="hc-card rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/70 p-6 text-center">
          <Mic2 className="mx-auto h-10 w-10 text-[#1e3a5f]" />
          <h3 className="mt-2 text-base font-extrabold text-slate-900">
            Nenhuma parte do programa cadastrada para este evento
          </h3>
          <p className="mx-auto mt-1 max-w-lg text-xs text-slate-600">
            Cadastre as partes do Congresso manualmente na aba <strong>Programa</strong> ou carregue agora os dados de
            demonstração fictícios para explorar todos os recursos (cronômetro, check-in 3 etapas, demonstrações e Guia A/V).
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={loadDemoData}
              className="touch-target inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-teal-800"
            >
              <Sparkles className="h-4 w-4" />
              Carregar Dados de Demonstração Fictícios
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presidencia_programa')}
              className="touch-target inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
            >
              Abrir Programa e Cadastrar Parte
            </button>
          </div>
        </div>
      )}

      {/* KPIs clicáveis (espelhando os painéis de Check-in e Ensaios do Glide) */}
      <div className="no-print grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => jumpToFilteredProgram('ja_compareceram')}
          className="hc-card group rounded-2xl border border-emerald-200 bg-white p-4 text-left shadow-xs hover:border-emerald-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-emerald-700">Já Compareceram</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-800">
            {kpis.jaCompareceram}
            <span className="text-sm font-semibold text-slate-400">/{kpis.partesComOrador}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 group-hover:text-emerald-700">
            Oradores com &ge; 1 etapa de check-in →
          </p>
        </button>

        <button
          type="button"
          onClick={() => jumpToFilteredProgram('faltam_dia1')}
          className={`hc-card group rounded-2xl border p-4 text-left shadow-xs transition ${
            kpis.faltamDia1 > 0
              ? 'border-rose-300 bg-rose-50/70 hover:border-rose-500'
              : 'border-slate-200 bg-white hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase ${kpis.faltamDia1 > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
              Faltam 1º Dia
            </span>
            <AlertTriangle className={`h-4 w-4 ${kpis.faltamDia1 > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <p className={`mt-1 text-2xl font-black ${kpis.faltamDia1 > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            {kpis.faltamDia1}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {kpis.faltamDia1 > 0 ? 'Acionar orador ou 1º substituto →' : 'Todos confirmados no 1º dia!'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => jumpToFilteredProgram('ensaios_pendentes')}
          className="hc-card group rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-xs hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-amber-800">Ensaios no Palco</span>
            <Mic2 className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1 text-2xl font-black text-amber-900">
            {kpis.ensaiosFeitos}
            <span className="text-sm font-semibold text-slate-400">/{kpis.ensaiosElegiveis}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Ao Vivo (Discurso / Oração) →</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presidencia_av')}
          className="hc-card group rounded-2xl border border-sky-200 bg-white p-4 text-left shadow-xs hover:border-sky-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-sky-800">Dicas A/V & Demos</span>
            <Film className="h-4 w-4 text-sky-700" />
          </div>
          <p className="mt-1 text-2xl font-black text-[#1e3a5f]">
            {eventGuiaAV.length}
            <span className="ml-1 text-xs font-bold text-teal-700">• {eventParticipacoes.length} demos</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Abrir Guia Áudio & Vídeo →</p>
        </button>
      </div>

      {/* CARTÃO DE EXECUÇÃO AO VIVO (PALCO AGORA & PRÓXIMA PARTE) */}
      {(kpis.emAndamento || kpis.proximaParte) && (
        <div className="no-print grid gap-4 lg:grid-cols-2">
          {/* Palco Agora */}
          <div
            className={`hc-card rounded-2xl border-2 p-5 shadow-sm ${
              liveWatch?.isOvertime
                ? 'border-rose-500 bg-rose-50'
                : liveWatch?.isFinalMinute
                  ? 'border-amber-500 bg-amber-50'
                  : kpis.emAndamento
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-extrabold text-white">
                <Radio className={`h-3.5 w-3.5 ${kpis.emAndamento ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
                {kpis.emAndamento
                  ? kpis.emAndamento.modoCronometro === 'ensaio_pessoal'
                    ? 'EM ENSAIO PESSOAL'
                    : 'NO PALCO AGORA (AO VIVO)'
                  : 'PALCO EM ESPERA'}
              </span>
              {liveWatch?.isOvertime && (
                <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white animate-pulse">
                  PASSOU DA HORA!
                </span>
              )}
              {liveWatch?.isFinalMinute && (
                <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-black text-slate-950 animate-pulse">
                  ÚLTIMO MINUTO (-1 min)
                </span>
              )}
            </div>

            {kpis.emAndamento && liveWatch ? (
              <div className="mt-3 space-y-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{kpis.emAndamento.tema}</h3>
                  <p className="text-xs font-semibold text-slate-600">
                    {kpis.emAndamento.oradorNome || 'Sem orador'} • {kpis.emAndamento.dia}{' '}
                    {extractTimeHHMM(kpis.emAndamento.dataHoraInicioProgramada)} ({kpis.emAndamento.tempoProgramadoMin} min)
                  </p>
                </div>

                <div className="flex items-end justify-between gap-3 rounded-xl bg-white/90 p-3 border border-slate-200">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Tempo Decorrido</p>
                    <p className="font-mono text-3xl font-black text-slate-900">{liveWatch.formattedElapsed}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-500">
                      {liveWatch.isOvertime ? 'Excedido' : 'Restante'}
                    </p>
                    <p
                      className={`font-mono text-2xl font-black ${
                        liveWatch.isOvertime
                          ? 'text-rose-600'
                          : liveWatch.isFinalMinute
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                      }`}
                    >
                      {liveWatch.formattedRemaining}
                    </p>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all ${
                      liveWatch.isOvertime ? 'bg-rose-600' : liveWatch.isFinalMinute ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${liveWatch.progressPercent}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => finishProgramaParte(kpis.emAndamento!.id)}
                    className="touch-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-rose-700"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    FIM da Parte
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenParte(kpis.emAndamento!.id)}
                    className="touch-target inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    Abrir Detalhes & Guia A/V
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-600">
                Nenhuma parte com cronômetro ativo no momento. Inicie a próxima parte ao lado ou abra qualquer parte do programa.
              </div>
            )}
          </div>

          {/* Próxima Parte */}
          {kpis.proximaParte && (
            <div className="hc-card flex flex-col justify-between rounded-2xl border border-sky-200 bg-white p-5 shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-900">
                    PRÓXIMA PARTE NA FILA
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {kpis.proximaParte.dia} • {extractTimeHHMM(kpis.proximaParte.dataHoraInicioProgramada)} –{' '}
                    {computeProgramEndTime(
                      kpis.proximaParte.dataHoraInicioProgramada,
                      kpis.proximaParte.tempoProgramadoMin,
                    )}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-extrabold text-slate-900">{kpis.proximaParte.tema}</h3>
                <p className="mt-1 text-xs text-slate-600">
                  <strong>Orador:</strong> {kpis.proximaParte.oradorNome || 'Não definido'}{' '}
                  {kpis.proximaParte.oradorCongregacao ? `(${kpis.proximaParte.oradorCongregacao})` : ''}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                    {kpis.proximaParte.tipo} • {kpis.proximaParte.formato}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 ${
                      countSpeakerCheckIns(kpis.proximaParte) >= 3
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    Check-in: {countSpeakerCheckIns(kpis.proximaParte)}/3
                  </span>
                  {requiresStageRehearsal(kpis.proximaParte) && (
                    <span
                      className={`rounded-md px-2 py-0.5 ${
                        kpis.proximaParte.ensaioPalcoFeito
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Ensaio Palco: {kpis.proximaParte.ensaioPalcoFeito ? 'OK' : 'Pendente'}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startProgramaParteLive(kpis.proximaParte!.id)}
                  className="touch-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  INÍCIO da Parte (Ao Vivo)
                </button>
                <button
                  type="button"
                  onClick={() => onOpenParte(kpis.proximaParte!.id)}
                  className="touch-target inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Conferir & Substitutos
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISÃO DO PRESIDENTE DE SESSÃO (6 TURNOS: SEX/SÁB/DOM × MANHÃ/TARDE) + FOLHA IMPRIMÍVEL A4 */}
      <div className="hc-card print-sheet rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Folha do Presidente de Sessão — {selectedDia} ({selectedTurno})
            </h3>
            <p className="text-xs text-slate-500">
              {activeEvento ? `${activeEvento.tipo} ${activeEvento.codigo} • ${activeEvento.local}` : 'Todos os eventos'}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-1.5">
            {DIAS_CONGRESSO.map((dia) =>
              (['Manhã', 'Tarde'] as TurnoCongresso[]).map((turno) => {
                const active = selectedDia === dia && selectedTurno === turno;
                const count = eventPartes.filter(
                  (p) => p.dia === dia && deriveTurno(p.dataHoraInicioProgramada) === turno,
                ).length;
                return (
                  <button
                    key={`${dia}-${turno}`}
                    type="button"
                    onClick={() => {
                      setSelectedDia(dia);
                      setSelectedTurno(turno);
                    }}
                    className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
                      active
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {dia.slice(0, 3)} {turno === 'Manhã' ? 'AM' : 'PM'} ({count})
                  </button>
                );
              }),
            )}
          </div>
        </div>

        {sessionPartes.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Nenhuma parte cadastrada para {selectedDia} — {selectedTurno}.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {sessionPartes.map((p) => {
              const cues = eventGuiaAV.filter((g) => g.programaParteId === p.id);
              const demos = eventParticipacoes.filter((d) => d.programaParteId === p.id);
              const checkCount = countSpeakerCheckIns(p);
              return (
                <div
                  key={p.id}
                  onClick={() => onOpenParte(p.id)}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 py-3 hover:bg-slate-50/80 px-2 rounded-xl transition"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-20 shrink-0 rounded-xl bg-slate-100 px-2 py-1.5 text-center">
                      <p className="font-mono text-xs font-black text-[#1e3a5f]">
                        {extractTimeHHMM(p.dataHoraInicioProgramada)}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500">{p.tempoProgramadoMin} min</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                          {p.tipo}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {p.formato}
                        </span>
                        {p.ehSerie && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-900">
                            Série
                          </span>
                        )}
                        {p.modoCronometro === 'concluido' && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            Concluída
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-extrabold text-slate-900">{p.tema}</p>
                      <p className="text-xs text-slate-600">
                        {p.oradorNome || '—'}{' '}
                        {p.oradorCongregacao ? <span className="text-slate-400">• {p.oradorCongregacao}</span> : null}
                        {p.substitutos.length > 0 && (
                          <span className="ml-2 text-[11px] text-amber-700 font-semibold">
                            (1º Sub: {p.substitutos[0].nome})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                        checkCount === 3
                          ? 'bg-emerald-100 text-emerald-800'
                          : checkCount >= 1
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {checkCount}/3
                    </span>
                    {cues.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-800">
                        <Video className="h-3 w-3" />
                        {cues.length} A/V
                      </span>
                    )}
                    {demos.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-teal-800">
                        <Users className="h-3 w-3" />
                        {demos.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

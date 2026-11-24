import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Film,
  Mail,
  MessageCircle,
  Mic2,
  Phone,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  Timer,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  DIAS_CONGRESSO,
  PRESIDENCIA_CHECKIN_ETAPAS,
  PROGRAMA_FORMATOS,
  PROGRAMA_TIPOS,
} from '../../constants/catalog';
import {
  buildSpeakerWhatsappUrl,
  computeProgramEndTime,
  computeStopwatchStatus,
  countSpeakerCheckIns,
  deriveTurno,
  extractSpeakerCloneFields,
  extractTimeHHMM,
  getNeighborPartes,
  requiresStageRehearsal,
  sortProgramaPartes,
} from '../../services/presidenciaService';
import { useAppStore } from '../../store/useAppStore';
import type {
  DiaCongresso,
  FormatoPartePrograma,
  ProgramaParte,
  SubstitutoOrador,
  TipoPartePrograma,
} from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';

interface ProgramaViewProps {
  selectedParteId: string | null;
  onSelectParte: (id: string | null) => void;
}

export const ProgramaView: React.FC<ProgramaViewProps> = ({ selectedParteId, onSelectParte }) => {
  const {
    db,
    activeEvento,
    programaQuickFilter,
    setProgramaQuickFilter,
    createProgramaParte,
    updateProgramaParte,
    deleteProgramaParte,
    startProgramaParteLive,
    startProgramaParteRehearsal,
    finishProgramaParte,
    restoreProgramaParte,
    logProgramaComunicacao,
    updateGuiaAV,
    notify,
  } = useAppStore();

  const [diaFilter, setDiaFilter] = useState<DiaCongresso | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingParte, setEditingParte] = useState<ProgramaParte | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [playModeAV, setPlayModeAV] = useState(true);

  const eventPartes = useMemo(() => {
    const list = activeEvento
      ? db.programaPartes.filter((p) => p.eventoId === activeEvento.id)
      : db.programaPartes;
    return sortProgramaPartes(list);
  }, [db.programaPartes, activeEvento]);

  const eventVoluntarios = useMemo(
    () => (activeEvento ? db.voluntarios.filter((v) => v.eventoId === activeEvento.id) : db.voluntarios),
    [db.voluntarios, activeEvento],
  );

  const hasLiveTimer = useMemo(
    () => eventPartes.some((p) => p.modoCronometro === 'ao_vivo' || p.modoCronometro === 'ensaio_pessoal'),
    [eventPartes],
  );

  useEffect(() => {
    if (!hasLiveTimer) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasLiveTimer]);

  const filteredPartes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return eventPartes.filter((p) => {
      if (diaFilter !== 'TODOS' && p.dia !== diaFilter) return false;
      if (programaQuickFilter === 'oradores' && !p.oradorNome.trim()) return false;
      if (programaQuickFilter === 'ja_compareceram' && !(p.oradorNome.trim() && countSpeakerCheckIns(p) >= 1))
        return false;
      if (programaQuickFilter === 'faltam_dia1' && !(p.oradorNome.trim() && !p.checkInDia1)) return false;
      if (programaQuickFilter === 'ensaios_pendentes' && !(requiresStageRehearsal(p) && !p.ensaioPalcoFeito))
        return false;
      if (programaQuickFilter === 'serie' && !p.ehSerie) return false;
      if (q) {
        const hay = `${p.tema} ${p.oradorNome} ${p.oradorCongregacao} ${p.tipo} ${p.formato} ${p.substitutos.map((s) => s.nome).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [eventPartes, diaFilter, programaQuickFilter, search]);

  const selectedParte = useMemo(
    () => eventPartes.find((p) => p.id === selectedParteId) ?? null,
    [eventPartes, selectedParteId],
  );

  const neighbors = useMemo(
    () => (selectedParte ? getNeighborPartes(eventPartes, selectedParte.id) : { anterior: null, posterior: null }),
    [eventPartes, selectedParte],
  );

  /* --- FORM STATE --- */
  const defaultDate = activeEvento?.data || new Date().toISOString().slice(0, 10);
  const [fDia, setFDia] = useState<DiaCongresso>('Sexta-feira');
  const [fInicio, setFInicio] = useState(`${defaultDate}T09:40`);
  const [fTempo, setFTempo] = useState(15);
  const [fTipo, setFTipo] = useState<TipoPartePrograma>('Discurso');
  const [fFormato, setFFormato] = useState<FormatoPartePrograma>('Ao Vivo');
  const [fTema, setFTema] = useState('');
  const [fSerie, setFSerie] = useState(false);
  const [fLink, setFLink] = useState('');
  const [fOradorId, setFOradorId] = useState('');
  const [fOradorNome, setFOradorNome] = useState('');
  const [fOradorCong, setFOradorCong] = useState('');
  const [fOradorCirc, setFOradorCirc] = useState(activeEvento?.circuito ?? '');
  const [fOradorTel, setFOradorTel] = useState('');
  const [fOradorEmailSec, setFOradorEmailSec] = useState('');
  const [fOradorEmailJw, setFOradorEmailJw] = useState('');
  const [fConfirmado, setFConfirmado] = useState(true);
  const [fEnsaioHorario, setFEnsaioHorario] = useState('');
  const [fObs, setFObs] = useState('');
  const [fSubs, setFSubs] = useState<SubstitutoOrador[]>([
    { ordem: 1, nome: '', congregacao: '', telefone: '' },
    { ordem: 2, nome: '', congregacao: '', telefone: '' },
    { ordem: 3, nome: '', congregacao: '', telefone: '' },
  ]);

  const openCreateForm = () => {
    setEditingParte(null);
    setFDia('Sexta-feira');
    setFInicio(`${activeEvento?.data || new Date().toISOString().slice(0, 10)}T09:40`);
    setFTempo(15);
    setFTipo('Discurso');
    setFFormato('Ao Vivo');
    setFTema('');
    setFSerie(false);
    setFLink('');
    setFOradorId('');
    setFOradorNome('');
    setFOradorCong('');
    setFOradorCirc(activeEvento?.circuito ?? '');
    setFOradorTel('');
    setFOradorEmailSec('');
    setFOradorEmailJw('');
    setFConfirmado(true);
    setFEnsaioHorario('');
    setFObs('');
    setFSubs([
      { ordem: 1, nome: '', congregacao: '', telefone: '' },
      { ordem: 2, nome: '', congregacao: '', telefone: '' },
      { ordem: 3, nome: '', congregacao: '', telefone: '' },
    ]);
    setFormOpen(true);
  };

  const openEditForm = (p: ProgramaParte) => {
    setEditingParte(p);
    setFDia(p.dia);
    setFInicio(p.dataHoraInicioProgramada);
    setFTempo(p.tempoProgramadoMin);
    setFTipo(p.tipo);
    setFFormato(p.formato);
    setFTema(p.tema);
    setFSerie(p.ehSerie);
    setFLink(p.linkEsboco);
    setFOradorId(p.oradorId ?? '');
    setFOradorNome(p.oradorNome);
    setFOradorCong(p.oradorCongregacao);
    setFOradorCirc(p.oradorCircuito);
    setFOradorTel(p.oradorTelefone);
    setFOradorEmailSec(p.oradorEmailSecular);
    setFOradorEmailJw(p.oradorEmailJwpub);
    setFConfirmado(p.oradorConfirmado);
    setFEnsaioHorario(p.ensaioPalcoHorario);
    setFObs(p.observacoes);
    setFSubs(
      ([1, 2, 3] as const).map((ordem) => {
        const found = p.substitutos.find((s) => s.ordem === ordem);
        return found ? { ...found } : { ordem, nome: '', congregacao: '', telefone: '' };
      }),
    );
    setFormOpen(true);
  };

  const handlePickVolunteerAsSpeaker = (volId: string) => {
    setFOradorId(volId);
    const v = eventVoluntarios.find((x) => x.id === volId);
    if (!v) return;
    setFOradorNome(v.nome);
    setFOradorCong(v.congregacao);
    setFOradorCirc(v.circuito);
    setFOradorTel(v.telefone);
    setFOradorEmailSec(v.emailSecular);
    setFOradorEmailJw(v.emailJwpub);
  };

  const handleCloneSpeakerFromParte = (parteId: string) => {
    const src = eventPartes.find((p) => p.id === parteId);
    if (!src) return;
    const cloned = extractSpeakerCloneFields(src);
    setFOradorId(cloned.oradorId ?? '');
    setFOradorNome(cloned.oradorNome);
    setFOradorCong(cloned.oradorCongregacao);
    setFOradorCirc(cloned.oradorCircuito);
    setFOradorTel(cloned.oradorTelefone);
    setFOradorEmailSec(cloned.oradorEmailSecular);
    setFOradorEmailJw(cloned.oradorEmailJwpub);
    setFConfirmado(cloned.oradorConfirmado);
    notify(`Orador "${cloned.oradorNome}" clonado da parte de referência!`, 'info');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvento) {
      notify('Selecione ou crie um evento primeiro.', 'warning');
      return;
    }
    if (!fTema.trim()) {
      notify('Informe o Tema da parte.', 'warning');
      return;
    }
    const cleanSubs = fSubs.filter((s) => s.nome.trim().length > 0);
    if (editingParte) {
      updateProgramaParte({
        ...editingParte,
        dia: fDia,
        dataHoraInicioProgramada: fInicio,
        tempoProgramadoMin: Math.max(1, Number(fTempo) || 5),
        tipo: fTipo,
        formato: fFormato,
        tema: fTema.trim(),
        ehSerie: fSerie,
        linkEsboco: fLink.trim(),
        oradorId: fOradorId || undefined,
        oradorNome: fOradorNome.trim(),
        oradorCongregacao: fOradorCong.trim(),
        oradorCircuito: fOradorCirc.trim(),
        oradorTelefone: fOradorTel.trim(),
        oradorEmailSecular: fOradorEmailSec.trim(),
        oradorEmailJwpub: fOradorEmailJw.trim(),
        oradorConfirmado: fConfirmado,
        substitutos: cleanSubs,
        ensaioPalcoHorario: fEnsaioHorario.trim(),
        observacoes: fObs.trim(),
      });
      notify('Parte do programa atualizada!', 'success');
    } else {
      createProgramaParte({
        eventoId: activeEvento.id,
        dia: fDia,
        dataHoraInicioProgramada: fInicio,
        tempoProgramadoMin: Math.max(1, Number(fTempo) || 5),
        tipo: fTipo,
        formato: fFormato,
        tema: fTema.trim(),
        ehSerie: fSerie,
        linkEsboco: fLink.trim(),
        oradorId: fOradorId || undefined,
        oradorNome: fOradorNome.trim(),
        oradorCongregacao: fOradorCong.trim(),
        oradorCircuito: fOradorCirc.trim(),
        oradorTelefone: fOradorTel.trim(),
        oradorEmailSecular: fOradorEmailSec.trim(),
        oradorEmailJwpub: fOradorEmailJw.trim(),
        oradorConfirmado: fConfirmado,
        substitutos: cleanSubs,
        checkInDia1: false,
        checkIn30MinDia: false,
        checkIn30MinPalco: false,
        ensaioPalcoFeito: false,
        ensaioPalcoHorario: fEnsaioHorario.trim(),
        observacoes: fObs.trim(),
      });
    }
    setFormOpen(false);
  };

  const promoteSubstitute = (parte: ProgramaParte, sub: SubstitutoOrador) => {
    if (
      !window.confirm(
        `Promover ${sub.ordem}º Substituto "${sub.nome}" para Orador Titular da parte "${parte.tema}"?`,
      )
    ) {
      return;
    }
    updateProgramaParte({
      ...parte,
      oradorId: sub.voluntarioId,
      oradorNome: sub.nome,
      oradorCongregacao: sub.congregacao,
      oradorTelefone: sub.telefone,
      oradorConfirmado: true,
      observacoes: `${parte.observacoes ? `${parte.observacoes}\n` : ''}[Substituição] ${sub.ordem}º Substituto assumiu no lugar de ${parte.oradorNome || 'titular'}.`,
    });
    notify(`"${sub.nome}" promovido para Orador Titular!`, 'success', true);
  };

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Programa, Oradores & Ensaios</h2>
          <p className="text-xs text-slate-500">
            Grade de 3 dias × 2 turnos, check-in em 3 etapas, 3 substitutos, ensaio no palco e cronômetro ao vivo.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#142944]"
        >
          <Plus className="h-4 w-4 text-amber-300" />
          Nova Parte do Programa
        </button>
      </div>

      {/* Filtros Rápidos (Dia + Slices Presidência + Busca) */}
      <div className="hc-card space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tema, orador, congregação ou substituto..."
              className="min-h-[40px] w-full rounded-xl border border-slate-300 pl-9 pr-3 text-xs focus:border-sky-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(['TODOS', ...DIAS_CONGRESSO] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiaFilter(d)}
                className={`rounded-xl px-2.5 py-2 text-xs font-bold transition ${
                  diaFilter === d ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {d === 'TODOS' ? 'Todos os Dias' : d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['todos', 'Todas as Partes'],
              ['oradores', 'Lista de Oradores'],
              ['ja_compareceram', 'Já Compareceram'],
              ['faltam_dia1', 'Faltam 1º Dia'],
              ['ensaios_pendentes', 'Ensaios Pendentes'],
              ['serie', 'Séries'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setProgramaQuickFilter(key)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                programaQuickFilter === key
                  ? key === 'faltam_dia1'
                    ? 'bg-rose-600 text-white'
                    : 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Partes Agrupadas por Dia/Turno */}
      {filteredPartes.length === 0 ? (
        <div className="hc-card rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Nenhuma parte encontrada para os filtros atuais.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPartes.map((p) => {
            const watch =
              p.modoCronometro === 'ao_vivo' || p.modoCronometro === 'ensaio_pessoal'
                ? computeStopwatchStatus(p, nowMs)
                : null;
            const checks = countSpeakerCheckIns(p);
            const avCount = db.guiaAV.filter((g) => g.programaParteId === p.id).length;
            const demoCount = db.participacoes.filter((d) => d.programaParteId === p.id).length;
            const turno = deriveTurno(p.dataHoraInicioProgramada);

            return (
              <div
                key={p.id}
                onClick={() => onSelectParte(p.id)}
                className={`hc-card cursor-pointer rounded-2xl border p-4 shadow-xs transition hover:shadow-md ${
                  watch?.isOvertime
                    ? 'border-rose-500 bg-rose-50'
                    : watch?.isFinalMinute
                      ? 'border-amber-500 bg-amber-50'
                      : p.modoCronometro === 'ao_vivo'
                        ? 'border-emerald-500 bg-emerald-50/40'
                        : 'border-slate-200 bg-white hover:border-sky-300'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-24 shrink-0 rounded-xl bg-slate-100 p-2 text-center">
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        {p.dia.slice(0, 3)} • {turno}
                      </p>
                      <p className="font-mono text-sm font-black text-[#1e3a5f]">
                        {extractTimeHHMM(p.dataHoraInicioProgramada)}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        {p.tempoProgramadoMin}m (até {computeProgramEndTime(p.dataHoraInicioProgramada, p.tempoProgramadoMin)})
                      </p>
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
                        {p.modoCronometro === 'ao_vivo' && watch && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-black text-white">
                            AO VIVO {watch.formattedElapsed}
                          </span>
                        )}
                        {p.modoCronometro === 'ensaio_pessoal' && watch && (
                          <span className="rounded-full bg-indigo-600 px-2 py-0.5 font-mono text-[10px] font-black text-white">
                            ENSAIO {watch.formattedElapsed}
                          </span>
                        )}
                        {p.modoCronometro === 'concluido' && (
                          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-white">
                            Concluída
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 text-sm font-extrabold text-slate-900">{p.tema}</h3>
                      <p className="mt-0.5 text-xs text-slate-600">
                        <strong>{p.oradorNome || 'Orador pendente'}</strong>
                        {p.oradorCongregacao ? ` • ${p.oradorCongregacao}` : ''}
                        {p.substitutos.length > 0 && (
                          <span className="ml-2 text-[11px] font-semibold text-amber-800">
                            🥇 {p.substitutos[0].nome}
                            {p.substitutos.length > 1 ? ` (+${p.substitutos.length - 1})` : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Quick Indicators */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                        checks === 3
                          ? 'bg-emerald-100 text-emerald-800'
                          : checks >= 1
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Check-in {checks}/3
                    </span>

                    {requiresStageRehearsal(p) && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                          p.ensaioPalcoFeito ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-900'
                        }`}
                      >
                        <Mic2 className="h-3.5 w-3.5" />
                        {p.ensaioPalcoFeito ? 'Ensaio OK' : 'Sem Ensaio'}
                      </span>
                    )}

                    {avCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-800">
                        <Film className="h-3.5 w-3.5" />
                        {avCount} A/V
                      </span>
                    )}
                    {demoCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-teal-800">
                        <Users className="h-3.5 w-3.5" />
                        {demoCount} Demo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====================================================================
       * MODAL DE DETALHE & CONTROLE AO VIVO DA PARTE (CRONÔMETRO + CHECK-IN + A/V)
       * ==================================================================== */}
      {selectedParte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-xs">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* Top Bar com Navegação Parte Anterior / Posterior */}
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#1e3a5f] px-4 py-3 text-white">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!neighbors.anterior}
                  onClick={() => neighbors.anterior && onSelectParte(neighbors.anterior.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20 disabled:opacity-30"
                  title={neighbors.anterior?.tema}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={!neighbors.posterior}
                  onClick={() => neighbors.posterior && onSelectParte(neighbors.posterior.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20 disabled:opacity-30"
                  title={neighbors.posterior?.tema}
                >
                  Próxima <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditForm(selectedParte)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-bold hover:bg-white/25"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Excluir a parte "${selectedParte.tema}"?`)) {
                      deleteProgramaParte(selectedParte.id);
                      onSelectParte(null);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-500/80 px-2.5 py-1.5 text-xs font-bold hover:bg-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectParte(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              {/* Cabeçalho da Parte */}
              <div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <span className="rounded-md bg-sky-100 px-2 py-0.5 text-sky-900">{selectedParte.dia}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-800">
                    {extractTimeHHMM(selectedParte.dataHoraInicioProgramada)} –{' '}
                    {computeProgramEndTime(selectedParte.dataHoraInicioProgramada, selectedParte.tempoProgramadoMin)} (
                    {selectedParte.tempoProgramadoMin} min)
                  </span>
                  <span className="rounded-md bg-teal-100 px-2 py-0.5 text-teal-900">
                    {selectedParte.tipo} • {selectedParte.formato}
                  </span>
                  {selectedParte.linkEsboco && (
                    <a
                      href={selectedParte.linkEsboco}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-indigo-800 hover:underline"
                    >
                      Esboço <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900">{selectedParte.tema}</h3>
                {selectedParte.observacoes && (
                  <p className="mt-1 whitespace-pre-line rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                    {selectedParte.observacoes}
                  </p>
                )}
              </div>

              {/* 1. CRONÔMETRO DUAL-MODE (AO VIVO vs ENSAIO PESSOAL) */}
              {(() => {
                const watch = computeStopwatchStatus(selectedParte, nowMs);
                return (
                  <div
                    className={`rounded-2xl border-2 p-4 ${
                      watch.isOvertime
                        ? 'border-rose-500 bg-rose-50'
                        : watch.isFinalMinute
                          ? 'border-amber-500 bg-amber-50'
                          : selectedParte.modoCronometro === 'ao_vivo'
                            ? 'border-emerald-500 bg-emerald-50/70'
                            : selectedParte.modoCronometro === 'ensaio_pessoal'
                              ? 'border-indigo-500 bg-indigo-50/70'
                              : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-slate-800">
                        <Timer className="h-4 w-4 text-[#1e3a5f]" />
                        Cronômetro ({selectedParte.modoCronometro.replace('_', ' ').toUpperCase()})
                      </span>
                      {watch.isOvertime && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white animate-pulse">
                          <AlertTriangle className="h-3.5 w-3.5" /> PASSOU DA HORA!
                        </span>
                      )}
                      {watch.isFinalMinute && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-black text-slate-950 animate-pulse">
                          <Clock className="h-3.5 w-3.5" /> ÚLTIMO MINUTO (-1 min)
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-white p-3 border border-slate-200">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Decorrido</p>
                        <p className="font-mono text-3xl font-black text-slate-900">{watch.formattedElapsed}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-slate-500">
                          {watch.isOvertime ? 'Excedido' : `Restante (de ${selectedParte.tempoProgramadoMin}m)`}
                        </p>
                        <p
                          className={`font-mono text-3xl font-black ${
                            watch.isOvertime
                              ? 'text-rose-600'
                              : watch.isFinalMinute
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                          }`}
                        >
                          {watch.formattedRemaining}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full transition-all ${
                          watch.isOvertime ? 'bg-rose-600' : watch.isFinalMinute ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${watch.progressPercent}%` }}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedParte.modoCronometro !== 'ao_vivo' && (
                        <button
                          type="button"
                          onClick={() => startProgramaParteLive(selectedParte.id)}
                          className="touch-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          INÍCIO da Parte (Ao Vivo)
                        </button>
                      )}
                      {selectedParte.modoCronometro === 'parado' && (
                        <button
                          type="button"
                          onClick={() => startProgramaParteRehearsal(selectedParte.id)}
                          className="touch-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700"
                        >
                          <Timer className="h-4 w-4" />
                          INICIAR ENSAIO PESSOAL
                        </button>
                      )}
                      {(selectedParte.modoCronometro === 'ao_vivo' ||
                        selectedParte.modoCronometro === 'ensaio_pessoal') && (
                        <button
                          type="button"
                          onClick={() => finishProgramaParte(selectedParte.id)}
                          className="touch-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-rose-700"
                        >
                          <Square className="h-4 w-4 fill-current" />
                          {selectedParte.modoCronometro === 'ensaio_pessoal' ? 'Encerrar Ensaio' : 'FIM da Parte'}
                        </button>
                      )}
                      {(selectedParte.modoCronometro !== 'parado' || selectedParte.duracaoRealSegundos > 0) && (
                        <button
                          type="button"
                          onClick={() => restoreProgramaParte(selectedParte.id)}
                          className="touch-target inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          RESTAURAR Parte
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 2. CHECK-IN 3 ETAPAS + ENSAIO NO PALCO */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                  Check-in do Orador (3 Etapas) & Ensaio no Palco
                </h4>
                <div className="grid gap-2">
                  {PRESIDENCIA_CHECKIN_ETAPAS.map((etapa) => {
                    const checked = selectedParte[etapa.key];
                    return (
                      <label
                        key={etapa.key}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs font-bold transition ${
                          checked
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            updateProgramaParte({ ...selectedParte, [etapa.key]: e.target.checked })
                          }
                          className="h-5 w-5 accent-emerald-600"
                        />
                        <span>
                          ({etapa.numero}) {etapa.label}
                        </span>
                      </label>
                    );
                  })}

                  <label
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-xs font-extrabold transition ${
                      selectedParte.ensaioPalcoFeito
                        ? 'border-teal-400 bg-teal-50 text-teal-950'
                        : 'border-amber-300 bg-amber-50 text-amber-950'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedParte.ensaioPalcoFeito}
                        onChange={(e) =>
                          updateProgramaParte({ ...selectedParte, ensaioPalcoFeito: e.target.checked })
                        }
                        className="h-5 w-5 accent-teal-700"
                      />
                      <span>
                        JÁ FEZ ENSAIO NO PALCO?
                        {selectedParte.ensaioPalcoHorario && (
                          <span className="ml-2 font-normal text-slate-600">
                            ({selectedParte.ensaioPalcoHorario})
                          </span>
                        )}
                      </span>
                    </span>
                    <Mic2 className="h-4 w-4 shrink-0" />
                  </label>
                </div>
              </div>

              {/* 3. ORADOR TITULAR, CONTATO RÁPIDO & 3 SUBSTITUTOS */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-slate-500">Orador Titular</p>
                    <p className="text-base font-extrabold text-slate-900">
                      {selectedParte.oradorNome || 'Não designado'}
                    </p>
                    <p className="text-xs text-slate-600">
                      {selectedParte.oradorCongregacao || 'Sem congregação'}
                      {selectedParte.oradorCircuito ? ` • Circuito ${selectedParte.oradorCircuito}` : ''}
                      {selectedParte.oradorTelefone ? ` • ${selectedParte.oradorTelefone}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href={buildSpeakerWhatsappUrl(selectedParte, 'boas_vindas')}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => logProgramaComunicacao(selectedParte.id, 'WhatsApp', 'Boas-vindas (Salmo 134:3)')}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp (Sl 134:3)
                    </a>
                    <a
                      href={buildSpeakerWhatsappUrl(selectedParte, 'ensaio_palco')}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => logProgramaComunicacao(selectedParte.id, 'WhatsApp', 'Convite Ensaio no Palco')}
                      className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2 text-[11px] font-bold text-white hover:bg-teal-800"
                    >
                      <Mic2 className="h-3.5 w-3.5" /> Convite Ensaio
                    </a>
                    {selectedParte.oradorTelefone && (
                      <a
                        href={`tel:${selectedParte.oradorTelefone.replace(/\D/g, '')}`}
                        onClick={() => logProgramaComunicacao(selectedParte.id, 'Ligação', 'Ligação direta ao orador')}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        <Phone className="h-3.5 w-3.5" /> Ligar
                      </a>
                    )}
                    {selectedParte.oradorEmailSecular && (
                      <a
                        href={`mailto:${selectedParte.oradorEmailSecular}?subject=${encodeURIComponent(`Congresso — ${selectedParte.tema}`)}`}
                        onClick={() => logProgramaComunicacao(selectedParte.id, 'E-mail', 'E-mail enviado ao orador')}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        <Mail className="h-3.5 w-3.5" /> E-mail
                      </a>
                    )}
                  </div>
                </div>

                {/* 3 Substitutos */}
                {selectedParte.substitutos.length > 0 && (
                  <div className="border-t border-slate-200 pt-3">
                    <p className="mb-2 text-[11px] font-extrabold uppercase text-amber-800">
                      Substitutos de Contingência (1º / 2º / 3º)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {selectedParte.substitutos.map((sub) => (
                        <div key={sub.ordem} className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs">
                          <p className="font-extrabold text-slate-900">
                            {sub.ordem === 1 ? '🥇' : sub.ordem === 2 ? '🥈' : '🥉'} {sub.ordem}º Substituto
                          </p>
                          <p className="mt-0.5 font-bold text-slate-800">{sub.nome}</p>
                          <p className="text-[11px] text-slate-500">
                            {sub.congregacao} {sub.telefone ? `• ${sub.telefone}` : ''}
                          </p>
                          <button
                            type="button"
                            onClick={() => promoteSubstitute(selectedParte, sub)}
                            className="mt-2 w-full rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-950 hover:bg-amber-200"
                          >
                            Promover p/ Titular
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. GUIA ÁUDIO E VÍDEO EMBARCADO NA PARTE (COM ATIVAR PLAY) */}
              {(() => {
                const cues = db.guiaAV
                  .filter((g) => g.programaParteId === selectedParte.id)
                  .sort((a, b) => a.secaoSequencia - b.secaoSequencia || a.midiaSequencia - b.midiaSequencia);
                return (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-indigo-950">
                        <Film className="h-4 w-4 text-indigo-700" />
                        Guia Áudio & Vídeo desta Parte ({cues.length})
                      </h4>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-indigo-900">
                        <input
                          type="checkbox"
                          checked={playModeAV}
                          onChange={(e) => setPlayModeAV(e.target.checked)}
                          className="accent-indigo-700"
                        />
                        Ativar Play
                      </label>
                    </div>
                    {cues.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Nenhuma mídia/vídeo vinculada a esta parte. Adicione na aba <strong>Guia A/V</strong>.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {cues.map((c) => (
                          <div
                            key={c.id}
                            className={`rounded-xl border p-3 text-xs ${
                              c.executado
                                ? 'border-emerald-300 bg-emerald-50/80'
                                : 'border-indigo-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-slate-900">
                                Seção {c.secaoSequencia}: {c.secaoTopico} • #{c.midiaSequencia} {c.midiaTipo} (
                                {c.midiaTempoSeg}s)
                              </span>
                              {playModeAV && (
                                <button
                                  type="button"
                                  onClick={() => updateGuiaAV({ ...c, executado: !c.executado })}
                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                                    c.executado
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                                  }`}
                                >
                                  {c.executado ? '✓ PLAY OK' : '▶ MARCAR PLAY'}
                                </button>
                              )}
                            </div>
                            <p className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 font-semibold text-amber-950">
                              🎬 Dica Play: {c.dicaPlay}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 5. PARTICIPAÇÕES VINCULADAS (DEMONSTRAÇÕES / ENTREVISTAS) */}
              {(() => {
                const demos = db.participacoes.filter((d) => d.programaParteId === selectedParte.id);
                if (demos.length === 0) return null;
                return (
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 space-y-2">
                    <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-teal-950">
                      <Users className="h-4 w-4 text-teal-700" />
                      Participantes de Demonstrações / Entrevistas ({demos.length})
                    </h4>
                    {demos.map((d) => (
                      <div key={d.id} className="rounded-xl border border-teal-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900">
                            {d.participanteNome}{' '}
                            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] text-teal-900">
                              {d.tipoParticipacao}
                            </span>
                          </span>
                          <span className={d.ensaioConfirmado ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                            {d.ensaioConfirmado ? '✓ Ensaio OK' : '⏳ Ensaio Pendente'}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600">{d.descricao}</p>
                        {d.orientacoes && <p className="mt-1 text-[11px] text-slate-500">Palco: {d.orientacoes}</p>}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Log de Mensagens */}
              {selectedParte.mensagensLog.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-xs">
                  <p className="mb-1.5 font-extrabold text-slate-700">Histórico de Contatos com Orador</p>
                  {selectedParte.mensagensLog.slice(0, 5).map((m) => (
                    <p key={m.id} className="text-[11px] text-slate-600">
                      • <strong>{m.canal}</strong> ({new Date(m.timestamp).toLocaleTimeString('pt-BR')}): {m.resumo}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
       * MODAL CRIAR / EDITAR PARTE DO PROGRAMA
       * ==================================================================== */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveForm}
            className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-[#1e3a5f] px-5 py-3.5 text-white">
              <h3 className="text-sm font-extrabold">
                {editingParte ? 'Editar Parte do Programa' : 'Nova Parte do Programa'}
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Dia</label>
                  <select
                    value={fDia}
                    onChange={(e) => setFDia(e.target.value as DiaCongresso)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {DIAS_CONGRESSO.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Início Programado</label>
                  <input
                    type="datetime-local"
                    value={fInicio}
                    onChange={(e) => setFInicio(e.target.value)}
                    required
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Tempo (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={fTempo}
                    onChange={(e) => setFTempo(Number(e.target.value))}
                    required
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Tipo da Parte</label>
                  <select
                    value={fTipo}
                    onChange={(e) => setFTipo(e.target.value as TipoPartePrograma)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {PROGRAMA_TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Formato</label>
                  <select
                    value={fFormato}
                    onChange={(e) => setFFormato(e.target.value as FormatoPartePrograma)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {PROGRAMA_FORMATOS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={fSerie}
                      onChange={(e) => setFSerie(e.target.checked)}
                      className="h-4 w-4 accent-[#1e3a5f]"
                    />
                    Parte de Série de Discursos
                  </label>
                </div>
              </div>

              <VoiceInput label="Tema da Parte" value={fTema} onChange={setFTema} required placeholder="Ex.: Discurso do Presidente..." />

              {/* Orador + Seletor de Equipe + Clonagem rápida (igual Glide!) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase text-slate-700">Orador Titular</span>
                  <div className="flex flex-wrap gap-2">
                    {eventVoluntarios.length > 0 && (
                      <select
                        value={fOradorId}
                        onChange={(e) => handlePickVolunteerAsSpeaker(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
                      >
                        <option value="">Escolher da Equipe...</option>
                        {eventVoluntarios.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nome} ({v.congregacao})
                          </option>
                        ))}
                      </select>
                    )}
                    {eventPartes.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => e.target.value && handleCloneSpeakerFromParte(e.target.value)}
                        className="rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-900"
                      >
                        <option value="">Clonar Orador de outra parte...</option>
                        {eventPartes
                          .filter((p) => p.oradorNome)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.oradorNome} ({p.dia} {extractTimeHHMM(p.dataHoraInicioProgramada)})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <VoiceInput label="Nome do Orador" value={fOradorNome} onChange={setFOradorNome} />
                  <VoiceInput label="Congregação" value={fOradorCong} onChange={setFOradorCong} />
                  <VoiceInput label="Telefone / WhatsApp" value={fOradorTel} onChange={setFOradorTel} placeholder="(27) 9..." />
                  <VoiceInput label="Horário Ensaio Palco" value={fEnsaioHorario} onChange={setFEnsaioHorario} placeholder="Ex.: Sexta 08:15" />
                </div>
              </div>

              {/* 3 Substitutos */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
                <p className="text-xs font-extrabold uppercase text-amber-900">
                  Substitutos (1º 🥇 • 2º 🥈 • 3º 🥉)
                </p>
                {fSubs.map((sub, idx) => (
                  <div key={sub.ordem} className="grid gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      placeholder={`${sub.ordem}º Substituto — Nome`}
                      value={sub.nome}
                      onChange={(e) =>
                        setFSubs((prev) => prev.map((x, i) => (i === idx ? { ...x, nome: e.target.value } : x)))
                      }
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Congregação"
                      value={sub.congregacao}
                      onChange={(e) =>
                        setFSubs((prev) => prev.map((x, i) => (i === idx ? { ...x, congregacao: e.target.value } : x)))
                      }
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp"
                      value={sub.telefone}
                      onChange={(e) =>
                        setFSubs((prev) => prev.map((x, i) => (i === idx ? { ...x, telefone: e.target.value } : x)))
                      }
                      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <VoiceInput label="Link do Esboço (opcional)" value={fLink} onChange={setFLink} placeholder="https://..." />
                <VoiceInput label="Observações" value={fObs} onChange={setFObs} />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Parte
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

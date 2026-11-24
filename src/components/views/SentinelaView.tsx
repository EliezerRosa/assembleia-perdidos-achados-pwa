import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Mic2,
  Pause,
  Play,
  Plus,
  Printer,
  Send,
  SkipForward,
  Sparkles,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import {
  DIAS_CONGRESSO,
  POSICOES_PALCO,
  POSICAO_PALCO_STYLE,
  SENTINELA_ORIENTACOES,
} from '../../constants/catalog';
import {
  buildBackupCoverageMatrix,
  buildSentinelaWhatsappUrl,
  computeSentinelaSchedule,
  formatDurationCompact,
} from '../../services/sentinelaService';
import { speakPtBr } from '../../services/voiceService';
import { useAppStore } from '../../store/useAppStore';
import type { DiaCongresso, PosicaoPalco, SentinelaEstudo } from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';
import { SentinelaDetailModal } from './SentinelaDetailModal';

interface SentinelaViewProps {
  mode: 'estudo' | 'palco' | 'imagens' | 'audio';
}

export const SentinelaView: React.FC<SentinelaViewProps> = ({ mode }) => {
  const {
    db,
    activeEvento,
    saveSentinelaEstudo,
    createSentinelaComentario,
    updateSentinelaComentario,
    moveSentinelaComentario,
    addConversaMensagem,
    loadDemoData,
    notify,
  } = useAppStore();

  const [selectedComentarioId, setSelectedComentarioId] = useState<string | null>(null);
  const [subtopicoFilter, setSubtopicoFilter] = useState<string>('TODOS');
  const [palcoSubTab, setPalcoSubTab] = useState<'galeria' | 'substituicoes' | 'orientacoes'>('galeria');
  const [orientacoesModalOpen, setOrientacoesModalOpen] = useState(false);
  const [estudoFormOpen, setEstudoFormOpen] = useState(false);
  const [newComFormOpen, setNewComFormOpen] = useState(false);
  const [generalChatText, setGeneralChatText] = useState('');

  // Sequential Audio Player state ("Áudio Completo")
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number>(-1);
  const [playingPhase, setPlayingPhase] = useState<'Pergunta' | 'Comentário' | 'Conectivo' | ''>('');
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const stopPlaylistRef = useRef(false);

  const estudo: SentinelaEstudo | null = useMemo(() => {
    const list = activeEvento
      ? db.sentinelaEstudos.filter((s) => s.eventoId === activeEvento.id)
      : db.sentinelaEstudos;
    return list[0] ?? null;
  }, [db.sentinelaEstudos, activeEvento]);

  const studyComentarios = useMemo(() => {
    if (!estudo) return [];
    return db.sentinelaComentarios.filter((c) => c.estudoId === estudo.id);
  }, [db.sentinelaComentarios, estudo]);

  const schedule = useMemo(() => computeSentinelaSchedule(estudo, studyComentarios), [estudo, studyComentarios]);

  const subtopicos = useMemo(
    () => Array.from(new Set(schedule.items.map((x) => x.comentario.subtopico).filter(Boolean))),
    [schedule.items],
  );

  const filteredItems = useMemo(
    () =>
      schedule.items.filter(
        (x) => subtopicoFilter === 'TODOS' || x.comentario.subtopico === subtopicoFilter,
      ),
    [schedule.items, subtopicoFilter],
  );

  const selectedScheduled = useMemo(
    () => schedule.items.find((x) => x.comentario.id === selectedComentarioId) ?? null,
    [schedule.items, selectedComentarioId],
  );

  const backupMatrix = useMemo(() => buildBackupCoverageMatrix(studyComentarios), [studyComentarios]);

  const imagesItems = useMemo(
    () => schedule.items.filter((x) => Boolean(x.comentario.imagemRelacionada.trim())),
    [schedule.items],
  );

  const generalChat = useMemo(
    () =>
      estudo
        ? db.conversas.filter((m) => m.contextoTipo === 'sentinela_estudo' && m.contextoId === estudo.id)
        : [],
    [db.conversas, estudo],
  );

  /* --- ESTUDO HEADER FORM STATE --- */
  const [eTitulo, setETitulo] = useState('');
  const [eEdicao, setEEdicao] = useState('');
  const [eTextoBase, setETextoBase] = useState('');
  const [eObjetivo, setEObjetivo] = useState('');
  const [eCantIni, setECantIni] = useState('');
  const [eCantFim, setECantFim] = useState('');
  const [eLink, setELink] = useState('');
  const [eDia, setEDia] = useState<DiaCongresso>('Domingo');
  const [eHora, setEHora] = useState('10:30');
  const [eDurMin, setEDurMin] = useState(30);
  const [eDirigente, setEDirigente] = useState('');
  const [eDirTel, setEDirTel] = useState('');
  const [eObs, setEObs] = useState('');

  const openEstudoForm = () => {
    setETitulo(estudo?.tituloArtigo ?? '');
    setEEdicao(estudo?.edicaoSemana ?? '');
    setETextoBase(estudo?.textoBase ?? '');
    setEObjetivo(estudo?.objetivo ?? '');
    setECantIni(estudo?.canticoInicial ?? '');
    setECantFim(estudo?.canticoFinal ?? '');
    setELink(estudo?.linkArtigoJw ?? '');
    setEDia(estudo?.dia ?? 'Domingo');
    setEHora(estudo?.horaInicio ?? '10:30');
    setEDurMin(estudo?.duracaoPrevistaMin ?? 30);
    setEDirigente(estudo?.dirigenteNome ?? '');
    setEDirTel(estudo?.dirigenteTelefone ?? '');
    setEObs(estudo?.observacoesPalco ?? 'Ensaio no Palco: Domingo 08:30.');
    setEstudoFormOpen(true);
  };

  const handleSaveEstudo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvento || !eTitulo.trim()) {
      notify('Selecione um evento e informe o título do artigo.', 'warning');
      return;
    }
    saveSentinelaEstudo({
      id: estudo?.id,
      eventoId: activeEvento.id,
      tituloArtigo: eTitulo.trim(),
      edicaoSemana: eEdicao.trim(),
      textoBase: eTextoBase.trim(),
      objetivo: eObjetivo.trim(),
      canticoInicial: eCantIni.trim(),
      canticoFinal: eCantFim.trim(),
      linkArtigoJw: eLink.trim(),
      dia: eDia,
      horaInicio: eHora || '10:30',
      duracaoPrevistaMin: Math.max(5, Number(eDurMin) || 30),
      dirigenteNome: eDirigente.trim(),
      dirigenteTelefone: eDirTel.trim(),
      observacoesPalco: eObs.trim(),
    });
    setEstudoFormOpen(false);
  };

  /* --- NEW COMMENT FORM STATE --- */
  const [cSubtopico, setCSubtopico] = useState('');
  const [cParagrafos, setCParagrafos] = useState('');
  const [cPergunta, setCPergunta] = useState('');
  const [cComentario, setCComentario] = useState('');
  const [cTempoSeg, setCTempoSeg] = useState(30);
  const [cPosicao, setCPosicao] = useState<PosicaoPalco>('ESQUERDA');
  const [cComNome, setCComNome] = useState('');
  const [cSubNome, setCSubNome] = useState('');

  const openNewComForm = () => {
    // Sugere automaticamente o lado oposto ao último comentário!
    const last = schedule.items[schedule.items.length - 1]?.comentario;
    const suggestedPos: PosicaoPalco = last?.posicaoPalco === 'ESQUERDA' ? 'DIREITA' : 'ESQUERDA';
    setCSubtopico(last?.subtopico ?? '');
    setCParagrafos('');
    setCPergunta('');
    setCComentario('');
    setCTempoSeg(30);
    setCPosicao(suggestedPos);
    setCComNome('');
    setCSubNome('');
    setNewComFormOpen(true);
  };

  const handleCreateComentario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvento || !estudo) {
      notify('Configure primeiro o cabeçalho do Estudo de A Sentinela.', 'warning');
      return;
    }
    if (!cPergunta.trim()) {
      notify('Informe a pergunta do parágrafo.', 'warning');
      return;
    }
    const nextOrder = schedule.items.length + 1;
    createSentinelaComentario({
      eventoId: activeEvento.id,
      estudoId: estudo.id,
      ordenacao: nextOrder,
      subtopico: cSubtopico.trim() || 'Tópico Geral',
      paragrafos: cParagrafos.trim(),
      parteAB: '',
      linkParagrafo: '',
      pergunta: cPergunta.trim(),
      paragrafoResposta: cParagrafos.trim() ? `§${cParagrafos.trim()}` : '',
      respostaLiteral: '',
      comentarioSugerido: cComentario.trim(),
      comentarioTextoBiblico: '',
      conectivo: '',
      tempoSegundos: Math.max(10, Number(cTempoSeg) || 30),
      posicaoPalco: cPosicao,
      comentaristaNome: cComNome.trim(),
      comentaristaCongregacao: '',
      comentaristaTelefone: '',
      comentaristaFoto: '',
      ehCasal: false,
      substitutoNome: cSubNome.trim(),
      substitutoTelefone: '',
      substitutoCongregacao: '',
      presenteDia1: false,
      ensaioPalcoFeito: false,
      jaFeito: false,
      imagemRelacionada: '',
      imagemLegenda: '',
      audioPergunta: '',
      audioComentario: '',
      audioConectivo: '',
    });
    setNewComFormOpen(false);
  };

  /* --- SEQUENTIAL AUDIO PLAYER ("ÁUDIO COMPLETO") --- */
  const playBlobOrTts = (audioUrl: string, textFallback: string): Promise<void> => {
    return new Promise((resolve) => {
      if (stopPlaylistRef.current) {
        resolve();
        return;
      }
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioElRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
        return;
      }
      if (textFallback && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(textFallback);
        utter.lang = 'pt-BR';
        utter.rate = 1.05;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
        return;
      }
      resolve();
    });
  };

  const stopSequentialPlayer = () => {
    stopPlaylistRef.current = true;
    audioElRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAll(false);
    setPlayingIdx(-1);
    setPlayingPhase('');
  };

  const startSequentialPlayer = async (startIndex = 0) => {
    if (schedule.items.length === 0) return;
    stopPlaylistRef.current = false;
    setIsPlayingAll(true);

    for (let i = startIndex; i < schedule.items.length; i++) {
      if (stopPlaylistRef.current) break;
      const item = schedule.items[i].comentario;
      setPlayingIdx(i);

      setPlayingPhase('Pergunta');
      await playBlobOrTts(item.audioPergunta, `Ordem ${item.ordenacao}. Pergunta: ${item.pergunta}`);
      if (stopPlaylistRef.current) break;

      setPlayingPhase('Comentário');
      await playBlobOrTts(
        item.audioComentario,
        `Comentário de ${item.comentaristaNome || 'comentarista'}, lado ${item.posicaoPalco}: ${item.comentarioSugerido || item.respostaLiteral}`,
      );
      if (stopPlaylistRef.current) break;

      if (item.audioConectivo || item.conectivo) {
        setPlayingPhase('Conectivo');
        await playBlobOrTts(item.audioConectivo, item.conectivo);
      }
    }
    setIsPlayingAll(false);
    setPlayingPhase('');
    setPlayingIdx(-1);
  };

  const handleSendGeneralChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalChatText.trim() || !activeEvento || !estudo) return;
    addConversaMensagem({
      eventoId: activeEvento.id,
      contextoTipo: 'sentinela_estudo',
      contextoId: estudo.id,
      autorNome: db.config.operadorPadrao || 'Dirigente',
      texto: generalChatText.trim(),
    });
    setGeneralChatText('');
  };

  // Estado vazio sem estudo cadastrado
  if (!estudo) {
    return (
      <div className="space-y-4">
        <div className="hc-card rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-7 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-[#1e3a5f]" />
          <h2 className="mt-2 text-lg font-extrabold text-slate-900">Resumo de A Sentinela</h2>
          <p className="mx-auto mt-1 max-w-lg text-xs text-slate-600">
            Configure o artigo de estudo deste Congresso/Assembleia para gerenciar a <strong>Ordem de Entrada</strong>,
            cronograma em cascata (30s), alternância <strong>ESQUERDA ↔ DIREITA</strong>, galeria de palco, imagens A/V e
            ensaio em áudio.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={openEstudoForm}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-xs font-extrabold text-white"
            >
              <Plus className="h-4 w-4 text-amber-300" /> Configurar Estudo de A Sentinela
            </button>
            <button
              type="button"
              onClick={loadDemoData}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-extrabold text-white"
            >
              <Sparkles className="h-4 w-4" /> Carregar Demonstração Fictícia
            </button>
          </div>
        </div>

        {/* Modal de configuração mesmo quando vazio */}
        {estudoFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
            <form onSubmit={handleSaveEstudo} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
                <h3 className="text-sm font-extrabold">Configurar Estudo de A Sentinela</h3>
                <button type="button" onClick={() => setEstudoFormOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-5">
                <VoiceInput label="Título do Artigo" value={eTitulo} onChange={setETitulo} required />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Dia</label>
                    <select value={eDia} onChange={(e) => setEDia(e.target.value as DiaCongresso)} className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm">
                      {DIAS_CONGRESSO.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Hora Início</label>
                    <input type="time" value={eHora} onChange={(e) => setEHora(e.target.value)} className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Duração (min)</label>
                    <input type="number" min={5} value={eDurMin} onChange={(e) => setEDurMin(Number(e.target.value))} className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm" />
                  </div>
                </div>
                <VoiceInput label="Texto Base" value={eTextoBase} onChange={setETextoBase} />
                <VoiceInput label="Dirigente" value={eDirigente} onChange={setEDirigente} />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEstudoFormOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold">Cancelar</button>
                  <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white">Salvar Estudo</button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CABEÇALHO DO ESTUDO + CRONOGRAMA EM CASCATA */}
      <div className="hc-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <span className="rounded-full bg-[#FFD700] px-2.5 py-0.5 font-black text-slate-950">
                RESUMO DE A SENTINELA
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                {estudo.dia} • {estudo.horaInicio} ({estudo.duracaoPrevistaMin} min)
              </span>
              {estudo.edicaoSemana && <span className="text-slate-500">{estudo.edicaoSemana}</span>}
            </div>
            <h2 className="mt-1.5 text-lg font-extrabold text-slate-900">{estudo.tituloArtigo}</h2>
            {estudo.textoBase && <p className="mt-0.5 text-xs italic text-slate-600">{estudo.textoBase}</p>}
            <p className="mt-1 text-xs text-slate-500">
              <strong>Dirigente:</strong> {estudo.dirigenteNome || 'A definir'}
              {estudo.canticoInicial ? ` • 🎵 ${estudo.canticoInicial}` : ''}
              {estudo.canticoFinal ? ` → ${estudo.canticoFinal}` : ''}
              {estudo.linkArtigoJw && (
                <a
                  href={estudo.linkArtigoJw}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-0.5 font-bold text-sky-700 hover:underline"
                >
                  Artigo <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
          </div>

          <div className="no-print flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOrientacoesModalOpen(true)}
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-950 hover:bg-amber-100"
            >
              📋 Orientações Palco
            </button>
            <button
              type="button"
              onClick={openEstudoForm}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Edit3 className="h-3.5 w-3.5" /> Editar Estudo
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" /> A4
            </button>
          </div>
        </div>

        {/* Barra de Cronograma em Cascata & Auditoria de Alternância */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          <div
            className={`rounded-xl border p-2.5 ${
              schedule.dentroDoTempo ? 'border-emerald-200 bg-emerald-50' : 'border-rose-300 bg-rose-50'
            }`}
          >
            <p className="text-[10px] font-bold uppercase text-slate-500">Cascata Calculada</p>
            <p className="font-mono text-sm font-black text-slate-900">
              {schedule.horaInicioEstudo.slice(0, 5)} → {schedule.horaFimTotal}
            </p>
            <p className={`text-[10px] font-bold ${schedule.dentroDoTempo ? 'text-emerald-800' : 'text-rose-700'}`}>
              Total {formatDurationCompact(schedule.totalSegundos)} (
              {schedule.dentroDoTempo
                ? `folga ${formatDurationCompact(schedule.diferencaSegundos)}`
                : `estouro ${formatDurationCompact(schedule.diferencaSegundos)}`}
              )
            </p>
          </div>

          <div
            className={`rounded-xl border p-2.5 ${
              schedule.conflitosAlternancia === 0 ? 'border-teal-200 bg-teal-50' : 'border-amber-400 bg-amber-50'
            }`}
          >
            <p className="text-[10px] font-bold uppercase text-slate-500">Alternância Palco</p>
            <p className="text-sm font-black text-slate-900">
              {schedule.conflitosAlternancia === 0 ? '✓ Alternado OK' : `⚠️ ${schedule.conflitosAlternancia} repetido(s)`}
            </p>
            <p className="text-[10px] text-slate-600">ESQUERDA ↔ DIREITA</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-[10px] font-bold uppercase text-slate-500">Presença & Ensaio</p>
            <p className="text-sm font-black text-[#1e3a5f]">
              1º Dia: {schedule.presentesDia1}/{schedule.items.length}
            </p>
            <p className="text-[10px] font-bold text-teal-700">
              Ensaio Palco: {schedule.ensaiosFeitos}/{schedule.items.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-[10px] font-bold uppercase text-slate-500">Execução & Imagens A/V</p>
            <p className="text-sm font-black text-slate-900">
              Feitos: {schedule.concluidos}/{schedule.items.length}
            </p>
            <p className="text-[10px] font-bold text-rose-700">
              Imagens A/V: {schedule.comImagemCount}
            </p>
          </div>
        </div>
      </div>

      {/* ====================================================================
       * MODO 1: ESTUDO & ORDEM DE ENTRADA (CASCATA + REORDENAÇÃO + CHAT)
       * ==================================================================== */}
      {mode === 'estudo' && (
        <div className="space-y-4">
          <div className="no-print flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSubtopicoFilter('TODOS')}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  subtopicoFilter === 'TODOS' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Todos ({schedule.items.length})
              </button>
              {subtopicos.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubtopicoFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    subtopicoFilter === s ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={openNewComForm}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#142944]"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              Novo Comentário
            </button>
          </div>

          <div className="print-sheet space-y-2.5">
            {filteredItems.map((sched, index) => {
              const c = sched.comentario;
              const posStyle = POSICAO_PALCO_STYLE[c.posicaoPalco];
              return (
                <div
                  key={c.id}
                  className={`hc-card rounded-2xl border p-3.5 shadow-xs transition ${
                    c.jaFeito
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : sched.alertaLadoRepetido
                        ? 'border-amber-400 bg-amber-50/40'
                        : 'border-slate-200 bg-white hover:border-sky-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    {/* Controles de Ordem + Relógio em Cascata */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1e3a5f] font-mono text-sm font-black text-amber-300">
                        {c.ordenacao}
                      </span>
                      <div className="no-print flex gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0 || subtopicoFilter !== 'TODOS'}
                          onClick={() => moveSentinelaComentario(estudo.id, c.id, 'up')}
                          className="rounded bg-slate-100 p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                          title="Subir na ordem de entrada"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === filteredItems.length - 1 || subtopicoFilter !== 'TODOS'}
                          onClick={() => moveSentinelaComentario(estudo.id, c.id, 'down')}
                          className="rounded bg-slate-100 p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                          title="Descer na ordem de entrada"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Corpo Clicável */}
                    <div
                      onClick={() => setSelectedComentarioId(c.id)}
                      className="min-w-0 flex-1 cursor-pointer space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        <span className="rounded-md bg-[#FFD700] px-2 py-0.5 font-black text-slate-950">
                          {posStyle.label}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-800">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {sched.horaInicioCalc} – {sched.horaFimCalc} ({c.tempoSegundos}s)
                        </span>
                        {c.paragrafos && (
                          <span className="rounded-md bg-sky-100 px-2 py-0.5 text-sky-900">
                            §{c.paragrafos}
                            {c.parteAB ? `(${c.parteAB})` : ''}
                          </span>
                        )}
                        {c.imagemRelacionada && (
                          <span className="rounded-md bg-rose-600 px-2 py-0.5 text-white">
                            👈 EXIBIR IMAGEM
                          </span>
                        )}
                        {sched.alertaLadoRepetido && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-slate-950">
                            <AlertTriangle className="h-3 w-3" /> Mesmo lado do anterior!
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-extrabold text-slate-900">{c.pergunta}</p>

                      {c.comentarioSugerido && (
                        <p className="line-clamp-2 text-xs text-slate-600">
                          <strong>Comentário:</strong> {c.comentarioSugerido}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-bold text-[#1e3a5f]">
                          {c.comentaristaFoto && (
                            <img src={c.comentaristaFoto} alt="" className="h-5 w-5 rounded-full object-cover" />
                          )}
                          {c.comentaristaNome || 'Comentarista pendente'}
                          {c.ehCasal && <span className="rounded bg-teal-100 px-1.5 text-[10px] text-teal-900">Casal</span>}
                        </span>
                        {c.substitutoNome && (
                          <span className="text-[11px] font-semibold text-amber-800">
                            • Sub: {c.substitutoNome}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações Rápidas (1º Dia, Palco, Já Feito) */}
                    <div className="no-print flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
                      <button
                        type="button"
                        onClick={() => updateSentinelaComentario({ ...c, jaFeito: !c.jaFeito }, true)}
                        className={`rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition ${
                          c.jaFeito ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {c.jaFeito ? '✓ Feito' : 'Marcar Feito'}
                      </button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => updateSentinelaComentario({ ...c, presenteDia1: !c.presenteDia1 }, true)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                            c.presenteDia1 ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          1º Dia {c.presenteDia1 ? '✓' : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSentinelaComentario({ ...c, ensaioPalcoFeito: !c.ensaioPalcoFeito }, true)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                            c.ensaioPalcoFeito ? 'bg-teal-100 text-teal-900' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          Palco {c.ensaioPalcoFeito ? '✓' : ''}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Geral "Conversar Com Todos" */}
          <div className="no-print hc-card rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
              <MessageSquare className="h-4 w-4 text-[#1e3a5f]" />
              Conversar Com Todos — Mural do Resumo de A Sentinela ({generalChat.length})
            </h3>
            <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-2.5">
              {generalChat.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-3">Nenhuma mensagem no mural geral.</p>
              ) : (
                generalChat.map((m) => (
                  <div key={m.id} className="rounded-lg bg-white p-2 text-xs border border-slate-200">
                    <div className="flex justify-between">
                      <strong className="text-[#1e3a5f]">{m.autorNome}</strong>
                      <span className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="mt-0.5 text-slate-700">{m.texto}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendGeneralChat} className="flex gap-2">
              <input
                type="text"
                value={generalChatText}
                onChange={(e) => setGeneralChatText(e.target.value)}
                placeholder="Enviar recado para todos os comentaristas e irmãos do Palco..."
                className="min-h-[40px] flex-1 rounded-xl border border-slate-300 px-3 text-xs"
              />
              <button type="submit" className="inline-flex items-center gap-1 rounded-xl bg-[#1e3a5f] px-4 text-xs font-extrabold text-white">
                <Send className="h-3.5 w-3.5" /> Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
       * MODO 2: PALCO, GALERIA DE COMENTARISTAS & MATRIZ DE SUBSTITUIÇÕES
       * ==================================================================== */}
      {mode === 'palco' && (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-amber-400 bg-[#FFD700]/25 p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase text-amber-950">
                🎙️ Lembrete de Palco — Ensaio Geral: {estudo.dia} às 08:30
              </p>
              <p className="text-xs text-slate-700">
                {estudo.observacoesPalco || 'Alternar ESQUERDA ↔ DIREITA; casais entram juntos; comentários breves (~30s).'}
              </p>
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  ['galeria', 'Resumo Galeria'],
                  ['substituicoes', `Substituições (${backupMatrix.length})`],
                  ['orientacoes', 'Orientações Oficiais'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPalcoSubTab(id)}
                  className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                    palcoSubTab === id ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-slate-300 text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {palcoSubTab === 'galeria' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {schedule.items.map((sched) => {
                const c = sched.comentario;
                const posStyle = POSICAO_PALCO_STYLE[c.posicaoPalco];
                return (
                  <div
                    key={c.id}
                    className="hc-card flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
                  >
                    <div className={`${posStyle.bannerBg} flex items-center justify-between px-3.5 py-2 text-xs font-black`}>
                      <span>ORDEM #{c.ordenacao} • {sched.horaInicioCalc.slice(0, 5)}</span>
                      <span>{posStyle.label}</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        {c.comentaristaFoto ? (
                          <img
                            src={c.comentaristaFoto}
                            alt={c.comentaristaNome}
                            className="h-14 w-14 rounded-full object-cover border-2 border-amber-400"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-black text-white">
                            {(c.comentaristaNome || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-extrabold text-slate-900">
                            {c.comentaristaNome || 'A definir'}
                          </h4>
                          <p className="truncate text-xs text-slate-500">{c.comentaristaCongregacao || '—'}</p>
                          <p className="text-[11px] font-bold text-amber-800">
                            {c.ehCasal ? '👫 Casal • ' : ''}§{c.paragrafos || '-'} • {c.tempoSegundos}s
                          </p>
                        </div>
                      </div>

                      {c.substitutoNome && (
                        <p className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
                          Substituto(a): <strong>{c.substitutoNome}</strong>
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateSentinelaComentario({ ...c, presenteDia1: !c.presenteDia1 }, true)}
                          className={`flex-1 rounded-xl py-1.5 text-[11px] font-extrabold ${
                            c.presenteDia1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.presenteDia1 ? '✓ 1º Dia' : '1º Dia?'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSentinelaComentario({ ...c, ensaioPalcoFeito: !c.ensaioPalcoFeito }, true)}
                          className={`flex-1 rounded-xl py-1.5 text-[11px] font-extrabold ${
                            c.ensaioPalcoFeito ? 'bg-teal-700 text-white' : 'bg-amber-100 text-amber-950'
                          }`}
                        >
                          {c.ensaioPalcoFeito ? '✓ Ensaio' : 'Ensaio?'}
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        <a
                          href={buildSentinelaWhatsappUrl(c, estudo, 'comentarista', 'ensaio_domingo')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-[11px] font-extrabold text-white hover:bg-emerald-700"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Convite 8:30
                        </a>
                        <button
                          type="button"
                          onClick={() => setSelectedComentarioId(c.id)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {palcoSubTab === 'substituicoes' && (
            <div className="grid gap-3 md:grid-cols-2">
              {backupMatrix.length === 0 ? (
                <div className="hc-card col-span-2 rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  Nenhum substituto designado nos comentários ainda.
                </div>
              ) : (
                backupMatrix.map((g) => (
                  <div key={g.substitutoNome} className="hc-card rounded-2xl border border-amber-200 bg-white p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{g.substitutoNome}</h4>
                        <p className="text-xs text-slate-500">
                          {g.substitutoCongregacao} {g.substitutoTelefone ? `• ${g.substitutoTelefone}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-950">
                        Cobre {g.comentarios.length} pergunta(s)
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {g.comentarios.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedComentarioId(c.id)}
                          className="cursor-pointer rounded-xl bg-slate-50 p-2.5 text-xs hover:bg-sky-50"
                        >
                          <span className="font-black text-[#1e3a5f]">
                            #{c.ordenacao} ({c.posicaoPalco}) §{c.paragrafos}
                          </span>{' '}
                          — Titular: <strong>{c.comentaristaNome}</strong>
                          <p className="mt-0.5 line-clamp-1 text-slate-600">{c.pergunta}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {palcoSubTab === 'orientacoes' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="hc-card rounded-2xl border border-amber-300 bg-amber-50/50 p-5 space-y-2">
                <h3 className="text-sm font-extrabold uppercase text-amber-950">Dinâmica de Palco</h3>
                <ul className="space-y-2 text-xs text-slate-800">
                  {SENTINELA_ORIENTACOES.palco.map((rule, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-black text-amber-800">{i + 1}.</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hc-card rounded-2xl border border-sky-200 bg-sky-50/50 p-5 space-y-2">
                <h3 className="text-sm font-extrabold uppercase text-[#1e3a5f]">Qualidade dos Comentários</h3>
                <ul className="space-y-2 text-xs text-slate-800">
                  {SENTINELA_ORIENTACOES.comentarios.map((rule, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-black text-[#1e3a5f]">{i + 1}.</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 border-t border-sky-200 pt-2.5 space-y-1">
                  <p className="text-[11px] font-extrabold text-sky-900">Referências de Estudo:</p>
                  {SENTINELA_ORIENTACOES.referencias.map((r) => (
                    <p key={r.codigo} className="text-[11px] text-slate-600">
                      • <strong>{r.codigo}</strong> — {r.tema}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
       * MODO 3: IMAGENS A EXIBIR (DECK A/V COM BANNER VERMELHO "EXIBIR esta imagem")
       * ==================================================================== */}
      {mode === 'imagens' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-rose-600 px-4 py-3 text-white shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-extrabold">
              <ImageIcon className="h-4 w-4" />
              Imagens a Exibir no Telão — Guia Exclusivo Áudio & Vídeo ({imagesItems.length})
            </h3>
            <p className="text-xs text-rose-100">
              Ordenadas exatamente pela sequência de entrada do Resumo de A Sentinela. Clique em qualquer item para editar ou trocar a imagem.
            </p>
          </div>

          {imagesItems.length === 0 ? (
            <div className="hc-card rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Nenhuma imagem vinculada aos comentários deste estudo ainda. Abra um comentário na aba <strong>Estudo</strong> para anexar uma imagem.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {imagesItems.map((sched) => {
                const c = sched.comentario;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedComentarioId(c.id)}
                    className="hc-card cursor-pointer overflow-hidden rounded-2xl border-2 border-rose-300 bg-white shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between bg-rose-600 px-3.5 py-2 text-xs font-black text-white">
                      <span>👈👈👈 EXIBIR esta imagem</span>
                      <span>
                        Ordem #{c.ordenacao} • {sched.horaInicioCalc.slice(0, 5)}
                      </span>
                    </div>
                    <img
                      src={c.imagemRelacionada}
                      alt={c.imagemLegenda || c.pergunta}
                      className="h-52 w-full bg-slate-100 object-contain p-2"
                    />
                    <div className="p-3.5 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        <span className="rounded bg-[#FFD700] px-2 py-0.5 text-slate-950">{c.posicaoPalco}</span>
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-sky-900">§{c.paragrafos}</span>
                        <span className="text-slate-700">{c.comentaristaNome}</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-900">{c.pergunta}</p>
                      {c.imagemLegenda && <p className="text-xs text-rose-800 font-semibold">{c.imagemLegenda}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
       * MODO 4: ÁUDIO COMPLETO (PLAYER SEQUENCIAL DE ENSAIO COM FALLBACK TTS)
       * ==================================================================== */}
      {mode === 'audio' && (
        <div className="space-y-4">
          <div className="hc-card rounded-2xl border-2 border-[#1e3a5f] bg-gradient-to-br from-[#1e3a5f] to-[#0f5e63] p-5 text-white shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-950">
                  ÁUDIO COMPLETO • ENSAIO SEQUENCIAL
                </span>
                <h3 className="mt-1.5 text-lg font-extrabold">
                  Reproduzir Todo o Resumo em Sequência (Pergunta → Comentário → Conectivo)
                </h3>
                <p className="text-xs text-sky-100">
                  Reproduz automaticamente os áudios gravados offline e usa síntese de voz (TTS pt-BR) quando o trecho ainda não tiver gravação!
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isPlayingAll ? (
                  <button
                    type="button"
                    onClick={() => startSequentialPlayer(0)}
                    className="touch-target inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-xs font-black text-slate-950 shadow hover:bg-amber-300"
                  >
                    <Play className="h-4 w-4 fill-current" /> Iniciar Ensaio Completo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopSequentialPlayer}
                    className="touch-target inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-xs font-black text-white shadow hover:bg-rose-600"
                  >
                    <Pause className="h-4 w-4" /> Parar Reprodução
                  </button>
                )}
              </div>
            </div>

            {isPlayingAll && playingIdx >= 0 && schedule.items[playingIdx] && (
              <div className="mt-4 rounded-xl bg-white/15 p-3 text-xs">
                <p className="font-black text-amber-300">
                  ▶ Tocando agora: Ordem #{schedule.items[playingIdx].comentario.ordenacao} — {playingPhase} (
                  {schedule.items[playingIdx].comentario.comentaristaNome})
                </p>
                <p className="mt-0.5 text-white/90">{schedule.items[playingIdx].comentario.pergunta}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {schedule.items.map((sched, idx) => {
              const c = sched.comentario;
              const isCurrent = isPlayingAll && playingIdx === idx;
              const recCount =
                (c.audioPergunta ? 1 : 0) + (c.audioComentario ? 1 : 0) + (c.audioConectivo ? 1 : 0);

              return (
                <div
                  key={c.id}
                  className={`hc-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                    isCurrent ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                      <span className="rounded bg-[#1e3a5f] px-2 py-0.5 font-mono text-amber-300">#{c.ordenacao}</span>
                      <span className="rounded bg-[#FFD700] px-2 py-0.5 text-slate-950">{c.posicaoPalco}</span>
                      <span className="text-slate-700">{c.comentaristaNome}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          recCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {recCount > 0 ? `🎙️ ${recCount}/3 gravado(s)` : '🔊 Modo Voz TTS'}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-extrabold text-slate-900">{c.pergunta}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startSequentialPlayer(idx)}
                      className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800"
                    >
                      <SkipForward className="h-3.5 w-3.5" /> Tocar daqui
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        speakPtBr(`${c.pergunta}. ${c.comentarioSugerido || c.respostaLiteral}`, true)
                      }
                      className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
                      title="Ler em voz alta (TTS)"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedComentarioId(c.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Mic2 className="h-3.5 w-3.5" /> Gravar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DETALHE DO COMENTÁRIO */}
      {selectedScheduled && (
        <SentinelaDetailModal
          scheduled={selectedScheduled}
          estudo={estudo}
          onClose={() => setSelectedComentarioId(null)}
          onNavigate={(nextId) => setSelectedComentarioId(nextId)}
        />
      )}

      {/* MODAL ORIENTAÇÕES OFICIAIS DO RESUMO DE A SENTINELA */}
      {orientacoesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
              <h3 className="text-sm font-extrabold">Orientações — Palco e Comentários (Resumo de A Sentinela)</h3>
              <button type="button" onClick={() => setOrientacoesModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5 text-xs">
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-1.5">
                <h4 className="font-extrabold uppercase text-amber-950">Coreografia de Palco</h4>
                {SENTINELA_ORIENTACOES.palco.map((r, i) => (
                  <p key={i}>
                    <strong>{i + 1}.</strong> {r}
                  </p>
                ))}
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-1.5">
                <h4 className="font-extrabold uppercase text-[#1e3a5f]">Padrão de Comentários</h4>
                {SENTINELA_ORIENTACOES.comentarios.map((r, i) => (
                  <p key={i}>
                    <strong>{i + 1}.</strong> {r}
                  </p>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                <h4 className="font-extrabold uppercase text-slate-700">Referências</h4>
                {SENTINELA_ORIENTACOES.referencias.map((r) => (
                  <p key={r.codigo}>
                    • <strong>{r.codigo}:</strong> {r.tema}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ESTUDO */}
      {estudoFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <form onSubmit={handleSaveEstudo} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
              <h3 className="text-sm font-extrabold">Editar Cabeçalho — Resumo de A Sentinela</h3>
              <button type="button" onClick={() => setEstudoFormOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <VoiceInput label="Título do Artigo" value={eTitulo} onChange={setETitulo} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <VoiceInput label="Edição / Semana" value={eEdicao} onChange={setEEdicao} />
                <VoiceInput label="Dirigente" value={eDirigente} onChange={setEDirigente} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Dia</label>
                  <select value={eDia} onChange={(e) => setEDia(e.target.value as DiaCongresso)} className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm">
                    {DIAS_CONGRESSO.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Hora Início (Cascata)</label>
                  <input type="time" value={eHora} onChange={(e) => setEHora(e.target.value)} className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Duração (min)</label>
                  <input type="number" min={5} value={eDurMin} onChange={(e) => setEDurMin(Number(e.target.value))} className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm" />
                </div>
              </div>
              <VoiceInput label="Texto Base" value={eTextoBase} onChange={setETextoBase} />
              <VoiceInput label="Objetivo" value={eObjetivo} onChange={setEObjetivo} />
              <div className="grid gap-3 sm:grid-cols-2">
                <VoiceInput label="Cântico Inicial" value={eCantIni} onChange={setECantIni} />
                <VoiceInput label="Cântico Final" value={eCantFim} onChange={setECantFim} />
              </div>
              <VoiceInput label="Observações do Palco / Ensaio" value={eObs} onChange={setEObs} />
              <VoiceInput label="Link Artigo (opcional)" value={eLink} onChange={setELink} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEstudoFormOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold">Cancelar</button>
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white">
                  <CheckCircle2 className="h-4 w-4" /> Salvar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ADICIONAR NOVO COMENTÁRIO */}
      {newComFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <form onSubmit={handleCreateComentario} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
              <h3 className="text-sm font-extrabold">Adicionar Comentário (Ordem #{schedule.items.length + 1})</h3>
              <button type="button" onClick={() => setNewComFormOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <VoiceInput label="Subtópico" value={cSubtopico} onChange={setCSubtopico} className="sm:col-span-2" />
                <VoiceInput label="Parágrafos" value={cParagrafos} onChange={setCParagrafos} placeholder="Ex.: 6-7" />
              </div>
              <VoiceInput label="Pergunta" value={cPergunta} onChange={setCPergunta} multiline rows={2} required />
              <VoiceInput label="Comentário Sugerido" value={cComentario} onChange={setCComentario} multiline rows={2} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Lado do Palco</label>
                  <select
                    value={cPosicao}
                    onChange={(e) => setCPosicao(e.target.value as PosicaoPalco)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm font-bold"
                  >
                    {POSICOES_PALCO.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Tempo (seg)</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    step={5}
                    value={cTempoSeg}
                    onChange={(e) => setCTempoSeg(Number(e.target.value))}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <VoiceInput label="Comentarista" value={cComNome} onChange={setCComNome} />
                <VoiceInput label="Substituto(a)" value={cSubNome} onChange={setCSubNome} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNewComFormOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold">Cancelar</button>
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white">
                  <CheckCircle2 className="h-4 w-4" /> Adicionar à Ordem
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  History,
  MessageCircle,
  MessageSquare,
  Mic,
  Phone,
  RotateCcw,
  Save,
  Send,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { POSICOES_PALCO, POSICAO_PALCO_STYLE } from '../../constants/catalog';
import { compressImageFile } from '../../services/photoService';
import {
  buildSentinelaWhatsappUrl,
  type SentinelaScheduledItem,
} from '../../services/sentinelaService';
import { speakPtBr } from '../../services/voiceService';
import { useAppStore } from '../../store/useAppStore';
import type { PosicaoPalco, SentinelaComentario, SentinelaEstudo } from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';

interface SentinelaDetailModalProps {
  scheduled: SentinelaScheduledItem;
  estudo: SentinelaEstudo | null;
  onClose: () => void;
  onNavigate: (comentarioId: string) => void;
}

type AudioSlot = 'audioPergunta' | 'audioComentario' | 'audioConectivo';

export const SentinelaDetailModal: React.FC<SentinelaDetailModalProps> = ({
  scheduled,
  estudo,
  onClose,
  onNavigate,
}) => {
  const {
    db,
    activeEvento,
    updateSentinelaComentario,
    deleteSentinelaComentario,
    backupSentinelaComentario,
    restoreSentinelaComentario,
    addConversaMensagem,
    notify,
  } = useAppStore();

  const c = scheduled.comentario;
  const [innerTab, setInnerTab] = useState<'roteiro' | 'audio' | 'chat'>('roteiro');
  const [draft, setDraft] = useState<SentinelaComentario>(c);
  const [chatText, setChatText] = useState('');

  // MediaRecorder offline audio state
  const [recordingSlot, setRecordingSlot] = useState<AudioSlot | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(c);
  }, [c]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
        mediaRecRef.current.stop();
      }
    };
  }, []);

  const eventVoluntarios = db.voluntarios.filter((v) => !activeEvento || v.eventoId === activeEvento.id);

  const commentMessages = db.conversas.filter(
    (m) => m.contextoTipo === 'sentinela_comentario' && m.contextoId === c.id,
  );

  const saveDraft = (patch?: Partial<SentinelaComentario>, silent = false) => {
    const next = patch ? { ...draft, ...patch } : draft;
    setDraft(next);
    updateSentinelaComentario(next, silent);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const res = await compressImageFile(file, { maxDimension: 900, quality: 0.72 });
      saveDraft({ imagemRelacionada: res.dataUrl });
    } catch {
      notify('Erro ao processar a imagem relacionada.', 'error');
    }
  };

  const startAudioRecording = async (slot: AudioSlot) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      notify('Gravação de áudio não suportada neste navegador. Use o ditado por voz nos campos de texto!', 'warning');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 16000, // Compacto para caber confortavelmente no localStorage!
      });
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result || '');
          const kb = Math.round((dataUrl.length * 0.75) / 1024);
          saveDraft({ [slot]: dataUrl } as Partial<SentinelaComentario>);
          notify(`Áudio gravado (${kb} KB)!`, 'success');
        };
        reader.readAsDataURL(blob);
        setRecordingSlot(null);
        setRecSeconds(0);
      };

      mediaRecRef.current = recorder;
      recorder.start();
      setRecordingSlot(slot);
      setRecSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecSeconds((s) => {
          if (s >= 59) {
            recorder.stop();
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      notify('Permissão de microfone negada ou indisponível.', 'error');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.stop();
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !activeEvento) return;
    addConversaMensagem({
      eventoId: activeEvento.id,
      contextoTipo: 'sentinela_comentario',
      contextoId: c.id,
      autorNome: db.config.operadorPadrao || 'Dirigente',
      texto: chatText.trim(),
    });
    setChatText('');
  };

  const posStyle = POSICAO_PALCO_STYLE[draft.posicaoPalco];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-2 sm:p-4 backdrop-blur-xs">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Top Bar com Anterior / Próximo */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 bg-[#1e3a5f] px-4 py-3 text-white">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!scheduled.anteriorId}
              onClick={() => scheduled.anteriorId && onNavigate(scheduled.anteriorId)}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20 disabled:opacity-30"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              type="button"
              disabled={!scheduled.proximoId}
              onClick={() => scheduled.proximoId && onNavigate(scheduled.proximoId)}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20 disabled:opacity-30"
            >
              Próximo <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remover comentário #${c.ordenacao}?`)) {
                  deleteSentinelaComentario(c.id);
                  onClose();
                }
              }}
              className="rounded-lg bg-rose-500/80 p-1.5 hover:bg-rose-600"
              title="Excluir comentário"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* BANNER DOURADO GIGANTE DE POSIÇÃO NO PALCO (Fiel ao #FFD700 do Glide!) */}
        <div className={`${posStyle.bannerBg} px-5 py-3.5 text-center shadow-inner`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-slate-950/15 px-3 py-1 font-mono text-xs font-black">
              ORDEM #{draft.ordenacao} • §{draft.paragrafos || '-'}
              {draft.parteAB ? ` (${draft.parteAB})` : ''}
            </span>
            <p className="text-xl font-black tracking-wider sm:text-2xl">{posStyle.label}</p>
            <span className="rounded-full bg-slate-950/15 px-3 py-1 font-mono text-xs font-black">
              {scheduled.horaInicioCalc} → {scheduled.horaFimCalc} ({draft.tempoSegundos}s)
            </span>
          </div>
          {scheduled.alertaLadoRepetido && (
            <p className="mt-1.5 rounded-lg bg-rose-600 px-3 py-1 text-xs font-extrabold text-white">
              ⚠️ Atenção: o comentário anterior também está no lado {draft.posicaoPalco}. Recomenda-se alternar ESQUERDA ↔ DIREITA!
            </p>
          )}
        </div>

        {/* Sub-abas do Detalhe */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
          {(
            [
              ['roteiro', 'Roteiro, Palco & Imagem'],
              ['audio', 'Estúdio Áudio & Backup'],
              ['chat', `Conversar Com Todos (${commentMessages.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setInnerTab(id)}
              className={`border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                innerTab === id
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          {innerTab === 'roteiro' && (
            <>
              {/* Botões rápidos de Check-in + Posição de Palco */}
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => saveDraft({ presenteDia1: !draft.presenteDia1 }, true)}
                  className={`touch-target rounded-xl border p-2.5 text-xs font-extrabold transition ${
                    draft.presenteDia1
                      ? 'border-emerald-400 bg-emerald-100 text-emerald-950'
                      : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {draft.presenteDia1 ? '✓ 1º Dia — Já no Local' : 'Confirmar 1º Dia'}
                </button>
                <button
                  type="button"
                  onClick={() => saveDraft({ ensaioPalcoFeito: !draft.ensaioPalcoFeito }, true)}
                  className={`touch-target rounded-xl border p-2.5 text-xs font-extrabold transition ${
                    draft.ensaioPalcoFeito
                      ? 'border-teal-500 bg-teal-600 text-white'
                      : 'border-amber-300 bg-amber-50 text-amber-950'
                  }`}
                >
                  {draft.ensaioPalcoFeito ? '✓ Ensaio Palco Feito' : 'Marcar Ensaio Palco'}
                </button>
                <button
                  type="button"
                  onClick={() => saveDraft({ jaFeito: !draft.jaFeito }, true)}
                  className={`touch-target rounded-xl border p-2.5 text-xs font-extrabold transition ${
                    draft.jaFeito
                      ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                      : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {draft.jaFeito ? '✓ Comentário Já Feito' : 'Marcar Já Feito (Ao Vivo)'}
                </button>
              </div>

              {/* Comentarista + Substituto + Contatos 1-toque */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Lado no Palco</label>
                    <div className="flex gap-1">
                      {POSICOES_PALCO.map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => saveDraft({ posicaoPalco: pos as PosicaoPalco }, true)}
                          className={`flex-1 rounded-lg py-2 text-[10px] font-black transition ${
                            draft.posicaoPalco === pos
                              ? 'bg-[#FFD700] text-slate-950 ring-2 ring-slate-900'
                              : 'bg-white border border-slate-300 text-slate-600'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">Tempo (segundos)</label>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      step={5}
                      value={draft.tempoSegundos}
                      onChange={(e) => setDraft({ ...draft, tempoSegundos: Math.max(10, Number(e.target.value)) })}
                      className="min-h-[38px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"
                    />
                  </div>
                  <div className="flex items-end pb-1.5">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={draft.ehCasal}
                        onChange={(e) => setDraft({ ...draft, ehCasal: e.target.checked })}
                        className="h-4 w-4 accent-[#1e3a5f]"
                      />
                      Casal (entram juntos)
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl bg-white p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase text-[#1e3a5f]">Comentarista Titular</span>
                      {eventVoluntarios.length > 0 && (
                        <select
                          value={draft.comentaristaId ?? ''}
                          onChange={(e) => {
                            const v = eventVoluntarios.find((x) => x.id === e.target.value);
                            if (v) {
                              setDraft({
                                ...draft,
                                comentaristaId: v.id,
                                comentaristaNome: v.nome,
                                comentaristaCongregacao: v.congregacao,
                                comentaristaTelefone: v.telefone,
                                comentaristaFoto: v.foto,
                              });
                            }
                          }}
                          className="max-w-[140px] rounded border border-slate-300 px-1.5 py-0.5 text-[11px]"
                        >
                          <option value="">Escolher Equipe...</option>
                          {eventVoluntarios.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.nome}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <input
                      type="text"
                      value={draft.comentaristaNome}
                      onChange={(e) => setDraft({ ...draft, comentaristaNome: e.target.value })}
                      placeholder="Nome do comentarista"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={draft.comentaristaCongregacao}
                        onChange={(e) => setDraft({ ...draft, comentaristaCongregacao: e.target.value })}
                        placeholder="Congregação"
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={draft.comentaristaTelefone}
                        onChange={(e) => setDraft({ ...draft, comentaristaTelefone: e.target.value })}
                        placeholder="WhatsApp"
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <a
                        href={buildSentinelaWhatsappUrl(draft, estudo, 'comentarista', 'ensaio_domingo')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="h-3 w-3" /> Convite Ensaio 8:30
                      </a>
                      {draft.comentaristaTelefone && (
                        <a
                          href={`tel:${draft.comentaristaTelefone.replace(/\D/g, '')}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-700"
                        >
                          <Phone className="h-3 w-3" /> Ligar
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl bg-amber-50/70 p-3 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase text-amber-900">Substituto(a)</span>
                      {eventVoluntarios.length > 0 && (
                        <select
                          value={draft.substitutoId ?? ''}
                          onChange={(e) => {
                            const v = eventVoluntarios.find((x) => x.id === e.target.value);
                            if (v) {
                              setDraft({
                                ...draft,
                                substitutoId: v.id,
                                substitutoNome: v.nome,
                                substitutoCongregacao: v.congregacao,
                                substitutoTelefone: v.telefone,
                              });
                            }
                          }}
                          className="max-w-[140px] rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[11px]"
                        >
                          <option value="">Escolher Equipe...</option>
                          {eventVoluntarios.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.nome}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <input
                      type="text"
                      value={draft.substitutoNome}
                      onChange={(e) => setDraft({ ...draft, substitutoNome: e.target.value })}
                      placeholder="Nome do substituto"
                      className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={draft.substitutoCongregacao}
                        onChange={(e) => setDraft({ ...draft, substitutoCongregacao: e.target.value })}
                        placeholder="Congregação"
                        className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={draft.substitutoTelefone}
                        onChange={(e) => setDraft({ ...draft, substitutoTelefone: e.target.value })}
                        placeholder="WhatsApp"
                        className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs"
                      />
                    </div>
                    {draft.substitutoNome && (
                      <a
                        href={buildSentinelaWhatsappUrl(draft, estudo, 'substituto', 'ensaio_domingo')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-extrabold text-white hover:bg-amber-700"
                      >
                        <MessageCircle className="h-3 w-3" /> Contatar Substituto
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Roteiro completo (Pergunta, Resposta Literal, Comentário, Texto Bíblico, Conectivo) */}
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <VoiceInput
                    label="Subtópico"
                    value={draft.subtopico}
                    onChange={(v) => setDraft({ ...draft, subtopico: v })}
                    className="sm:col-span-2"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Parágrafo(s)</label>
                      <input
                        type="text"
                        value={draft.paragrafos}
                        onChange={(e) => setDraft({ ...draft, paragrafos: e.target.value })}
                        placeholder="1-2"
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 px-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Parte</label>
                      <select
                        value={draft.parteAB}
                        onChange={(e) => setDraft({ ...draft, parteAB: e.target.value as '' | 'a' | 'b' })}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 px-2 text-sm"
                      >
                        <option value="">—</option>
                        <option value="a">a</option>
                        <option value="b">b</option>
                      </select>
                    </div>
                  </div>
                </div>

                <VoiceInput
                  label="Pergunta do Estudo"
                  value={draft.pergunta}
                  onChange={(v) => setDraft({ ...draft, pergunta: v })}
                  multiline
                  rows={2}
                />
                <VoiceInput
                  label="Resposta Literal (Trecho do Parágrafo)"
                  value={draft.respostaLiteral}
                  onChange={(v) => setDraft({ ...draft, respostaLiteral: v })}
                  multiline
                  rows={2}
                />
                <VoiceInput
                  label="Comentário (Com suas próprias palavras — ~30s)"
                  value={draft.comentarioSugerido}
                  onChange={(v) => setDraft({ ...draft, comentarioSugerido: v })}
                  multiline
                  rows={3}
                  appendMode
                />
                <VoiceInput
                  label="Comentário sobre Texto(s) Bíblico(s)"
                  value={draft.comentarioTextoBiblico}
                  onChange={(v) => setDraft({ ...draft, comentarioTextoBiblico: v })}
                  multiline
                  rows={2}
                  appendMode
                />
                <VoiceInput
                  label="Conectivo para a Próxima Pergunta"
                  value={draft.conectivo}
                  onChange={(v) => setDraft({ ...draft, conectivo: v })}
                  multiline
                  rows={2}
                />
              </div>

              {/* Imagem Relacionada para A/V ("EXIBIR esta imagem") */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase text-rose-900">
                    Imagem Relacionada (Dica para Áudio & Vídeo)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-xl bg-white border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-900 hover:bg-rose-100"
                    >
                      <Camera className="h-3.5 w-3.5" /> {draft.imagemRelacionada ? 'Trocar Imagem' : 'Anexar Imagem'}
                    </button>
                    {draft.imagemRelacionada && (
                      <button
                        type="button"
                        onClick={() => saveDraft({ imagemRelacionada: '', imagemLegenda: '' })}
                        className="rounded-xl bg-rose-100 px-2.5 py-1.5 text-xs font-bold text-rose-700"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>

                {draft.imagemRelacionada && (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-rose-600 px-3 py-1.5 text-center text-xs font-black text-white">
                      👈👈👈 EXIBIR esta imagem no telão durante a Ordem #{draft.ordenacao}
                    </div>
                    <img
                      src={draft.imagemRelacionada}
                      alt={draft.imagemLegenda || 'Imagem do estudo'}
                      className="max-h-56 w-full rounded-xl object-contain bg-white border border-slate-200"
                    />
                    <VoiceInput
                      label="Legenda / Instrução da Imagem"
                      value={draft.imagemLegenda}
                      onChange={(v) => setDraft({ ...draft, imagemLegenda: v })}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => saveDraft()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Alterações
                </button>
              </div>
            </>
          )}

          {/* TAB 2: ESTÚDIO DE ÁUDIO OFFLINE + SALVAR / RECUPERAR BACKUP */}
          {innerTab === 'audio' && (
            <div className="space-y-4">
              {/* Backup Snapshot (Salvar Comentário / Recuperar Comentário) */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-amber-950">
                      <History className="h-4 w-4" />
                      Proteção de Versão (Salvar & Recuperar Comentário)
                    </h4>
                    <p className="text-[11px] text-amber-900">
                      {c.backupSnapshot
                        ? `Última cópia salva em ${new Date(c.backupSnapshot.savedAt).toLocaleString('pt-BR')}.`
                        : 'Salve uma cópia de segurança do comentário e áudio antes de experimentar uma nova gravação.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        saveDraft(undefined, true);
                        backupSentinelaComentario(c.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3 py-2 text-xs font-extrabold text-white hover:bg-[#142944]"
                    >
                      <Save className="h-3.5 w-3.5" /> Salvar Comentário (Backup)
                    </button>
                    <button
                      type="button"
                      disabled={!c.backupSnapshot}
                      onClick={() => {
                        if (window.confirm('Restaurar comentário e áudio da cópia salva?')) {
                          restoreSentinelaComentario(c.id);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500 bg-white px-3 py-2 text-xs font-extrabold text-amber-950 hover:bg-amber-100 disabled:opacity-40"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Recuperar Comentário
                    </button>
                  </div>
                </div>
              </div>

              {/* Gravadores individuais: Pergunta, Comentário, Conectivo */}
              {(
                [
                  ['audioPergunta', '1. Áudio da Pergunta', draft.pergunta],
                  ['audioComentario', '2. Áudio do Comentário', draft.comentarioSugerido],
                  ['audioConectivo', '3. Áudio do Conectivo', draft.conectivo],
                ] as const
              ).map(([slot, title, textFallback]) => {
                const isRec = recordingSlot === slot;
                const audioSrc = draft[slot];
                return (
                  <div key={slot} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
                        <p className="line-clamp-1 text-xs text-slate-500">{textFallback || '(Sem texto)'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => speakPtBr(textFallback || 'Sem texto cadastrado', true)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          title="Ouvir leitura em voz alta (TTS)"
                        >
                          <Volume2 className="h-3.5 w-3.5" /> Ouvir TTS
                        </button>
                        {isRec ? (
                          <button
                            type="button"
                            onClick={stopAudioRecording}
                            className="voice-listening inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-extrabold text-white"
                          >
                            <Square className="h-3.5 w-3.5 fill-current" /> Parar ({recSeconds}s)
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={recordingSlot !== null}
                            onClick={() => startAudioRecording(slot)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-teal-800 disabled:opacity-40"
                          >
                            <Mic className="h-3.5 w-3.5" /> Gravar Áudio
                          </button>
                        )}
                      </div>
                    </div>

                    {audioSrc && (
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
                        <audio controls src={audioSrc} className="h-9 flex-1" />
                        <button
                          type="button"
                          onClick={() => saveDraft({ [slot]: '' } as Partial<SentinelaComentario>)}
                          className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                          title="Apagar gravação"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <p className="text-[11px] text-slate-500">
                💡 Dica: gravações são comprimidas a 16 kbps (máx. 60s) no <code>localStorage</code>. Você também pode usar o
                botão de microfone nos campos de texto na aba <strong>Roteiro</strong> para transcrever ditado em tempo real (substituindo a IA paga do Glide!).
              </p>
            </div>
          )}

          {/* TAB 3: CONVERSAR COM TODOS */}
          {innerTab === 'chat' && (
            <div className="space-y-3">
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {commentMessages.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    <MessageSquare className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
                    Nenhuma anotação ou mensagem ainda para este comentário.
                  </p>
                ) : (
                  commentMessages.map((m) => (
                    <div key={m.id} className="rounded-xl bg-white p-3 shadow-2xs border border-slate-200 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="text-[#1e3a5f]">{m.autorNome}</strong>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700">{m.texto}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Escrever recado para o dirigente / comentarista / palco..."
                  className="min-h-[42px] flex-1 rounded-xl border border-slate-300 px-3 text-xs"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 text-xs font-extrabold text-white hover:bg-[#142944]"
                >
                  <Send className="h-4 w-4" /> Enviar
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Film,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { MIDIA_TIPOS_AV } from '../../constants/catalog';
import { extractTimeHHMM, sortProgramaPartes } from '../../services/presidenciaService';
import { useAppStore } from '../../store/useAppStore';
import type { GuiaAudioVideo, MidiaTipoAV } from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';

export const GuiaAVView: React.FC = () => {
  const { db, activeEvento, createGuiaAV, updateGuiaAV, deleteGuiaAV, notify } = useAppStore();

  const [playMode, setPlayMode] = useState(true);
  const [parteFilter, setParteFilter] = useState<string>('TODAS');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GuiaAudioVideo | null>(null);

  const eventPartes = useMemo(
    () =>
      sortProgramaPartes(
        activeEvento ? db.programaPartes.filter((p) => p.eventoId === activeEvento.id) : db.programaPartes,
      ),
    [db.programaPartes, activeEvento],
  );

  const eventGuias = useMemo(() => {
    const base = activeEvento ? db.guiaAV.filter((g) => g.eventoId === activeEvento.id) : db.guiaAV;
    return base
      .filter((g) => parteFilter === 'TODAS' || g.programaParteId === parteFilter)
      .sort((a, b) => a.secaoSequencia - b.secaoSequencia || a.midiaSequencia - b.midiaSequencia);
  }, [db.guiaAV, activeEvento, parteFilter]);

  const groupedByParte = useMemo(() => {
    const map = new Map<string, GuiaAudioVideo[]>();
    for (const g of eventGuias) {
      const arr = map.get(g.programaParteId) ?? [];
      arr.push(g);
      map.set(g.programaParteId, arr);
    }
    return eventPartes
      .filter((p) => map.has(p.id))
      .map((parte) => ({ parte, items: map.get(parte.id)! }));
  }, [eventGuias, eventPartes]);

  // Form state (com suporte a reusar seção existente ou criar nova — fiel ao Glide!)
  const [fParteId, setFParteId] = useState('');
  const [fSecaoSeq, setFSecaoSeq] = useState(1);
  const [fSecaoTopico, setFSecaoTopico] = useState('');
  const [fSecaoTempo, setFSecaoTempo] = useState(5);
  const [fMidiaTipo, setFMidiaTipo] = useState<MidiaTipoAV>('Vídeo');
  const [fMidiaSeq, setFMidiaSeq] = useState(1);
  const [fMidiaTempoSeg, setFMidiaTempoSeg] = useState(60);
  const [fDicaPlay, setFDicaPlay] = useState('');
  const [fLinkMidia, setFLinkMidia] = useState('');

  const existingSectionsForSelectedParte = useMemo(() => {
    const seen = new Map<string, { seq: number; topico: string; tempo: number }>();
    db.guiaAV
      .filter((g) => g.programaParteId === fParteId)
      .forEach((g) => {
        const key = `${g.secaoSequencia}-${g.secaoTopico}`;
        if (!seen.has(key)) seen.set(key, { seq: g.secaoSequencia, topico: g.secaoTopico, tempo: g.secaoTempoMin });
      });
    return Array.from(seen.values());
  }, [db.guiaAV, fParteId]);

  const openNew = () => {
    setEditing(null);
    const defaultParte = parteFilter !== 'TODAS' ? parteFilter : eventPartes[0]?.id ?? '';
    setFParteId(defaultParte);
    setFSecaoSeq(1);
    setFSecaoTopico('');
    setFSecaoTempo(5);
    setFMidiaTipo('Vídeo');
    setFMidiaSeq(1);
    setFMidiaTempoSeg(60);
    setFDicaPlay('');
    setFLinkMidia('');
    setFormOpen(true);
  };

  const openEdit = (g: GuiaAudioVideo) => {
    setEditing(g);
    setFParteId(g.programaParteId);
    setFSecaoSeq(g.secaoSequencia);
    setFSecaoTopico(g.secaoTopico);
    setFSecaoTempo(g.secaoTempoMin);
    setFMidiaTipo(g.midiaTipo);
    setFMidiaSeq(g.midiaSequencia);
    setFMidiaTempoSeg(g.midiaTempoSeg);
    setFDicaPlay(g.dicaPlay);
    setFLinkMidia(g.linkMidia);
    setFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvento) {
      notify('Selecione um evento primeiro.', 'warning');
      return;
    }
    if (!fParteId || !fDicaPlay.trim()) {
      notify('Selecione a parte e informe a Dica Play.', 'warning');
      return;
    }
    if (editing) {
      updateGuiaAV({
        ...editing,
        programaParteId: fParteId,
        secaoSequencia: Math.max(1, Number(fSecaoSeq) || 1),
        secaoTopico: fSecaoTopico.trim() || 'Seção Geral',
        secaoTempoMin: Math.max(1, Number(fSecaoTempo) || 1),
        midiaTipo: fMidiaTipo,
        midiaSequencia: Math.max(1, Number(fMidiaSeq) || 1),
        midiaTempoSeg: Math.max(1, Number(fMidiaTempoSeg) || 10),
        dicaPlay: fDicaPlay.trim(),
        linkMidia: fLinkMidia.trim(),
      });
      notify('Dica A/V atualizada!', 'success');
    } else {
      createGuiaAV({
        eventoId: activeEvento.id,
        programaParteId: fParteId,
        secaoSequencia: Math.max(1, Number(fSecaoSeq) || 1),
        secaoTopico: fSecaoTopico.trim() || 'Seção Geral',
        secaoTempoMin: Math.max(1, Number(fSecaoTempo) || 1),
        midiaTipo: fMidiaTipo,
        midiaSequencia: Math.max(1, Number(fMidiaSeq) || 1),
        midiaTempoSeg: Math.max(1, Number(fMidiaTempoSeg) || 10),
        dicaPlay: fDicaPlay.trim(),
        linkMidia: fLinkMidia.trim(),
        executado: false,
      });
    }
    setFormOpen(false);
  };

  const resetAllPlayed = () => {
    eventGuias.forEach((g) => {
      if (g.executado) updateGuiaAV({ ...g, executado: false });
    });
    notify('Todos os marcadores de Play foram reiniciados.', 'info');
  };

  const playedCount = eventGuias.filter((g) => g.executado).length;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Guia de Áudio & Vídeo</h2>
          <p className="text-xs text-slate-500">
            Roteiro de mídias por Parte e Seção com <strong>Dica Play</strong> exata e chave <strong>Ativar Play</strong> para operação ao vivo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlayMode((v) => !v)}
            className={`touch-target inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
              playMode ? 'bg-amber-400 text-slate-950 shadow-sm' : 'border border-slate-300 bg-white text-slate-700'
            }`}
          >
            <Play className="h-4 w-4 fill-current" />
            {playMode ? 'Modo Ativar Play: LIGADO' : 'Modo Edição (Play Desligado)'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> Imprimir A4
          </button>
          <button
            type="button"
            onClick={openNew}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#142944]"
          >
            <Plus className="h-4 w-4 text-amber-300" />
            Nova Dica A/V
          </button>
        </div>
      </div>

      {/* Filtro por parte + progresso */}
      <div className="no-print hc-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <select
          value={parteFilter}
          onChange={(e) => setParteFilter(e.target.value)}
          className="min-h-[40px] max-w-full flex-1 rounded-xl border border-slate-300 px-3 text-xs font-semibold sm:max-w-md"
        >
          <option value="TODAS">Todas as Partes do Programa ({eventGuias.length} mídias)</option>
          {eventPartes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.dia} {extractTimeHHMM(p.dataHoraInicioProgramada)} — {p.tema}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">
            Executadas: {playedCount}/{eventGuias.length}
          </span>
          {playedCount > 0 && (
            <button
              type="button"
              onClick={resetAllPlayed}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-2.5 py-1 text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Zerar
            </button>
          )}
        </div>
      </div>

      {groupedByParte.length === 0 ? (
        <div className="hc-card rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          <Film className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Nenhuma entrada no Guia de Áudio e Vídeo para o filtro atual.
        </div>
      ) : (
        <div className="print-sheet space-y-4">
          {groupedByParte.map(({ parte, items }) => (
            <div key={parte.id} className="hc-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1e3a5f] px-4 py-3 text-white">
                <div>
                  <span className="text-[11px] font-bold text-amber-300">
                    {parte.dia} • {extractTimeHHMM(parte.dataHoraInicioProgramada)} ({parte.tempoProgramadoMin} min)
                  </span>
                  <h3 className="text-sm font-extrabold">{parte.tema}</h3>
                </div>
                <span className="text-xs font-semibold text-sky-200">
                  Orador: {parte.oradorNome || 'A definir'}
                </span>
              </div>

              <div className="divide-y divide-slate-100 p-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 transition ${
                      item.executado ? 'bg-emerald-50/70' : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-800">
                          Seção {item.secaoSequencia}: {item.secaoTopico} ({item.secaoTempoMin}m)
                        </span>
                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-900">
                          Mídia #{item.midiaSequencia} • {item.midiaTipo} ({item.midiaTempoSeg}s)
                        </span>
                        {item.linkMidia && (
                          <a
                            href={item.linkMidia}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                          >
                            Abrir Mídia <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
                        🎬 DICA PLAY: {item.dicaPlay}
                      </p>
                    </div>

                    <div className="no-print flex items-center gap-1.5">
                      {playMode ? (
                        <button
                          type="button"
                          onClick={() => updateGuiaAV({ ...item, executado: !item.executado })}
                          className={`touch-target inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                            item.executado
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                          }`}
                        >
                          {item.executado ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                          {item.executado ? 'EXECUTADO' : 'DAR PLAY'}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
                            title="Editar"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => window.confirm('Excluir dica A/V?') && deleteGuiaAV(item.id)}
                            className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <form onSubmit={handleSave} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
              <h3 className="text-sm font-extrabold">{editing ? 'Editar Dica A/V' : 'Nova Entrada — Guia Áudio & Vídeo'}</h3>
              <button type="button" onClick={() => setFormOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3.5 p-5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Parte do Programa *</label>
                <select
                  value={fParteId}
                  onChange={(e) => setFParteId(e.target.value)}
                  required
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="">Selecione...</option>
                  {eventPartes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.dia} {extractTimeHHMM(p.dataHoraInicioProgramada)} — {p.tema}
                    </option>
                  ))}
                </select>
              </div>

              {existingSectionsForSelectedParte.length > 0 && (
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-2.5 text-xs">
                  <p className="font-bold text-sky-900 mb-1">Reusar seção já criada nesta parte:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {existingSectionsForSelectedParte.map((s) => (
                      <button
                        key={`${s.seq}-${s.topico}`}
                        type="button"
                        onClick={() => {
                          setFSecaoSeq(s.seq);
                          setFSecaoTopico(s.topico);
                          setFSecaoTempo(s.tempo);
                        }}
                        className="rounded-lg bg-white border border-sky-300 px-2.5 py-1 font-bold text-sky-900 hover:bg-sky-100"
                      >
                        Seção {s.seq}: {s.topico} ({s.tempo}m)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Seção Seq.</label>
                  <input
                    type="number"
                    min={1}
                    value={fSecaoSeq}
                    onChange={(e) => setFSecaoSeq(Number(e.target.value))}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <VoiceInput label="Tópico da Seção" value={fSecaoTopico} onChange={setFSecaoTopico} placeholder="Ex.: Aplicação Prática" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Tipo Mídia</label>
                  <select
                    value={fMidiaTipo}
                    onChange={(e) => setFMidiaTipo(e.target.value as MidiaTipoAV)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-2 text-sm"
                  >
                    {MIDIA_TIPOS_AV.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Seq. Mídia</label>
                  <input
                    type="number"
                    min={1}
                    value={fMidiaSeq}
                    onChange={(e) => setFMidiaSeq(Number(e.target.value))}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Duração (seg)</label>
                  <input
                    type="number"
                    min={1}
                    value={fMidiaTempoSeg}
                    onChange={(e) => setFMidiaTempoSeg(Number(e.target.value))}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Tempo Seção (m)</label>
                  <input
                    type="number"
                    min={1}
                    value={fSecaoTempo}
                    onChange={(e) => setFSecaoTempo(Number(e.target.value))}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-2 text-sm"
                  />
                </div>
              </div>

              <VoiceInput
                label="Dica Play (Deixa exata para o operador)"
                value={fDicaPlay}
                onChange={setFDicaPlay}
                multiline
                rows={2}
                required
                placeholder='Ex.: Quando o orador disser "Vejamos este vídeo..."'
              />
              <VoiceInput label="Link da Mídia (opcional)" value={fLinkMidia} onChange={setFLinkMidia} placeholder="https://..." />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Dica
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

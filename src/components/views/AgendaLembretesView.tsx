import React, { useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Plus,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { CATEGORIAS_DOCUMENTO_REF, PRESIDENCIA_AUDIENCIAS } from '../../constants/catalog';
import { extractTimeHHMM } from '../../services/presidenciaService';
import { useAppStore } from '../../store/useAppStore';
import type { AudienciaLembrete, CategoriaDocumentoRef } from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';

export const AgendaLembretesView: React.FC = () => {
  const {
    db,
    activeEvento,
    createLembrete,
    toggleLembreteConcluido,
    deleteLembrete,
    createReferencia,
    deleteReferencia,
    notify,
  } = useAppStore();

  const [subTab, setSubTab] = useState<'agenda' | 'lembretes' | 'documentos'>('agenda');
  const [audienciaFilter, setAudienciaFilter] = useState<AudienciaLembrete | 'TODAS'>('TODAS');
  const [lemFormOpen, setLemFormOpen] = useState(false);
  const [refFormOpen, setRefFormOpen] = useState(false);

  const opName = db.config.operadorPadrao || 'Operador';

  const eventLembretes = useMemo(() => {
    const base = activeEvento ? db.lembretes.filter((l) => l.eventoId === activeEvento.id) : db.lembretes;
    return base
      .filter((l) => (subTab === 'agenda' ? l.ehAgenda : !l.ehAgenda))
      .filter((l) => audienciaFilter === 'TODAS' || l.audiencia === audienciaFilter || l.audiencia === 'Todos')
      .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
  }, [db.lembretes, activeEvento, subTab, audienciaFilter]);

  const eventRefs = useMemo(
    () => (activeEvento ? db.referencias.filter((r) => r.eventoId === activeEvento.id) : db.referencias),
    [db.referencias, activeEvento],
  );

  // Form Lembrete/Agenda
  const [lEhAgenda, setLEhAgenda] = useState(true);
  const [lTitulo, setLTitulo] = useState('');
  const [lDesc, setLDesc] = useState('');
  const [lInicio, setLInicio] = useState(`${activeEvento?.data || new Date().toISOString().slice(0, 10)}T08:30`);
  const [lFim, setLFim] = useState(`${activeEvento?.data || new Date().toISOString().slice(0, 10)}T09:00`);
  const [lAudiencia, setLAudiencia] = useState<AudienciaLembrete>('Todos');
  const [lParteId, setLParteId] = useState('');

  // Form Documento Referência
  const [rCodigo, setRCodigo] = useState('');
  const [rTitulo, setRTitulo] = useState('');
  const [rCategoria, setRCategoria] = useState<CategoriaDocumentoRef>('Presidência');
  const [rDesc, setRDesc] = useState('');
  const [rLink, setRLink] = useState('');

  const handleSaveLembrete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvento || !lTitulo.trim()) {
      notify('Preencha o título.', 'warning');
      return;
    }
    createLembrete({
      eventoId: activeEvento.id,
      ehAgenda: lEhAgenda,
      titulo: lTitulo.trim(),
      descricao: lDesc.trim(),
      dataHoraInicio: lInicio,
      dataHoraFim: lFim,
      visivelDesde: lInicio,
      visivelAte: lFim,
      audiencia: lAudiencia,
      programaParteId: lParteId || undefined,
      concluidoPorOperadores: [],
    });
    setLTitulo('');
    setLDesc('');
    setLemFormOpen(false);
  };

  const handleSaveRef = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvento || !rCodigo.trim() || !rTitulo.trim()) {
      notify('Informe código e título do documento.', 'warning');
      return;
    }
    createReferencia({
      eventoId: activeEvento.id,
      codigo: rCodigo.trim().toUpperCase(),
      titulo: rTitulo.trim(),
      categoria: rCategoria,
      descricao: rDesc.trim(),
      linkUrl: rLink.trim(),
      observacoes: '',
    });
    setRCodigo('');
    setRTitulo('');
    setRDesc('');
    setRLink('');
    setRefFormOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Agenda, Lembretes & Documentos</h2>
          <p className="text-xs text-slate-500">
            Compromissos/ensaios agendados, avisos filtrados por perfil (7 audiências RBAC) e formulários de referência.
          </p>
        </div>
        <div className="flex gap-2">
          {subTab !== 'documentos' ? (
            <button
              type="button"
              onClick={() => {
                setLEhAgenda(subTab === 'agenda');
                setLemFormOpen(true);
              }}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#142944]"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              {subTab === 'agenda' ? 'Novo Evento Agenda' : 'Novo Lembrete'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRefFormOpen(true)}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#142944]"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              Novo Documento
            </button>
          )}
        </div>
      </div>

      {/* Sub-abas */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['agenda', 'Agenda & Ensaios', Calendar],
            ['lembretes', 'Lembretes (Já Lido e Feito)', Bell],
            ['documentos', 'Documentos / Referências', FileText],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
              subTab === id ? 'bg-[#1e3a5f] text-white shadow-xs' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className={`h-4 w-4 ${subTab === id ? 'text-amber-300' : 'text-slate-500'}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Filtro de Audiência RBAC */}
      {subTab !== 'documentos' && (
        <div className="hc-card flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mr-1">
            <Shield className="h-3.5 w-3.5" /> Perfil:
          </span>
          {(['TODAS', ...PRESIDENCIA_AUDIENCIAS] as const).map((aud) => (
            <button
              key={aud}
              type="button"
              onClick={() => setAudienciaFilter(aud)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                audienciaFilter === aud ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {aud === 'TODAS' ? 'Todos os Perfis' : aud}
            </button>
          ))}
        </div>
      )}

      {/* Conteúdo Agenda / Lembretes */}
      {subTab !== 'documentos' ? (
        eventLembretes.length === 0 ? (
          <div className="hc-card rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
            Nenhum item nesta aba para o perfil selecionado.
          </div>
        ) : (
          <div className="space-y-2.5">
            {eventLembretes.map((l) => {
              const done = l.concluidoPorOperadores.includes(opName);
              const parte = l.programaParteId ? db.programaPartes.find((p) => p.id === l.programaParteId) : null;
              return (
                <div
                  key={l.id}
                  className={`hc-card flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-4 shadow-xs ${
                    done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-900">{l.audiencia}</span>
                      {l.dataHoraInicio && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                          {l.dataHoraInicio.replace('T', ' ')}
                          {l.dataHoraFim ? ` → ${extractTimeHHMM(l.dataHoraFim)}` : ''}
                        </span>
                      )}
                      {parte && (
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-sky-900">
                          Parte: {parte.tema}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm font-extrabold ${done ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {l.titulo}
                    </h3>
                    {l.descricao && <p className="text-xs text-slate-600">{l.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLembreteConcluido(l.id)}
                      className={`touch-target inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                        done ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {done ? 'Já Lido e Feito' : 'Marcar Feito'}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.confirm('Excluir este registro?') && deleteLembrete(l.id)}
                      className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Documentos / Referências */
        <div className="grid gap-3 md:grid-cols-2">
          {eventRefs.map((r) => (
            <div key={r.id} className="hc-card flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-[#1e3a5f] px-2.5 py-1 font-mono text-xs font-black text-amber-300">
                      {r.codigo}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {r.categoria}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.confirm(`Remover ${r.codigo}?`) && deleteReferencia(r.id)}
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h3 className="mt-2 text-sm font-extrabold text-slate-900">{r.titulo}</h3>
                {r.descricao && <p className="mt-1 text-xs text-slate-600">{r.descricao}</p>}
              </div>
              {r.linkUrl && (
                <a
                  href={r.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-sky-700 hover:underline"
                >
                  Abrir Documento <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Lembrete/Agenda */}
      {lemFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <form onSubmit={handleSaveLembrete} className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
              <h3 className="text-sm font-extrabold">{lEhAgenda ? 'Novo Evento na Agenda' : 'Novo Lembrete'}</h3>
              <button type="button" onClick={() => setLemFormOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <VoiceInput label="Título" value={lTitulo} onChange={setLTitulo} required />
              <VoiceInput label="Descrição" value={lDesc} onChange={setLDesc} multiline rows={2} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Início</label>
                  <input
                    type="datetime-local"
                    value={lInicio}
                    onChange={(e) => setLInicio(e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Fim</label>
                  <input
                    type="datetime-local"
                    value={lFim}
                    onChange={(e) => setLFim(e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Público / Perfil</label>
                  <select
                    value={lAudiencia}
                    onChange={(e) => setLAudiencia(e.target.value as AudienciaLembrete)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {PRESIDENCIA_AUDIENCIAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Vincular Parte (opc.)</label>
                  <select
                    value={lParteId}
                    onChange={(e) => setLParteId(e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    <option value="">Nenhuma</option>
                    {db.programaPartes
                      .filter((p) => !activeEvento || p.eventoId === activeEvento.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.dia} {extractTimeHHMM(p.dataHoraInicioProgramada)} — {p.tema}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setLemFormOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold">
                  Cancelar
                </button>
                <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white">
                  Salvar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Documento Referência */}
      {refFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <form onSubmit={handleSaveRef} className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
              <h3 className="text-sm font-extrabold">Novo Documento de Referência</h3>
              <button type="button" onClick={() => setRefFormOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <VoiceInput label="Código (ex.: CO-10, S-329)" value={rCodigo} onChange={setRCodigo} required />
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Categoria</label>
                  <select
                    value={rCategoria}
                    onChange={(e) => setRCategoria(e.target.value as CategoriaDocumentoRef)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {CATEGORIAS_DOCUMENTO_REF.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <VoiceInput label="Título" value={rTitulo} onChange={setRTitulo} required />
              <VoiceInput label="Resumo / Orientações" value={rDesc} onChange={setRDesc} multiline rows={2} />
              <VoiceInput label="Link (opcional)" value={rLink} onChange={setRLink} placeholder="https://..." />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRefFormOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold">
                  Cancelar
                </button>
                <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white">
                  Salvar Documento
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

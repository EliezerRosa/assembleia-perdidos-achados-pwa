import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { EventoParte } from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';

interface DashboardEventsViewProps {
  forceOpenNewForm?: boolean;
  onResetForceOpen?: () => void;
}

export const DashboardEventsView: React.FC<DashboardEventsViewProps> = ({
  forceOpenNewForm,
  onResetForceOpen,
}) => {
  const {
    db,
    activeEvento,
    setActiveEvento,
    setActiveTab,
    createEvento,
    deleteEvento,
    loadDemoData,
    getNextTagForEvent,
  } = useAppStore();

  const [showCreate, setShowCreate] = useState(false);
  const [tipo, setTipo] = useState<string>('Assembleia');
  const [customTipo, setCustomTipo] = useState('');
  const [codigo, setCodigo] = useState('ES-005.27.1');
  const [circuito, setCircuito] = useState('ES-005');
  const [parte, setParte] = useState<EventoParte>('B');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [local, setLocal] = useState('Salão de Assembleias — Guarapari/ES');
  const [superintendente, setSuperintendente] = useState('');
  const [ajudantes, setAjudantes] = useState('');
  const [volNec, setVolNec] = useState(5);
  const [volUsados, setVolUsados] = useState(5);

  const isFormOpen = showCreate || Boolean(forceOpenNewForm) || db.eventos.length === 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const tipoFinal = customTipo.trim() || tipo;
    if (!codigo.trim() || !data) return;
    createEvento({
      tipo: tipoFinal,
      codigo: codigo.trim(),
      circuito: circuito.trim() || 'ES-005',
      parte,
      data,
      local: local.trim() || 'Salão de Assembleias',
      superintendente: superintendente.trim(),
      ajudantes: ajudantes.trim(),
      voluntariosNecessarios: volNec,
      voluntariosUsados: volUsados,
      status: 'ativo',
    });
    setShowCreate(false);
    onResetForceOpen?.();
    setActiveTab('itens');
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hc-card relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1e3a5f] via-[#1b496b] to-teal-700 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              Departamento de Achados & Perdidos • Guarda-Volumes
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Gestão de Eventos & Custódia
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-sky-100">
              Selecione um evento existente ou inicie uma nova Assembleia / Congresso com numeração automática de
              etiquetas gêmeas, registro Foto • Etiqueta • Foto e rastreio completo offline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {db.eventos.length === 0 && (
              <button
                type="button"
                onClick={loadDemoData}
                className="touch-target inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/25 backdrop-blur-xs transition"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                Carregar Demonstração
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('sincronizar')}
              className="touch-target inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm hover:bg-amber-300 transition"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importar Planilha Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Evento Ativo - Acesso Rápido (inspirado no botão verde "ENTRAR" do vídeo Glide) */}
      {activeEvento && (
        <div className="hc-card flex flex-col justify-between gap-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/70 p-4 shadow-xs sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Evento Selecionado Agora</p>
            <h3 className="mt-0.5 text-lg font-extrabold text-slate-900">
              {activeEvento.tipo} • {activeEvento.codigo} | {activeEvento.data.split('-').reverse().join('/')}
            </h3>
            <p className="mt-1 text-xs font-semibold text-emerald-900">
              Próxima etiqueta livre: <span className="rounded bg-emerald-700 px-2 py-0.5 text-white">#{getNextTagForEvent(activeEvento.id).codigo}</span>
              {' • '}
              {db.itens.filter((i) => i.eventoId === activeEvento.id).length} itens cadastrados neste evento
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('itens')}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
          >
            ENTRAR NO EVENTO
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Lista de Eventos */}
        <div className="space-y-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">
              Eventos Registrados ({db.eventos.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#152c4a]"
            >
              <Plus className="h-4 w-4" />
              Novo Evento
            </button>
          </div>

          {db.eventos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-700">Nenhum evento cadastrado neste dispositivo ainda.</p>
              <p className="mt-1 text-xs text-slate-500">
                Crie um novo evento ao lado, importe sua planilha <strong>Perdidos e Achados (Guarda-Volumes).xlsx</strong> ou carregue a demonstração.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {db.eventos.map((ev) => {
                const evItens = db.itens.filter((i) => i.eventoId === ev.id);
                const guardados = evItens.filter((i) => i.status === 'Ainda Guardado' || i.status === 'Em Conferência').length;
                const entregues = evItens.filter((i) => i.status === 'Já Entregue').length;
                const despachados = evItens.filter((i) => i.status === 'DESPACHADO').length;
                const selected = activeEvento?.id === ev.id;

                return (
                  <div
                    key={ev.id}
                    className={`hc-card rounded-2xl border p-4 transition ${
                      selected
                        ? 'border-sky-500 bg-white ring-2 ring-sky-500/20 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900">
                            {ev.tipo}
                          </span>
                          <span className="text-base font-extrabold text-slate-900">{ev.codigo}</span>
                          {ev.parte && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                              Parte {ev.parte}
                            </span>
                          )}
                          {selected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" /> Ativo
                            </span>
                          )}
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {ev.data.split('-').reverse().join('/')}
                          </span>
                          {ev.local && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {ev.local}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {ev.voluntariosUsados} vol.
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-bold text-slate-800">
                            Total: {evItens.length}
                          </span>
                          <span className="rounded-lg bg-amber-100 px-2.5 py-1 font-bold text-amber-900">
                            Guardados: {guardados}
                          </span>
                          <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-bold text-emerald-900">
                            Entregues: {entregues}
                          </span>
                          {despachados > 0 && (
                            <span className="rounded-lg bg-slate-200 px-2.5 py-1 font-bold text-slate-700">
                              Despachados: {despachados}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveEvento(ev.id);
                            setActiveTab('itens');
                          }}
                          className="touch-target rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#142944]"
                        >
                          Abrir
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remover o evento "${ev.codigo}" e seus ${evItens.length} itens deste dispositivo?`,
                              )
                            ) {
                              deleteEvento(ev.id);
                            }
                          }}
                          className="flex h-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          title="Excluir evento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulário Novo Evento (espelho modernizado da tela EVENTO do Glide) */}
        <div className="lg:col-span-5">
          {isFormOpen && (
            <form
              onSubmit={handleCreate}
              className="hc-card space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Criar Novo Evento</h3>
                <p className="text-xs text-slate-500">
                  Padrão de código usado no circuito: ex. <code className="rounded bg-slate-100 px-1">ES-005.27.1</code> ou{' '}
                  <code className="rounded bg-slate-100 px-1">CO-2027</code>.
                </p>
              </div>

              {/* Preview verde estilo Glide */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-extrabold text-emerald-900">
                {(customTipo.trim() || tipo) || 'Evento'} | {codigo || 'Código'} |{' '}
                {data ? data.split('-').reverse().join('/') : '--/--/----'}
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Tipo do Evento *
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {['Assembleia', 'Congresso', 'Reunião Especial'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTipo(t);
                        setCustomTipo('');
                      }}
                      className={`touch-target rounded-xl border px-2 py-2 text-xs font-bold transition ${
                        tipo === t && !customTipo
                          ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={customTipo}
                  onChange={(e) => setCustomTipo(e.target.value)}
                  placeholder="Ou digite um tipo personalizado..."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <VoiceInput
                  label="Código do Evento"
                  required
                  value={codigo}
                  onChange={setCodigo}
                  placeholder="ES-005.27.1"
                />
                <VoiceInput
                  label="Circuito"
                  value={circuito}
                  onChange={setCircuito}
                  placeholder="ES-005"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Data do Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Parte (Relatório)
                  </label>
                  <select
                    value={parte}
                    onChange={(e) => setParte(e.target.value as EventoParte)}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-600 focus:outline-none"
                  >
                    <option value="">Não aplicável</option>
                    <option value="A">Parte A</option>
                    <option value="B">Parte B</option>
                    <option value="Única">Única</option>
                  </select>
                </div>
              </div>

              <VoiceInput label="Local" value={local} onChange={setLocal} placeholder="Salão de Assembleias..." />

              <div className="grid grid-cols-2 gap-3">
                <VoiceInput
                  label="Superintendente Depto."
                  value={superintendente}
                  onChange={setSuperintendente}
                  placeholder="Nome"
                />
                <VoiceInput label="Ajudantes" value={ajudantes} onChange={setAjudantes} placeholder="Nomes" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Vol. Necessários</label>
                  <input
                    type="number"
                    min={1}
                    value={volNec}
                    onChange={(e) => setVolNec(Number(e.target.value))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Vol. Usados</label>
                  <input
                    type="number"
                    min={0}
                    value={volUsados}
                    onChange={(e) => setVolUsados(Number(e.target.value))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700 transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                Criar e Entrar no Evento
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Edit3,
  MessageCircle,
  Mic2,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { PARTICIPACAO_TIPOS } from '../../constants/catalog';
import { extractTimeHHMM, normalizePhoneForWhatsapp, sortProgramaPartes } from '../../services/presidenciaService';
import { useAppStore } from '../../store/useAppStore';
import type { ParticipacaoPrograma, TipoParticipacao } from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';

export const ParticipacoesDemosView: React.FC = () => {
  const {
    db,
    activeEvento,
    createParticipacao,
    updateParticipacao,
    deleteParticipacao,
    notify,
  } = useAppStore();

  const [tipoFilter, setTipoFilter] = useState<TipoParticipacao | 'TODOS'>('TODOS');
  const [onlyPending, setOnlyPending] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ParticipacaoPrograma | null>(null);

  const eventPartes = useMemo(
    () =>
      sortProgramaPartes(
        activeEvento ? db.programaPartes.filter((p) => p.eventoId === activeEvento.id) : db.programaPartes,
      ),
    [db.programaPartes, activeEvento],
  );

  const eventVoluntarios = useMemo(
    () => (activeEvento ? db.voluntarios.filter((v) => v.eventoId === activeEvento.id) : db.voluntarios),
    [db.voluntarios, activeEvento],
  );

  const eventParticipacoes = useMemo(() => {
    const base = activeEvento
      ? db.participacoes.filter((p) => p.eventoId === activeEvento.id)
      : db.participacoes;
    return base.filter((p) => {
      if (tipoFilter !== 'TODOS' && p.tipoParticipacao !== tipoFilter) return false;
      if (onlyPending && p.ensaioConfirmado) return false;
      return true;
    });
  }, [db.participacoes, activeEvento, tipoFilter, onlyPending]);

  // Form state
  const [fParteId, setFParteId] = useState('');
  const [fVolId, setFVolId] = useState('');
  const [fNome, setFNome] = useState('');
  const [fCong, setFCong] = useState('');
  const [fTel, setFTel] = useState('');
  const [fTipo, setFTipo] = useState<TipoParticipacao>('Demonstração');
  const [fDesc, setFDesc] = useState('');
  const [fOrient, setFOrient] = useState('');
  const [fDiaHora, setFDiaHora] = useState('');

  const openNew = () => {
    setEditing(null);
    setFParteId(eventPartes[0]?.id ?? '');
    setFVolId('');
    setFNome('');
    setFCong('');
    setFTel('');
    setFTipo('Demonstração');
    setFDesc('');
    setFOrient('');
    setFDiaHora(`${activeEvento?.data || new Date().toISOString().slice(0, 10)}T08:15`);
    setFormOpen(true);
  };

  const openEdit = (p: ParticipacaoPrograma) => {
    setEditing(p);
    setFParteId(p.programaParteId);
    setFVolId(p.voluntarioId ?? '');
    setFNome(p.participanteNome);
    setFCong(p.participanteCongregacao);
    setFTel(p.participanteTelefone);
    setFTipo(p.tipoParticipacao);
    setFDesc(p.descricao);
    setFOrient(p.orientacoes);
    setFDiaHora(p.diaHoraEnsaio);
    setFormOpen(true);
  };

  const handlePickVol = (volId: string) => {
    setFVolId(volId);
    const v = eventVoluntarios.find((x) => x.id === volId);
    if (!v) return;
    setFNome(v.nome);
    setFCong(v.congregacao);
    setFTel(v.telefone);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvento) {
      notify('Crie ou selecione um evento primeiro.', 'warning');
      return;
    }
    if (!fParteId || !fNome.trim()) {
      notify('Selecione a parte do programa e informe o participante.', 'warning');
      return;
    }
    if (editing) {
      updateParticipacao({
        ...editing,
        programaParteId: fParteId,
        voluntarioId: fVolId || undefined,
        participanteNome: fNome.trim(),
        participanteCongregacao: fCong.trim(),
        participanteTelefone: fTel.trim(),
        tipoParticipacao: fTipo,
        descricao: fDesc.trim(),
        orientacoes: fOrient.trim(),
        diaHoraEnsaio: fDiaHora,
      });
      notify('Participação atualizada!', 'success');
    } else {
      createParticipacao({
        eventoId: activeEvento.id,
        programaParteId: fParteId,
        voluntarioId: fVolId || undefined,
        participanteNome: fNome.trim(),
        participanteCongregacao: fCong.trim(),
        participanteTelefone: fTel.trim(),
        tipoParticipacao: fTipo,
        descricao: fDesc.trim(),
        orientacoes: fOrient.trim(),
        diaHoraEnsaio: fDiaHora,
        presenteDia1: false,
        ensaioConfirmado: false,
      });
    }
    setFormOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Participantes de Demonstrações & Entrevistas</h2>
          <p className="text-xs text-slate-500">
            Espelho de <code>Programa Parte</code>: Experiências, Demonstrações, Encenações, Entrevistas e ensaios de palco.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#142944]"
        >
          <Plus className="h-4 w-4 text-amber-300" />
          Nova Participação
        </button>
      </div>

      {/* Filtros */}
      <div className="hc-card flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-1.5">
          {(['TODOS', ...PARTICIPACAO_TIPOS] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                tipoFilter === t ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t === 'TODOS' ? 'Todos os Tipos' : t}
            </button>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
            className="h-4 w-4 accent-amber-600"
          />
          Somente ensaios pendentes
        </label>
      </div>

      {eventParticipacoes.length === 0 ? (
        <div className="hc-card rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Nenhuma participação cadastrada para os filtros atuais.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {eventParticipacoes.map((p) => {
            const parte = eventPartes.find((x) => x.id === p.programaParteId);
            const phone = normalizePhoneForWhatsapp(p.participanteTelefone);
            const waMsg = encodeURIComponent(
              `Olá ${p.participanteNome}! Lembrete sobre sua participação (${p.tipoParticipacao}) na parte "${parte?.tema ?? ''}" (${parte?.dia ?? ''} às ${parte ? extractTimeHHMM(parte.dataHoraInicioProgramada) : ''}). Ensaio: ${p.diaHoraEnsaio.replace('T', ' ')}. ${p.orientacoes}`,
            );

            return (
              <div key={p.id} className="hc-card flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-teal-900">
                        {p.tipoParticipacao}
                      </span>
                      <h3 className="mt-1 text-base font-extrabold text-slate-900">{p.participanteNome}</h3>
                      <p className="text-xs text-slate-500">
                        {p.participanteCongregacao || 'Sem congregação'}
                        {p.participanteTelefone ? ` • ${p.participanteTelefone}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
                        title="Editar"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => window.confirm('Remover participação?') && deleteParticipacao(p.id)}
                        className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {parte && (
                    <div className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-xs">
                      <p className="font-extrabold text-[#1e3a5f]">
                        {parte.dia} • {extractTimeHHMM(parte.dataHoraInicioProgramada)} — {parte.tema}
                      </p>
                      <p className="text-[11px] text-slate-600">Orador: {parte.oradorNome || 'A definir'}</p>
                    </div>
                  )}

                  {p.descricao && <p className="text-xs text-slate-700">{p.descricao}</p>}
                  {p.orientacoes && (
                    <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] font-semibold text-amber-950">
                      📋 Orientações de Palco: {p.orientacoes}
                    </p>
                  )}
                  {p.diaHoraEnsaio && (
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-[#1e3a5f]" />
                      Ensaio agendado: {p.diaHoraEnsaio.replace('T', ' às ')}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateParticipacao({ ...p, presenteDia1: !p.presenteDia1 })}
                      className={`rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                        p.presenteDia1 ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.presenteDia1 ? '✓ 1º Dia OK' : '1º Dia?'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParticipacao({ ...p, ensaioConfirmado: !p.ensaioConfirmado })}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                        p.ensaioConfirmado ? 'bg-teal-600 text-white' : 'bg-amber-100 text-amber-950'
                      }`}
                    >
                      <Mic2 className="h-3 w-3" />
                      {p.ensaioConfirmado ? 'Ensaio Feito' : 'Marcar Ensaio'}
                    </button>
                  </div>
                  <a
                    href={phone ? `https://wa.me/${phone}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <form onSubmit={handleSave} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
              <h3 className="text-sm font-extrabold">{editing ? 'Editar Participação' : 'Nova Participação no Programa'}</h3>
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
                  <option value="">Selecione a parte...</option>
                  {eventPartes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.dia} {extractTimeHHMM(p.dataHoraInicioProgramada)} — {p.tema}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Tipo de Participação</label>
                  <select
                    value={fTipo}
                    onChange={(e) => setFTipo(e.target.value as TipoParticipacao)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {PARTICIPACAO_TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Dia/Hora do Ensaio</label>
                  <input
                    type="datetime-local"
                    value={fDiaHora}
                    onChange={(e) => setFDiaHora(e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>

              {eventVoluntarios.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                    Selecionar da Equipe (opcional)
                  </label>
                  <select
                    value={fVolId}
                    onChange={(e) => handlePickVol(e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    <option value="">Preencher manualmente ou escolher voluntário...</option>
                    {eventVoluntarios.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome} ({v.congregacao}){v.habilitadoDemos ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <VoiceInput label="Participante(s)" value={fNome} onChange={setFNome} required />
                <VoiceInput label="Congregação" value={fCong} onChange={setFCong} />
              </div>
              <VoiceInput label="Telefone / WhatsApp" value={fTel} onChange={setFTel} />
              <VoiceInput label="Descrição da Participação" value={fDesc} onChange={setFDesc} multiline rows={2} />
              <VoiceInput
                label="Orientações de Palco / Microfone"
                value={fOrient}
                onChange={setFOrient}
                multiline
                rows={2}
                placeholder="Ex.: Entrar pela esquerda, usar lapela 2..."
              />

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
                  Salvar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

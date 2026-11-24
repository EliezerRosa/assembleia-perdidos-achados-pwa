import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Edit3,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  AREAS_DESIGNACAO,
  DEPARTAMENTOS_CONGRESSO,
  FUNCOES_SETOR,
  TIPOS_VOLUNTARIO,
} from '../../constants/catalog';
import { compressImageFile } from '../../services/photoService';
import { normalizePhoneForWhatsapp } from '../../services/presidenciaService';
import { useAppStore } from '../../store/useAppStore';
import type {
  AreaDesignacao,
  DepartamentoCongresso,
  FuncaoSetor,
  TipoVoluntario,
  Voluntario,
} from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';

export const EquipeVoluntariosView: React.FC = () => {
  const { db, activeEvento, createVoluntario, updateVoluntario, deleteVoluntario, notify } = useAppStore();

  const [search, setSearch] = useState('');
  const [deptoFilter, setDeptoFilter] = useState<DepartamentoCongresso | 'TODOS'>('TODOS');
  const [onlySentinela, setOnlySentinela] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Voluntario | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const voluntarios = useMemo(() => {
    const base = activeEvento ? db.voluntarios.filter((v) => v.eventoId === activeEvento.id) : db.voluntarios;
    const q = search.trim().toLowerCase();
    return base.filter((v) => {
      if (deptoFilter !== 'TODOS' && v.departamento !== deptoFilter) return false;
      if (onlySentinela && !v.habilitadoSentinela) return false;
      if (q) {
        const hay = `${v.nome} ${v.congregacao} ${v.departamento} ${v.funcaoSetor} ${v.tipoVoluntario}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [db.voluntarios, activeEvento, search, deptoFilter, onlySentinela]);

  // Form fields
  const [fNome, setFNome] = useState('');
  const [fCong, setFCong] = useState('');
  const [fCirc, setFCirc] = useState(activeEvento?.circuito ?? '');
  const [fTel, setFTel] = useState('');
  const [fEmailSec, setFEmailSec] = useState('');
  const [fEmailJw, setFEmailJw] = useState('');
  const [fFoto, setFFoto] = useState('');
  const [fTipo, setFTipo] = useState<TipoVoluntario>('Publicador Adulto');
  const [fDepto, setFDepto] = useState<DepartamentoCongresso>('Presidência');
  const [fArea, setFArea] = useState<AreaDesignacao>('Palco');
  const [fFuncao, setFFuncao] = useState<FuncaoSetor>('Voluntário');
  const [fSentinela, setFSentinela] = useState(true);
  const [fDemos, setFDemos] = useState(true);
  const [fObs, setFObs] = useState('');

  const openNew = () => {
    setEditing(null);
    setFNome('');
    setFCong('');
    setFCirc(activeEvento?.circuito ?? '');
    setFTel('');
    setFEmailSec('');
    setFEmailJw('');
    setFFoto('');
    setFTipo('Publicador Adulto');
    setFDepto('Presidência');
    setFArea('Palco');
    setFFuncao('Voluntário');
    setFSentinela(true);
    setFDemos(true);
    setFObs('');
    setFormOpen(true);
  };

  const openEdit = (v: Voluntario) => {
    setEditing(v);
    setFNome(v.nome);
    setFCong(v.congregacao);
    setFCirc(v.circuito);
    setFTel(v.telefone);
    setFEmailSec(v.emailSecular);
    setFEmailJw(v.emailJwpub);
    setFFoto(v.foto);
    setFTipo(v.tipoVoluntario);
    setFDepto(v.departamento);
    setFArea(v.areaDesignacao);
    setFFuncao(v.funcaoSetor);
    setFSentinela(v.habilitadoSentinela);
    setFDemos(v.habilitadoDemos);
    setFObs(v.observacoes);
    setFormOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const res = await compressImageFile(file, { maxDimension: 320, quality: 0.72 });
      setFFoto(res.dataUrl);
    } catch {
      notify('Não foi possível processar a foto.', 'error');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvento || !fNome.trim()) {
      notify('Selecione um evento e informe o nome do voluntário.', 'warning');
      return;
    }
    const payload = {
      eventoId: activeEvento.id,
      nome: fNome.trim(),
      congregacao: fCong.trim(),
      circuito: fCirc.trim(),
      telefone: fTel.trim(),
      emailSecular: fEmailSec.trim(),
      emailJwpub: fEmailJw.trim(),
      foto: fFoto,
      tipoVoluntario: fTipo,
      departamento: fDepto,
      areaDesignacao: fArea,
      funcaoSetor: fFuncao,
      habilitadoSentinela: fSentinela,
      habilitadoDemos: fDemos,
      observacoes: fObs.trim(),
    };
    if (editing) {
      updateVoluntario({ ...editing, ...payload });
    } else {
      createVoluntario(payload);
    }
    setFormOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Equipe, Oradores & Voluntários</h2>
          <p className="text-xs text-slate-500">
            Cadastro compartilhado que alimenta <strong>Presidência</strong>, <strong>Demonstrações</strong> e{' '}
            <strong>Resumo de A Sentinela</strong> (com foto para a Galeria de Palco).
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#142944]"
        >
          <Plus className="h-4 w-4 text-amber-300" />
          Novo Voluntário
        </button>
      </div>

      {/* Filtros */}
      <div className="hc-card flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, congregação ou função..."
            className="min-h-[40px] w-full rounded-xl border border-slate-300 pl-9 pr-3 text-xs"
          />
        </div>
        <select
          value={deptoFilter}
          onChange={(e) => setDeptoFilter(e.target.value as DepartamentoCongresso | 'TODOS')}
          className="min-h-[40px] rounded-xl border border-slate-300 px-3 text-xs font-semibold"
        >
          <option value="TODOS">Todos os Departamentos</option>
          {DEPARTAMENTOS_CONGRESSO.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={onlySentinela}
            onChange={(e) => setOnlySentinela(e.target.checked)}
            className="h-4 w-4 accent-teal-700"
          />
          Elegível Sentinela
        </label>
      </div>

      {voluntarios.length === 0 ? (
        <div className="hc-card rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Nenhum voluntário cadastrado para os filtros selecionados.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {voluntarios.map((v) => {
            const wa = normalizePhoneForWhatsapp(v.telefone);
            return (
              <div key={v.id} className="hc-card flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  {v.foto ? (
                    <img src={v.foto} alt={v.nome} className="h-14 w-14 shrink-0 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-black text-white">
                      {v.nome.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-extrabold text-slate-900">{v.nome}</h3>
                    <p className="truncate text-xs text-slate-500">{v.congregacao || 'Sem congregação'}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] font-bold">
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-900">{v.departamento}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{v.funcaoSetor}</span>
                      {v.habilitadoSentinela && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">Sentinela</span>
                      )}
                      {v.habilitadoDemos && (
                        <span className="rounded bg-teal-100 px-1.5 py-0.5 text-teal-900">Demos</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                  <div className="flex gap-1.5">
                    {wa && (
                      <a
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    {v.telefone && (
                      <a
                        href={`tel:${v.telefone.replace(/\D/g, '')}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] font-bold text-slate-700"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => window.confirm(`Remover "${v.nome}"?`) && deleteVoluntario(v.id)}
                      className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
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

      {/* Modal Cadastro */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <form onSubmit={handleSave} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3.5 text-white">
              <h3 className="text-sm font-extrabold">{editing ? 'Editar Voluntário' : 'Novo Voluntário / Orador'}</h3>
              <button type="button" onClick={() => setFormOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3.5 p-5">
              <div className="flex items-center gap-3">
                {fFoto ? (
                  <img src={fFoto} alt="Preview" className="h-16 w-16 rounded-full object-cover border" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Camera className="h-6 w-6" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Carregar / Tirar Foto (Galeria Palco)
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <VoiceInput label="Nome Completo" value={fNome} onChange={setFNome} required />
                <VoiceInput label="Congregação" value={fCong} onChange={setFCong} />
                <VoiceInput label="Telefone / WhatsApp" value={fTel} onChange={setFTel} />
                <VoiceInput label="Circuito" value={fCirc} onChange={setFCirc} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Departamento</label>
                  <select
                    value={fDepto}
                    onChange={(e) => setFDepto(e.target.value as DepartamentoCongresso)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {DEPARTAMENTOS_CONGRESSO.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Função / Setor</label>
                  <select
                    value={fFuncao}
                    onChange={(e) => setFFuncao(e.target.value as FuncaoSetor)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {FUNCOES_SETOR.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Tipo Voluntário</label>
                  <select
                    value={fTipo}
                    onChange={(e) => setFTipo(e.target.value as TipoVoluntario)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {TIPOS_VOLUNTARIO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Área Designação</label>
                  <select
                    value={fArea}
                    onChange={(e) => setFArea(e.target.value as AreaDesignacao)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  >
                    {AREAS_DESIGNACAO.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={fSentinela}
                    onChange={(e) => setFSentinela(e.target.checked)}
                    className="h-4 w-4 accent-[#1e3a5f]"
                  />
                  Habilitado: Resumo de A Sentinela
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={fDemos}
                    onChange={(e) => setFDemos(e.target.checked)}
                    className="h-4 w-4 accent-[#1e3a5f]"
                  />
                  Habilitado: Demonstrações / Entrevistas
                </label>
              </div>

              <VoiceInput label="Observações" value={fObs} onChange={setFObs} />

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Voluntário
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

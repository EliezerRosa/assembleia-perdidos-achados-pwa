import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  ChevronDown,
  ChevronUp,
  Lock,
  Mic,
  MicOff,
  Save,
  ShieldAlert,
  Tag,
  X,
} from 'lucide-react';
import { CATEGORIAS_ITEM, VALORES_ITEM } from '../../constants/catalog';
import {
  isCashItem,
  isLostPerson,
  isRestrictedDisplay,
  requiresOwnerIdentification,
} from '../../services/trackingService';
import {
  isSpeechRecognitionSupported,
  parseSpokenItemFields,
  speakPtBr,
  startSingleUtteranceRecognition,
} from '../../services/voiceService';
import { useAppStore } from '../../store/useAppStore';
import type { CategoriaItem, ValorItem } from '../../types/domain';
import { PhotoCaptureCard } from '../common/PhotoCaptureCard';
import { VoiceInput } from '../common/VoiceInput';

interface ItemFormModalProps {
  registerSaveHandler?: (fn: (() => void) | null) => void;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({ registerSaveHandler }) => {
  const {
    db,
    activeEvento,
    allItemTypes,
    newItemModal,
    closeNewItemModal,
    createItem,
    getNextTagForEvent,
    notify,
  } = useAppStore();

  const nextTag = activeEvento ? getNextTagForEvent(activeEvento.id) : { numero: 1, codigo: '01' };

  const [etiqueta, setEtiqueta] = useState(nextTag.numero);
  const [formPagina, setFormPagina] = useState(1);
  const [fotoEntrada, setFotoEntrada] = useState('');
  const [etiquetaNoItem, setEtiquetaNoItem] = useState(false);
  const [etiquetaNoForm, setEtiquetaNoForm] = useState(false);
  const [fotoEtiqueta, setFotoEtiqueta] = useState('');

  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [tipoNovo, setTipoNovo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<ValorItem>('Baixo');
  const [categoria, setCategoria] = useState<CategoriaItem>('Perdido');

  const [quemTrouxe, setQuemTrouxe] = useState('');
  const [localAchado, setLocalAchado] = useState('');

  const [donoNomeTels, setDonoNomeTels] = useState('');
  const [congregacao, setCongregacao] = useState('');
  const [endereco, setEndereco] = useState('');

  const [showInstantDelivery, setShowInstantDelivery] = useState(false);
  const [quemPegou, setQuemPegou] = useState('');
  const [fotoEntrega, setFotoEntrega] = useState('');

  // Preenchimento inteligente por uma única frase falada!
  const [dictatingAll, setDictatingAll] = useState(false);
  const [dictatePreview, setDictatePreview] = useState('');
  const stopVoiceRef = useRef<(() => void) | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Inicializa presets ao abrir modal
  useEffect(() => {
    if (!newItemModal.open || !activeEvento) return;
    const nxt = getNextTagForEvent(activeEvento.id);
    setEtiqueta(nxt.numero);
    setFormPagina(Math.max(1, Math.ceil(nxt.numero / 20)));
    setFotoEntrada('');
    setFotoEtiqueta('');
    setFotoEntrega('');
    setEtiquetaNoItem(false);
    setEtiquetaNoForm(false);
    setTipoSelecionado('');
    setTipoNovo('');
    setDescricao('');
    setValor(newItemModal.presetValor ?? 'Baixo');
    setCategoria(newItemModal.presetCategoria ?? 'Perdido');
    setQuemTrouxe('');
    setLocalAchado(newItemModal.presetCategoria === 'Guardado' ? 'Balcão Guarda-Volumes' : '');
    setDonoNomeTels('');
    setCongregacao('');
    setEndereco('');
    setShowInstantDelivery(false);
    setQuemPegou('');

    if (newItemModal.presetCategoria === 'Criança') {
      setTipoSelecionado('Criança / Pessoa');
    }
  }, [newItemModal.open, newItemModal.presetCategoria, newItemModal.presetValor, activeEvento, getNextTagForEvent]);

  // Aplica campos recebidos do Assistente de Voz global enquanto o formulário está aberto
  useEffect(() => {
    const draft = newItemModal.voiceDraft;
    if (!newItemModal.open || !draft) return;
    if (draft.tipoItem) {
      if (allItemTypes.includes(draft.tipoItem)) {
        setTipoSelecionado(draft.tipoItem);
        setTipoNovo('');
      } else {
        setTipoNovo(draft.tipoItem);
      }
    }
    if (draft.descricao) setDescricao(draft.descricao);
    if (draft.valor) setValor(draft.valor);
    if (draft.categoria) setCategoria(draft.categoria);
    if (draft.formPagina) setFormPagina(draft.formPagina);
    if (draft.quemTrouxe) setQuemTrouxe(draft.quemTrouxe);
    if (draft.localAchado) setLocalAchado(draft.localAchado);
    if (draft.donoNomeTels) setDonoNomeTels(draft.donoNomeTels);
    if (draft.congregacao) setCongregacao(draft.congregacao);
    if (draft.endereco) setEndereco(draft.endereco);
    if (draft.quemPegou) {
      setShowInstantDelivery(true);
      setQuemPegou(draft.quemPegou);
    }
  }, [newItemModal.voiceDraft, newItemModal.open, allItemTypes]);

  const tipoFinal = tipoNovo.trim() || tipoSelecionado || 'Diversos Itens';
  const restricted = isRestrictedDisplay({ valor, tipoItem: tipoFinal, categoria });
  const lostPerson = isLostPerson(categoria);
  const needsOwner = requiresOwnerIdentification({ categoria, tipoItem: tipoFinal });
  const isCash = isCashItem({ tipoItem: tipoFinal, descricao });

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!activeEvento) return;
      if (!descricao.trim()) {
        notify('Preencha a descrição detalhada do item ou pessoa.', 'warning', true);
        return;
      }
      if (needsOwner && (!donoNomeTels.trim() || !congregacao.trim())) {
        notify(
          'Política #58 (Guarda-Volumes): Informe o Nome/Telefone do Dono e a Congregação.',
          'warning',
          true,
        );
        return;
      }

      createItem({
        eventoId: activeEvento.id,
        etiqueta,
        formPagina,
        tipoItem: tipoFinal,
        descricao,
        valor,
        categoria,
        fotoEntrada,
        etiquetaConfirmadaNoItem: etiquetaNoItem,
        etiquetaConfirmadaNoFormulario: etiquetaNoForm,
        fotoEtiqueta,
        quemTrouxe,
        localAchado,
        donoNomeTels,
        congregacao,
        endereco,
        entregarAgora: showInstantDelivery && Boolean(quemPegou.trim()),
        quemPegou,
        fotoEntrega,
      });

      closeNewItemModal();
    },
    [
      activeEvento,
      categoria,
      closeNewItemModal,
      congregacao,
      createItem,
      descricao,
      donoNomeTels,
      endereco,
      etiqueta,
      etiquetaNoForm,
      etiquetaNoItem,
      formPagina,
      fotoEntrada,
      fotoEntrega,
      fotoEtiqueta,
      localAchado,
      needsOwner,
      notify,
      quemPegou,
      quemTrouxe,
      showInstantDelivery,
      tipoFinal,
      valor,
    ],
  );

  useEffect(() => {
    if (!registerSaveHandler) return;
    registerSaveHandler(newItemModal.open ? () => handleSubmit() : null);
    return () => registerSaveHandler(null);
  }, [newItemModal.open, handleSubmit, registerSaveHandler]);

  const handleSmartVoiceFill = () => {
    if (dictatingAll) {
      stopVoiceRef.current?.();
      setDictatingAll(false);
      setDictatePreview('');
      return;
    }
    speakPtBr('Pode ditar o item, valor, categoria e quem trouxe.', db.config.vozFeedbackFalado);
    stopVoiceRef.current = startSingleUtteranceRecognition({
      onStart: () => setDictatingAll(true),
      onInterim: (txt) => setDictatePreview(txt),
      onFinal: (txt) => {
        setDictatePreview(txt);
        const parsed = parseSpokenItemFields(txt, db.tiposPersonalizados);
        if (parsed.tipoItem) {
          if (allItemTypes.includes(parsed.tipoItem)) {
            setTipoSelecionado(parsed.tipoItem);
            setTipoNovo('');
          } else {
            setTipoNovo(parsed.tipoItem);
          }
        }
        if (parsed.descricao) setDescricao(parsed.descricao);
        else if (!descricao && txt) setDescricao(txt);
        if (parsed.valor) setValor(parsed.valor);
        if (parsed.categoria) setCategoria(parsed.categoria);
        if (parsed.formPagina) setFormPagina(parsed.formPagina);
        if (parsed.quemTrouxe) setQuemTrouxe(parsed.quemTrouxe);
        if (parsed.localAchado) setLocalAchado(parsed.localAchado);
        if (parsed.donoNomeTels) setDonoNomeTels(parsed.donoNomeTels);
        if (parsed.congregacao) setCongregacao(parsed.congregacao);
        if (parsed.endereco) setEndereco(parsed.endereco);
        notify('Formulário preenchido por voz! Confira os campos e adicione as fotos.', 'success', true);
      },
      onEnd: () => setDictatingAll(false),
      onError: (msg) => {
        notify(msg, 'warning');
        setDictatingAll(false);
      },
    });
  };

  if (!newItemModal.open || !activeEvento) return null;

  const watermarkLabel = db.config.autoMarcaDaguaEtiqueta
    ? `ETQ #${String(etiqueta).padStart(2, '0')} • ${activeEvento.codigo}`
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="hc-card flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-4 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-amber-400 px-2.5 py-0.5 text-xs font-black text-slate-950">
                NOVA ETIQUETA #{db.config.prefixoEtiqueta}
                {String(etiqueta).padStart(2, '0')}
              </span>
              <span className="text-xs font-semibold text-sky-200">{activeEvento.codigo}</span>
            </div>
            <h2 className="mt-1 text-base font-extrabold">
              {categoria === 'Guardado'
                ? 'Registrar Volume (Guarda-Volumes)'
                : lostPerson
                  ? `Registrar Pessoa Perdida (${categoria})`
                  : 'Adicionar Novo Item — Perdidos e Achados'}
            </h2>
          </div>

          <button
            type="button"
            onClick={closeNewItemModal}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
            aria-label="Fechar formulário"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-4 sm:p-6">
          {/* Barra de Preenchimento Inteligente por Voz (Multi-Campo!) */}
          <div className="flex flex-col gap-2 rounded-2xl border border-teal-200 bg-teal-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs">
              <p className="font-extrabold text-teal-950">Preenchimento Inteligente por Voz</p>
              <p className="text-teal-800">
                Diga tudo em uma frase, ex.: <em>"Garrafa térmica preta, valor médio, categoria perdido, quem trouxe Ana no auditório"</em>
              </p>
              {dictatePreview && (
                <p className="mt-1 rounded bg-white px-2 py-1 font-semibold text-slate-800">"{dictatePreview}"</p>
              )}
            </div>
            <button
              type="button"
              disabled={!isSpeechRecognitionSupported()}
              onClick={handleSmartVoiceFill}
              className={`touch-target inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white transition ${
                dictatingAll
                  ? 'bg-rose-600 voice-listening'
                  : isSpeechRecognitionSupported()
                    ? 'bg-teal-700 hover:bg-teal-800'
                    : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              {dictatingAll ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {dictatingAll ? 'Ouvindo...' : 'Ditar Formulário'}
            </button>
          </div>

          {/* Alertas Dinâmicos de Política Oficial (§55, §56, §57, §58) */}
          {lostPerson && (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-rose-500 bg-rose-50 p-3.5 text-xs text-rose-950">
              <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-extrabold uppercase">Protocolo Prioritário — Política #56</p>
                <p className="mt-0.5">
                  <strong>NÃO fazer anúncios no microfone.</strong> Avise imediatamente o{' '}
                  <strong>Departamento de Indicadores</strong>, o <strong>Superintendente de Assembleia</strong> e o{' '}
                  <strong>Superintendente de Circuito</strong>.
                </p>
              </div>
            </div>
          )}

          {restricted && !lostPerson && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-orange-300 bg-orange-50 p-3 text-xs text-orange-950">
              <Lock className="h-4 w-4 shrink-0 text-orange-700 mt-0.5" />
              <p>
                <strong>Política #55 (Artigo de Valor / Restrito):</strong> NÃO deixar este item exposto no balcão.
                Guardar em local seguro; quem procurar deverá descrever os detalhes antes da entrega.
              </p>
            </div>
          )}

          {isCash && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-blue-300 bg-blue-50 p-3 text-xs text-blue-950">
              <Banknote className="h-4 w-4 shrink-0 text-blue-700 mt-0.5" />
              <p>
                <strong>Política #57 (Dinheiro):</strong> Se não for retirado até o fim da assembleia, deverá ser
                entregue ao <strong>Departamento de Contas</strong>.
              </p>
            </div>
          )}

          {/* BLOCO FOTO -> ETIQUETA -> FOTO (Requisito #3 + Vídeo Glide) */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                <Tag className="h-4 w-4 text-amber-600" />
                Fluxo Obrigatório: Foto 1 • Etiqueta Gêmea • Foto 2
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <label className="font-semibold text-slate-600">Nº Etiqueta:</label>
                <input
                  type="number"
                  min={1}
                  value={etiqueta}
                  onChange={(e) => setEtiqueta(Math.max(1, Number(e.target.value)))}
                  className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-black text-slate-900"
                />
                <label className="font-semibold text-slate-600">Pág. Form:</label>
                <input
                  type="number"
                  min={1}
                  value={formPagina}
                  onChange={(e) => setFormPagina(Math.max(1, Number(e.target.value)))}
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <PhotoCaptureCard
                  stepBadge="1º Foto"
                  title="Foto do Item com Etiqueta"
                  subtitle={`Cole a etiqueta #${etiqueta} no item e fotografe.`}
                  value={fotoEntrada}
                  onChange={(v) => {
                    setFotoEntrada(v);
                    if (v) setEtiquetaNoItem(true);
                  }}
                  watermarkTag={watermarkLabel}
                  accent="sky"
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={etiquetaNoItem}
                    onChange={(e) => setEtiquetaNoItem(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-600"
                  />
                  Confirmo: Etiqueta #{etiqueta} colada no item
                </label>
              </div>

              <div className="space-y-2">
                <PhotoCaptureCard
                  stepBadge="2º Etiqueta + Foto"
                  title="Foto da Etiqueta / Formulário"
                  subtitle={`Cole a 2ª etiqueta #${etiqueta} no Formulário (Pág. ${formPagina}) e fotografe.`}
                  value={fotoEtiqueta}
                  onChange={(v) => {
                    setFotoEtiqueta(v);
                    if (v) setEtiquetaNoForm(true);
                  }}
                  watermarkTag={watermarkLabel ? `${watermarkLabel} • FORM P.${formPagina}` : undefined}
                  accent="amber"
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={etiquetaNoForm}
                    onChange={(e) => setEtiquetaNoForm(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-600"
                  />
                  Confirmo: Etiqueta gêmea #{etiqueta} colada no formulário (Pág. {formPagina})
                </label>
              </div>
            </div>
          </div>

          {/* BLOCO CLASSIFICAÇÃO */}
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Tipo de Item já Cadastrado
                </label>
                <select
                  value={tipoSelecionado}
                  onChange={(e) => {
                    setTipoSelecionado(e.target.value);
                    if (e.target.value) setTipoNovo('');
                  }}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-600 focus:outline-none"
                >
                  <option value="">-- Selecione ou informe novo ao lado --</option>
                  {allItemTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <VoiceInput
                label="Ou Novo Tipo de Item"
                value={tipoNovo}
                onChange={(v) => {
                  setTipoNovo(v);
                  if (v) setTipoSelecionado('');
                }}
                placeholder="Ex.: Fone de ouvido, Terço, Bengala..."
              />
            </div>

            <VoiceInput
              label="Descrição Detalhada"
              required
              multiline
              rows={2}
              value={descricao}
              onChange={setDescricao}
              placeholder="Cor, marca, detalhes que ajudem o dono a identificar..."
            />

            {/* Valor */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Valor Estimado *
              </span>
              <div className="flex flex-wrap gap-2">
                {VALORES_ITEM.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setValor(v)}
                    className={`touch-target rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                      valor === v
                        ? v === 'Precioso' || v === 'Alto'
                          ? 'border-rose-700 bg-rose-600 text-white'
                          : 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Categoria *
              </span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS_ITEM.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoria(c)}
                    className={`touch-target rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                      categoria === c
                        ? isLostPerson(c)
                          ? 'border-rose-700 bg-rose-600 text-white'
                          : c === 'Guardado'
                            ? 'border-blue-700 bg-blue-700 text-white'
                            : 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {c === 'Guardado' ? 'Guardado (Guarda-Volumes)' : c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* BLOCO RECEPÇÃO */}
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
              Recepção — Quem Trouxe & Local do Achado
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <VoiceInput
                label="Quem Trouxe (Nome e Telefones)"
                value={quemTrouxe}
                onChange={setQuemTrouxe}
                placeholder="Nome, telefone ou equipe (ex.: Limpeza, Indicador)"
              />
              <VoiceInput
                label="Local do Achado / Origem"
                value={localAchado}
                onChange={setLocalAchado}
                placeholder="Ex.: Auditório setor B, banheiro feminino, estacionamento..."
              />
            </div>
          </div>

          {/* BLOCO DADOS DO DONO (destacado e obrigatório para Guarda-Volumes §58) */}
          <div
            className={`space-y-3 rounded-2xl border p-4 ${
              needsOwner ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Dados do Dono {needsOwner ? '(Obrigatório — Guarda-Volumes §58)' : '(Opcional na entrada)'}
              </h3>
              {needsOwner && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-700 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  <AlertTriangle className="h-3 w-3" /> Identificação Obrigatória
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <VoiceInput
                label="Nome e Telefone do Dono"
                required={needsOwner}
                value={donoNomeTels}
                onChange={setDonoNomeTels}
                placeholder="Nome completo e WhatsApp/Celular"
              />
              <VoiceInput
                label="Congregação"
                required={needsOwner}
                value={congregacao}
                onChange={setCongregacao}
                placeholder="Nome da congregação"
              />
            </div>
            <VoiceInput
              label="Endereço Completo"
              value={endereco}
              onChange={setEndereco}
              placeholder="Rua, número, bairro, cidade..."
            />
          </div>

          {/* BLOCO ENTREGA IMEDIATA (opcional, conforme formulário do Glide) */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5">
            <button
              type="button"
              onClick={() => setShowInstantDelivery((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-extrabold uppercase tracking-wider text-emerald-900"
            >
              <span>Entrega Imediata (opcional — preencher apenas se o dono já retirou no ato)</span>
              {showInstantDelivery ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showInstantDelivery && (
              <div className="mt-3 space-y-3">
                <VoiceInput
                  label="Quem Pegou (Nome e Telefone)"
                  value={quemPegou}
                  onChange={setQuemPegou}
                  placeholder="Nome e telefone de quem levou o item"
                />
                <PhotoCaptureCard
                  stepBadge="3º Entrega"
                  title="Foto de Comprovação na Entrega (opcional)"
                  subtitle="Opcional: registre comprovante ou assinatura na entrega imediata."
                  value={fotoEntrega}
                  onChange={setFotoEntrega}
                  accent="emerald"
                />
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeNewItemModal}
              className="touch-target rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
            >
              <Save className="h-4 w-4" />
              Salvar Item (Etiqueta #{etiqueta})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

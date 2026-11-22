import React, { useState } from 'react';
import {
  Archive,
  Banknote,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Printer,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Tag,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  getDiasGuardado,
  isCashItem,
  isItemRetido,
  isLostPerson,
  isRestrictedDisplay,
} from '../../services/trackingService';
import { useAppStore } from '../../store/useAppStore';
import type { DestinoSA, Item } from '../../types/domain';
import { CategoriaBadge, DestinoBadge, SecurityBadge, StatusBadge, ValorBadge } from '../common/Badge';
import { PhotoCaptureCard } from '../common/PhotoCaptureCard';
import { VoiceInput } from '../common/VoiceInput';

interface ItemDetailModalProps {
  itemId: string | null;
  onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ itemId, onClose }) => {
  const {
    db,
    markItemConference,
    deliverItem,
    dispatchItemSA,
    reopenItem,
    updateItem,
    deleteItem,
  } = useAppStore();

  const item: Item | undefined = db.itens.find((i) => i.id === itemId);
  const [activePhotoTab, setActivePhotoTab] = useState<'entrada' | 'etiqueta' | 'entrega'>('entrada');
  const [actionPanel, setActionPanel] = useState<'none' | 'deliver' | 'conference' | 'dispatch' | 'editPhotos'>('none');

  // Delivery form state
  const [quemPegou, setQuemPegou] = useState('');
  const [donoNomeTels, setDonoNomeTels] = useState('');
  const [congregacao, setCongregacao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [obsEntrega, setObsEntrega] = useState('');
  const [fotoEntrega, setFotoEntrega] = useState('');

  // Conference / Dispatch state
  const [confObs, setConfObs] = useState('');
  const [dispatchDestino, setDispatchDestino] = useState<Exclude<DestinoSA, ''>>('DOAR');
  const [dispatchObs, setDispatchObs] = useState('');

  if (!item) return null;

  const evento = db.eventos.find((e) => e.id === item.eventoId);
  const diasGuardado = getDiasGuardado(item.dataHoraGuardado);
  const retido = isItemRetido(item, db.config.prazoRetencaoDias);
  const restricted = isRestrictedDisplay(item);
  const lostPerson = isLostPerson(item.categoria);
  const isCash = isCashItem(item);

  const openDeliverPanel = () => {
    setQuemPegou(item.quemPegou || item.donoNomeTels || '');
    setDonoNomeTels(item.donoNomeTels || '');
    setCongregacao(item.congregacao || '');
    setEndereco(item.endereco || '');
    setObsEntrega(item.observacaoEntrega || '');
    setFotoEntrega(item.fotoEntrega || '');
    setActionPanel('deliver');
  };

  const handleConfirmDelivery = (e: React.FormEvent, entregueContas = false) => {
    e.preventDefault();
    const ok = deliverItem(item.id, {
      quemPegou,
      donoNomeTels,
      congregacao,
      endereco,
      fotoEntrega,
      observacaoEntrega: obsEntrega,
      entregueContas,
    });
    if (ok) setActionPanel('none');
  };

  const handlePrintTag = () => {
    const win = window.open('', '_blank', 'width=420,height=560');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Etiqueta #${item.etiquetaCodigo}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 16px; color: #0f172a; }
        .twin { border: 2px dashed #1e3a5f; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
        .tag { font-size: 38px; font-weight: 900; color: #1e3a5f; line-height: 1; }
        .sub { font-size: 12px; color: #475569; margin-top: 4px; }
        .meta { font-size: 13px; margin-top: 8px; }
      </style></head><body>
      ${['ETIQUETA PARA O ITEM', 'ETIQUETA GÊMEA PARA O FORMULÁRIO (Pág. ' + item.formPagina + ')']
        .map(
          (lbl) => `<div class="twin">
            <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:#0f766e">${lbl}</div>
            <div class="tag">#${item.etiquetaCodigo}</div>
            <div class="sub">${evento?.tipo ?? 'Evento'} • ${evento?.codigo ?? ''} • ${evento?.data ?? ''}</div>
            <div class="meta"><strong>${item.tipoItem}</strong> (${item.categoria} / Valor ${item.valor})<br/>${item.descricao}</div>
            ${item.donoNomeTels ? `<div class="meta"><strong>Dono:</strong> ${item.donoNomeTels} (${item.congregacao})</div>` : ''}
          </div>`,
        )
        .join('')}
      <script>window.print();</script></body></html>`);
    win.document.close();
  };

  const currentPhoto =
    activePhotoTab === 'entrada'
      ? item.fotoEntrada
      : activePhotoTab === 'etiqueta'
        ? item.fotoEtiqueta
        : item.fotoEntrega;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="hc-card flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 bg-[#1e3a5f] px-5 py-4 text-white">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-amber-400 px-2.5 py-0.5 text-sm font-black text-slate-950">
                ETQ #{item.etiquetaCodigo}
              </span>
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold">
                Pág. Form {item.formPagina}
              </span>
              {evento && (
                <span className="text-xs text-sky-200">
                  {evento.tipo} • {evento.codigo} ({evento.data.split('-').reverse().join('/')})
                </span>
              )}
            </div>
            <h2 className="mt-1.5 text-lg font-extrabold">{item.tipoItem}</h2>
            {item.etiquetaOrigem && (
              <p className="text-[11px] text-amber-200">
                Mesclado de outro equipamento • Etiqueta original: {item.etiquetaOrigem}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrintTag}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-bold hover:bg-white/25"
              title="Imprimir par de etiquetas gêmeas"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Etiqueta</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25"
              aria-label="Fechar detalhes"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="grid gap-5 overflow-y-auto p-4 sm:p-6 lg:grid-cols-12">
          {/* Coluna Esquerda: Fotos + Ações de Ciclo de Vida */}
          <div className="space-y-4 lg:col-span-6">
            {/* Abas das 3 Fotos (Foto 1 Item, Foto 2 Etiqueta, Foto 3 Entrega) */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-900 text-xs font-bold">
                {(
                  [
                    ['entrada', '1. Foto Item', Boolean(item.fotoEntrada)],
                    ['etiqueta', '2. Etiqueta/Form', Boolean(item.fotoEtiqueta)],
                    ['entrega', '3. Entrega', Boolean(item.fotoEntrega)],
                  ] as const
                ).map(([key, label, has]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePhotoTab(key)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 transition ${
                      activePhotoTab === key
                        ? 'bg-[#1e3a5f] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${has ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex h-64 items-center justify-center bg-slate-950">
                {currentPhoto ? (
                  <img src={currentPhoto} alt={item.tipoItem} className="max-h-64 w-full object-contain" />
                ) : (
                  <div className="text-center text-slate-500">
                    <Camera className="mx-auto h-8 w-8 opacity-60" />
                    <p className="mt-1 text-xs">Nenhuma foto registrada nesta etapa</p>
                    <button
                      type="button"
                      onClick={() => setActionPanel('editPhotos')}
                      className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                    >
                      Adicionar Foto Agora
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Badges & Alertas */}
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={item.status} />
              <ValorBadge valor={item.valor} />
              <CategoriaBadge categoria={item.categoria} />
              <DestinoBadge destino={item.destino} />
              {lostPerson && item.status !== 'Já Entregue' && <SecurityBadge kind="lost-person" />}
              {restricted && item.status === 'Ainda Guardado' && <SecurityBadge kind="restricted" />}
              {retido && <SecurityBadge kind="retained" label={`Retido há ${diasGuardado} dias`} />}
            </div>

            {/* Painel de Ações do Ciclo de Vida */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Ações do Ciclo de Vida
              </p>

              {item.status === 'Ainda Guardado' || item.status === 'Em Conferência' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={openDeliverPanel}
                    className="touch-target col-span-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <UserCheck className="h-4 w-4" />
                    REGISTRAR ENTREGA AO DONO
                  </button>
                  {item.status === 'Ainda Guardado' && (
                    <button
                      type="button"
                      onClick={() => setActionPanel('conference')}
                      className="touch-target flex items-center justify-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
                    >
                      <Eye className="h-4 w-4" />
                      Em Conferência
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchDestino(isCash ? 'CONTAS' : 'DOAR');
                      setActionPanel('dispatch');
                    }}
                    className="touch-target flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100"
                  >
                    {isCash ? <Banknote className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {isCash ? 'Entregar Contas' : 'Destinar (SA)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionPanel('editPhotos')}
                    className="touch-target flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Camera className="h-4 w-4" />
                    Atualizar Fotos
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const motivo = window.prompt('Motivo para reabrir este item para custódia?', 'Correção de registro');
                      if (motivo !== null) reopenItem(item.id, motivo);
                    }}
                    className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reabrir Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionPanel('editPhotos')}
                    className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Camera className="h-4 w-4" />
                    Fotos
                  </button>
                </div>
              )}

              {/* Subformulário: Entregar ao Dono */}
              {actionPanel === 'deliver' && (
                <form
                  onSubmit={(e) => handleConfirmDelivery(e, false)}
                  className="mt-3 space-y-3 rounded-xl border border-emerald-300 bg-white p-3.5"
                >
                  <h4 className="text-xs font-black uppercase text-emerald-900">Confirmar Entrega ao Dono</h4>
                  <VoiceInput
                    label="Quem Pegou (Nome e Telefone)"
                    required
                    value={quemPegou}
                    onChange={setQuemPegou}
                    placeholder="Nome completo e telefone de quem retirou"
                  />
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <VoiceInput
                      label="Dono (Nome e Tel.)"
                      value={donoNomeTels}
                      onChange={setDonoNomeTels}
                      placeholder="Se diferente de quem pegou"
                    />
                    <VoiceInput
                      label="Congregação"
                      value={congregacao}
                      onChange={setCongregacao}
                      placeholder="Congregação do dono"
                    />
                  </div>
                  <VoiceInput label="Endereço" value={endereco} onChange={setEndereco} placeholder="Endereço do dono" />
                  <VoiceInput
                    label="Observação da Conferência"
                    value={obsEntrega}
                    onChange={setObsEntrega}
                    placeholder="Ex.: Desbloqueou celular / conferido documento"
                  />
                  <PhotoCaptureCard
                    stepBadge="3º Foto"
                    title="Foto Comprovante de Entrega (opcional)"
                    subtitle="Foto do item na entrega ou recibo assinado."
                    value={fotoEntrega}
                    onChange={setFotoEntrega}
                    accent="emerald"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActionPanel('none')}
                      className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-700"
                    >
                      Cancelar
                    </button>
                    {isCash && (
                      <button
                        type="button"
                        onClick={(e) => handleConfirmDelivery(e, true)}
                        className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
                      >
                        Entregar ao Depto. Contas
                      </button>
                    )}
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                    >
                      Confirmar Entrega
                    </button>
                  </div>
                </form>
              )}

              {/* Subformulário: Em Conferência */}
              {actionPanel === 'conference' && (
                <div className="mt-3 space-y-2.5 rounded-xl border border-indigo-200 bg-white p-3.5">
                  <h4 className="text-xs font-black uppercase text-indigo-900">Colocar em Conferência</h4>
                  <VoiceInput
                    label="Detalhes da Conferência"
                    value={confObs}
                    onChange={setConfObs}
                    placeholder="Ex.: Solicitante aguardando confirmação por WhatsApp"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActionPanel('none')}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        markItemConference(item.id, confObs);
                        setActionPanel('none');
                      }}
                      className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              )}

              {/* Subformulário: Destinar (SA) */}
              {actionPanel === 'dispatch' && (
                <div className="mt-3 space-y-2.5 rounded-xl border border-amber-300 bg-white p-3.5">
                  <h4 className="text-xs font-black uppercase text-amber-950">Definir Destino (Superintendente de Assembleia)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['DOAR', 'DESCARTAR', 'VENDER', 'CONTAS'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDispatchDestino(d)}
                        className={`rounded-xl border py-2 text-xs font-bold ${
                          dispatchDestino === d
                            ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                            : 'border-slate-300 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <VoiceInput
                    label="Observação do SA"
                    value={dispatchObs}
                    onChange={setDispatchObs}
                    placeholder="Ex.: Autorizado após 2 meses sem retirada"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActionPanel('none')}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        dispatchItemSA(item.id, dispatchDestino, dispatchObs);
                        setActionPanel('none');
                      }}
                      className="rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-extrabold text-white"
                    >
                      Despachar Item
                    </button>
                  </div>
                </div>
              )}

              {/* Subformulário: Atualizar Fotos */}
              {actionPanel === 'editPhotos' && (
                <div className="mt-3 space-y-3 rounded-xl border border-slate-300 bg-white p-3.5">
                  <PhotoCaptureCard
                    stepBadge="Foto 1"
                    title="Foto do Item com Etiqueta"
                    subtitle="Atualize a foto de entrada"
                    value={item.fotoEntrada}
                    onChange={(url) => updateItem({ ...item, fotoEntrada: url }, 'Foto de entrada atualizada')}
                    watermarkTag={`ETQ #${item.etiquetaCodigo}`}
                  />
                  <PhotoCaptureCard
                    stepBadge="Foto 2"
                    title="Foto da Etiqueta / Formulário"
                    subtitle="Atualize a foto da etiqueta gêmea"
                    value={item.fotoEtiqueta}
                    onChange={(url) =>
                      updateItem(
                        { ...item, fotoEtiqueta: url, etiquetaConfirmadaNoFormulario: Boolean(url) },
                        'Foto da etiqueta atualizada',
                      )
                    }
                    watermarkTag={`ETQ #${item.etiquetaCodigo} • FORM`}
                    accent="amber"
                  />
                  <button
                    type="button"
                    onClick={() => setActionPanel('none')}
                    className="w-full rounded-xl bg-[#1e3a5f] py-2 text-xs font-bold text-white"
                  >
                    Concluir Fotos
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Ficha Completa + Linha do Tempo de Rastreio */}
          <div className="space-y-4 lg:col-span-6">
            {/* Descrição e Metadados */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Descrição Detalhada</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">{item.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                <div>
                  <p className="font-bold uppercase text-[10px] text-amber-700">Recepção — Quem Trouxe</p>
                  <p className="mt-0.5 font-semibold text-slate-800">{item.quemTrouxe || 'Não informado'}</p>
                  {item.localAchado && (
                    <p className="mt-0.5 flex items-center gap-1 text-slate-500">
                      <MapPin className="h-3 w-3" /> {item.localAchado}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {new Date(item.dataHoraGuardado).toLocaleString('pt-BR')}
                  </p>
                </div>

                <div>
                  <p className="font-bold uppercase text-[10px] text-emerald-700">Entrega / Despacho</p>
                  <p className="mt-0.5 font-semibold text-slate-800">{item.quemPegou || 'Ainda em custódia'}</p>
                  {item.dataHoraDespachado && (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {new Date(item.dataHoraDespachado).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              {(item.donoNomeTels || item.congregacao || item.endereco) && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs">
                  <p className="font-extrabold uppercase text-[10px] text-blue-800">Dados do Dono</p>
                  <p className="mt-1 font-bold text-slate-900">{item.donoNomeTels || '-'}</p>
                  {item.congregacao && <p className="text-slate-700">Congregação: {item.congregacao}</p>}
                  {item.endereco && <p className="text-slate-600">Endereço: {item.endereco}</p>}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" /> Origem: {item.deviceName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> ID: <code className="text-[10px]">{item.id.slice(0, 12)}</code>
                </span>
              </div>
            </div>

            {/* LINHA DO TEMPO DE RASTREIO COMPLETO */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
                  <Clock className="h-4 w-4 text-sky-700" />
                  Rastreio Completo da Entrada à Entrega ({item.rastreio.length})
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">{diasGuardado} dia(s) desde a entrada</span>
              </div>

              <ol className="relative ml-2.5 space-y-4 border-l-2 border-slate-200 pl-5">
                {item.rastreio.map((ev) => {
                  const isFinal = ev.etapa === 'ENTREGUE' || ev.etapa === 'ENTREGUE_CONTAS' || ev.etapa === 'DESPACHADO_SA';
                  return (
                    <li key={ev.id} className="relative">
                      <span
                        className={`absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${
                          isFinal
                            ? 'bg-emerald-500'
                            : ev.etapa === 'TRANSFERIDO_DISPOSITIVO'
                              ? 'bg-purple-500'
                              : ev.etapa === 'CONFERENCIA'
                                ? 'bg-indigo-500'
                                : 'bg-sky-600'
                        }`}
                      >
                        {isFinal && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                      </span>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-extrabold text-slate-900">{ev.titulo}</span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {new Date(ev.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-700">{ev.detalhes}</p>
                        <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-slate-500">
                          <span>Op.: {ev.operador}</span>
                          <span>•</span>
                          <span>Equip.: {ev.dispositivo}</span>
                          {ev.localizacao && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-sky-800">{ev.localizacao}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {lostPerson && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                Lembrete §56: Confirmar identidade do responsável legal antes de liberar pessoa/criança.
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Excluir permanentemente o item #${item.etiquetaCodigo} deste dispositivo?`)) {
                    deleteItem(item.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir Registro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

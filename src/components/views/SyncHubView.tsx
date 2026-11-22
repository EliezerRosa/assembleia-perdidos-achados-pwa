import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GitMerge,
  HardDrive,
  History,
  Share2,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { exportToSpreadsheet } from '../../services/excelService';
import { buildSyncBundle, parseSyncBundle, previewMerge } from '../../services/mergeService';
import { useAppStore } from '../../store/useAppStore';
import type {
  EstrategiaColisaoEtiqueta,
  EstrategiaConflitoId,
  MergePreview,
  SyncBundle,
} from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const SyncHubView: React.FC = () => {
  const {
    db,
    activeEvento,
    storageUsage,
    updateConfig,
    applySyncMerge,
    importSpreadsheet,
    recordExportLog,
    loadDemoData,
    clearAllData,
    notify,
  } = useAppStore();

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [pendingBundle, setPendingBundle] = useState<SyncBundle | null>(null);
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [colisaoStrategy, setColisaoStrategy] = useState<EstrategiaColisaoEtiqueta>('renumerar');
  const [conflitoStrategy, setConflitoStrategy] = useState<EstrategiaConflitoId>('mais_recente');

  const handleExportJson = async (scope: 'all' | 'single_event', shareNative = false) => {
    const bundle = buildSyncBundle(db, scope, activeEvento?.id);
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const slug =
      scope === 'single_event' && activeEvento
        ? activeEvento.codigo.replace(/[^a-zA-Z0-9-]/g, '_')
        : 'COMPLETO';
    const devSlug = db.config.deviceName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 18);
    const filename = `PA_Sync_${slug}_${devSlug}_${new Date().toISOString().slice(0, 10)}.json`;

    if (shareNative && typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([blob], filename, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Perdidos & Achados — ${slug}`,
            text: `Pacote de sincronização com ${bundle.itens.length} itens (${db.config.deviceName}).`,
            files: [file],
          });
          recordExportLog('EXPORT_JSON', `Compartilhado via Web Share: ${filename} (${bundle.itens.length} itens).`);
          notify('Pacote compartilhado com sucesso!', 'success');
          return;
        }
      } catch {
        // Fallback para download direto se o usuário cancelar ou navegador não suportar arquivo
      }
    }

    triggerDownload(blob, filename);
    recordExportLog('EXPORT_JSON', `Exportado JSON: ${filename} (${bundle.itens.length} itens).`);
    notify(`Arquivo "${filename}" exportado (${bundle.itens.length} itens com fotos)!`, 'success', true);
  };

  const handleSelectJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const parsed = parseSyncBundle(text);
    if (parsed.error || !parsed.bundle) {
      notify(parsed.error ?? 'Arquivo inválido.', 'error');
      return;
    }
    const preview = previewMerge(db, parsed.bundle);
    setPendingBundle(parsed.bundle);
    setMergePreview(preview);
  };

  const handleConfirmMerge = () => {
    if (!pendingBundle) return;
    applySyncMerge(pendingBundle, {
      estrategiaColisaoEtiqueta: colisaoStrategy,
      estrategiaConflitoId: conflitoStrategy,
    });
    setPendingBundle(null);
    setMergePreview(null);
  };

  const handleSelectExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      importSpreadsheet(buffer, file.name);
    } catch {
      notify('Erro ao ler a planilha. Verifique se é um arquivo .xlsx ou .csv válido.', 'error');
    }
  };

  const handleExportExcel = (format: 'xlsx' | 'csv', onlyActiveEvent: boolean) => {
    const { blob, filename } = exportToSpreadsheet(db, format, onlyActiveEvent ? activeEvento?.id : undefined);
    triggerDownload(blob, filename);
    recordExportLog(
      format === 'xlsx' ? 'EXPORT_EXCEL' : 'EXPORT_CSV',
      `Exportado ${format.toUpperCase()}: ${filename}`,
    );
    notify(`Planilha "${filename}" gerada!`, 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Exportar, Importar & Mesclar Equipamentos</h2>
        <p className="text-xs text-slate-500">
          Todos os dados ficam no <strong>localStorage</strong> do seu navegador. Use esta central para juntar itens
          cadastrados em vários celulares e PCs sem perder fotos nem sobrescrever etiquetas, ou importar/exportar a
          planilha Excel oficial.
        </p>
      </div>

      {/* PREVIEW DE MESCLAGEM MULTI-DISPOSITIVO */}
      {pendingBundle && mergePreview && (
        <div className="hc-card space-y-4 rounded-3xl border-2 border-purple-500 bg-purple-50/50 p-5 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="rounded-full bg-purple-700 px-2.5 py-0.5 text-[11px] font-bold text-white">
                PRÉ-VISUALIZAÇÃO DE MESCLAGEM
              </span>
              <h3 className="mt-1 text-base font-extrabold text-slate-900">
                Pacote de "{mergePreview.sourceDeviceName}"
              </h3>
              <p className="text-xs text-slate-600">
                Exportado em {new Date(mergePreview.exportedAt).toLocaleString('pt-BR')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingBundle(null);
                setMergePreview(null);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-xs">
            <div className="rounded-xl bg-white p-3 border border-slate-200">
              <p className="text-slate-500">Novos Itens</p>
              <p className="text-xl font-black text-emerald-700">+{mergePreview.novosItens.length}</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-slate-200">
              <p className="text-slate-500">Colisões Etiqueta</p>
              <p className={`text-xl font-black ${mergePreview.colisoesEtiqueta.length > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {mergePreview.colisoesEtiqueta.length}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-slate-200">
              <p className="text-slate-500">Mesmo ID Alterado</p>
              <p className="text-xl font-black text-sky-700">{mergePreview.conflitosId.length}</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-slate-200">
              <p className="text-slate-500">Novos Eventos / Proc.</p>
              <p className="text-xl font-black text-purple-700">
                +{mergePreview.novosEventos.length} / +{mergePreview.novosProcurados.length}
              </p>
            </div>
          </div>

          {/* Resolução de Colisões de Etiqueta */}
          {mergePreview.colisoesEtiqueta.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs">
              <p className="flex items-center gap-1.5 font-extrabold text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                {mergePreview.colisoesEtiqueta.length} item(ns) de outro equipamento têm o mesmo número de etiqueta no mesmo evento!
              </p>
              <ul className="space-y-1 text-amber-900">
                {mergePreview.colisoesEtiqueta.slice(0, 5).map((c) => (
                  <li key={c.incomingItem.id}>
                    • <strong>{c.eventoCodigo}</strong> Etq #{c.incomingItem.etiquetaCodigo}: Local (
                    {c.existingItem.tipoItem}) vs Importado ({c.incomingItem.tipoItem})
                  </li>
                ))}
              </ul>
              <div className="grid gap-2 pt-2 sm:grid-cols-3">
                {(
                  [
                    ['renumerar', 'Renumerar automático (Recomendado)', 'Atribui próxima etiqueta livre e salva original no rastreio.'],
                    ['prefixo_dispositivo', 'Prefixo do equipamento', 'Ex.: CEL-01, mantendo o número impresso visível.'],
                    ['manter', 'Manter número igual', 'Mantém ambos com o mesmo número.'],
                  ] as const
                ).map(([key, title, desc]) => (
                  <label
                    key={key}
                    className={`cursor-pointer rounded-xl border p-2.5 ${
                      colisaoStrategy === key ? 'border-[#1e3a5f] bg-white ring-2 ring-sky-500/20' : 'border-amber-200 bg-white/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="colisao"
                      checked={colisaoStrategy === key}
                      onChange={() => setColisaoStrategy(key)}
                      className="mr-1.5 accent-[#1e3a5f]"
                    />
                    <strong className="text-slate-900">{title}</strong>
                    <p className="mt-0.5 text-[11px] text-slate-500">{desc}</p>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Resolução de Conflitos de Mesmo ID */}
          {mergePreview.conflitosId.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-sky-200 bg-white p-3.5 text-xs">
              <p className="font-extrabold text-sky-950">
                {mergePreview.conflitosId.length} item(ns) já existem neste aparelho com atualizações:
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['mais_recente', 'Manter mais recente (Recomendado)'],
                    ['sobrescrever_importado', 'Usar sempre importado'],
                    ['manter_local', 'Preservar local'],
                  ] as const
                ).map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setConflitoStrategy(k)}
                    className={`rounded-xl border px-3 py-1.5 font-bold ${
                      conflitoStrategy === k ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white' : 'border-slate-300 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleConfirmMerge}
              className="touch-target inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar e Consolidar neste Equipamento
            </button>
          </div>
        </div>
      )}

      {/* CARDS PRINCIPAIS: MULTI-DISPOSITIVO (JSON) & PLANILHA EXCEL */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 1. Exportar / Importar JSON (Entre Celulares e PCs) */}
        <div className="hc-card space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Juntar Vários Equipamentos (Mobile ↔ PC)</h3>
              <p className="text-xs text-slate-500">Pacote JSON completo com fotos, etiquetas, procurados e rastreio.</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase text-slate-500">Enviar deste equipamento:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleExportJson('single_event', false)}
                disabled={!activeEvento}
                className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#142944] disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Exportar Evento Ativo
              </button>
              <button
                type="button"
                onClick={() => handleExportJson('all', false)}
                className="touch-target inline-flex items-center justify-center gap-2 rounded-xl border border-[#1e3a5f] bg-white px-3.5 py-2.5 text-xs font-bold text-[#1e3a5f] hover:bg-sky-50"
              >
                <Download className="h-4 w-4" />
                Backup Completo (Tudo)
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleExportJson(activeEvento ? 'single_event' : 'all', true)}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar Direto (WhatsApp / Bluetooth / Drive)
            </button>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-bold uppercase text-slate-500">Receber e mesclar de outro celular/PC:</p>
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-400 bg-purple-50 px-4 py-3 text-xs font-extrabold text-purple-900 hover:bg-purple-100 transition"
            >
              <Upload className="h-4 w-4" />
              Importar & Mesclar Pacote (.json)
            </button>
            <input ref={jsonInputRef} type="file" accept=".json,application/json" onChange={handleSelectJsonFile} className="hidden" />
          </div>
        </div>

        {/* 2. Interoperabilidade Planilha Excel (.xlsx / .csv) */}
        <div className="hc-card space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Planilha Excel / CSV (Compatível Glide)</h3>
              <p className="text-xs text-slate-500">
                Lê diretamente <em>"Perdidos e Achados (Guarda-Volumes).xlsx"</em> (todas as 25 colunas).
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
            >
              <Upload className="h-4 w-4" />
              Importar Planilha Excel (.xlsx) ou CSV
            </button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleSelectExcelFile}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleExportExcel('xlsx', Boolean(activeEvento))}
                className="touch-target inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4 text-emerald-700" />
                Exportar .XLSX ({activeEvento ? 'Evento' : 'Tudo'})
              </button>
              <button
                type="button"
                onClick={() => handleExportExcel('csv', false)}
                className="touch-target inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4 text-sky-700" />
                Exportar .CSV (Tudo)
              </button>
            </div>
          </div>

          {/* Medidor de localStorage */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-sky-700" />
                Uso do localStorage
              </span>
              <span>
                {storageUsage.kbUsed} KB ({storageUsage.mbUsed} MB) — {storageUsage.percentUsed}%
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${storageUsage.nearLimit ? 'bg-rose-500' : 'bg-teal-600'}`}
                style={{ width: `${Math.max(3, storageUsage.percentUsed)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Fotos são comprimidas automaticamente (~40 KB) para caber dezenas de itens com folga no localStorage.
            </p>
          </div>
        </div>
      </div>

      {/* CONFIGURAÇÕES DESTE EQUIPAMENTO (evita colisão entre múltiplos voluntários!) */}
      <div className="hc-card space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-[#1e3a5f]" />
          <h3 className="text-base font-extrabold text-slate-900">Identidade deste Equipamento & Regras Locais</h3>
        </div>
        <p className="text-xs text-slate-500">
          Se mais de um voluntário usar o app ao mesmo tempo, defina um <strong>Nome do Equipamento</strong> e
          (opcionalmente) um <strong>Prefixo ou Número Inicial de Etiqueta</strong> (ex.: Balcão A começa em 1, Balcão
          B começa em 101 ou prefixo <code>B-</code>).
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <VoiceInput
            label="Nome deste Equipamento"
            value={db.config.deviceName}
            onChange={(v) => updateConfig({ deviceName: v })}
          />
          <VoiceInput
            label="Operador / Voluntário Padrão"
            value={db.config.operadorPadrao}
            onChange={(v) => updateConfig({ operadorPadrao: v })}
          />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Prefixo Etiqueta (opc.)</label>
            <input
              type="text"
              maxLength={4}
              value={db.config.prefixoEtiqueta}
              onChange={(e) => updateConfig({ prefixoEtiqueta: e.target.value.toUpperCase() })}
              placeholder="Ex.: A- ou B-"
              className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Prazo Retenção (dias)</label>
            <input
              type="number"
              min={1}
              value={db.config.prazoRetencaoDias}
              onChange={(e) => updateConfig({ prazoRetencaoDias: Math.max(1, Number(e.target.value)) })}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
          <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={db.config.autoMarcaDaguaEtiqueta}
              onChange={(e) => updateConfig({ autoMarcaDaguaEtiqueta: e.target.checked })}
              className="h-4 w-4 accent-[#1e3a5f]"
            />
            Carimbar número da etiqueta e hora nas fotos capturadas
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={db.config.vozFeedbackFalado}
              onChange={(e) => updateConfig({ vozFeedbackFalado: e.target.checked })}
              className="h-4 w-4 accent-[#1e3a5f]"
            />
            Retorno falado (TTS) nos comandos de voz
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={loadDemoData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100"
          >
            <Sparkles className="h-4 w-4" />
            Adicionar Dados de Demonstração Fictícios
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Limpar TODOS os eventos, itens e relatórios do localStorage deste aparelho? Exporte um backup antes se precisar.',
                )
              ) {
                clearAllData();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            Limpar Base Local
          </button>
        </div>
      </div>

      {/* HISTÓRICO DE SINCRONIZAÇÕES */}
      {db.syncHistory.length > 0 && (
        <div className="hc-card rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <History className="h-4 w-4 text-slate-500" />
            Histórico de Exportações e Mesclagens ({db.syncHistory.length})
          </h3>
          <div className="space-y-2 text-xs">
            {db.syncHistory.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5">
                <div>
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                    {entry.tipo}
                  </span>
                  <span className="ml-2 font-semibold text-slate-800">{entry.detalhes}</span>
                </div>
                <span className="text-[11px] text-slate-500">{new Date(entry.timestamp).toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

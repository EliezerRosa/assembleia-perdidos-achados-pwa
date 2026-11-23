import React, { useEffect, useMemo, useState } from 'react';
import { Check, Download, FileSpreadsheet, FileText, Printer, Save } from 'lucide-react';
import { exportToAcrobatTxt } from '../../services/excelService';
import { buildLegacyDesc, generateId } from '../../services/trackingService';
import { useAppStore } from '../../store/useAppStore';
import type { Item, RelatorioFinal } from '../../types/domain';
import { VoiceInput } from '../common/VoiceInput';

const MESES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const ANEXO1_ROWS_PER_PAGE = 15;

export const FinalReportView: React.FC = () => {
  const { db, activeEvento, saveRelatorio, notify } = useAppStore();

  const [docMode, setDocMode] = useState<'anexo1' | 'relatorio'>('anexo1');
  const [anexoFilter, setAnexoFilter] = useState<'nao_entregues' | 'todos'>('nao_entregues');
  const [anexoPaginationMode, setAnexoPaginationMode] = useState<'auto15' | 'formPagina'>('auto15');
  const [selectedPageFilter, setSelectedPageFilter] = useState<'todas' | number>('todas');

  const existing = useMemo(
    () => (activeEvento ? db.relatorios.find((r) => r.eventoId === activeEvento.id) : undefined),
    [db.relatorios, activeEvento],
  );

  const [form, setForm] = useState<RelatorioFinal>(() => ({
    id: generateId('rel'),
    eventoId: activeEvento?.id ?? '',
    circuito: activeEvento?.circuito ?? 'ES-005',
    eventoTipo: activeEvento?.tipo === 'Congresso' ? 'Congresso' : 'Assembleia',
    parte: activeEvento?.parte ?? 'B',
    data: activeEvento?.data ?? new Date().toISOString().slice(0, 10),
    departamento: 'Perdidos e Achados / Guarda Volume',
    superintendente: activeEvento?.superintendente ?? '',
    ajudantes: activeEvento?.ajudantes ?? '',
    voluntariosNecessarios: activeEvento?.voluntariosNecessarios ?? 5,
    voluntariosUsados: activeEvento?.voluntariosUsados ?? 5,
    dificuldadeAntes: false,
    dificuldadeAntesTexto: '',
    dificuldadeDurante: false,
    dificuldadeDuranteTexto: '',
    dificuldadeApos: false,
    dificuldadeAposTexto: '',
    sugestoes: '',
    responsavelRelatorio: db.config.operadorPadrao,
    congregacaoResponsavel: '',
    salaoAssembleias: 'Guarapari',
    telefoneResponsavel: '',
    enderecoRestituicao: '',
    cidadeAssinatura: 'Guarapari/ES',
    dataAssinatura: new Date().toISOString().slice(0, 10),
    assinaturaNome: activeEvento?.superintendente ?? '',
    updatedAt: new Date().toISOString(),
  }));

  useEffect(() => {
    if (existing) {
      setForm({
        salaoAssembleias: 'Guarapari',
        telefoneResponsavel: '',
        enderecoRestituicao: '',
        ...existing,
      });
    } else if (activeEvento) {
      setForm((prev) => ({
        ...prev,
        id: generateId('rel'),
        eventoId: activeEvento.id,
        circuito: activeEvento.circuito || 'ES-005',
        eventoTipo: activeEvento.tipo === 'Congresso' ? 'Congresso' : 'Assembleia',
        parte: activeEvento.parte || '',
        data: activeEvento.data,
        superintendente: activeEvento.superintendente || prev.superintendente,
        ajudantes: activeEvento.ajudantes || prev.ajudantes,
        voluntariosNecessarios: activeEvento.voluntariosNecessarios || 5,
        voluntariosUsados: activeEvento.voluntariosUsados || 5,
      }));
    }
  }, [existing, activeEvento]);

  const eventItems = useMemo(
    () =>
      (activeEvento ? db.itens.filter((i) => i.eventoId === activeEvento.id) : [])
        .slice()
        .sort((a, b) => a.etiqueta - b.etiqueta),
    [db.itens, activeEvento],
  );

  const metrics = useMemo(
    () => ({
      total: eventItems.length,
      guardados: eventItems.filter((i) => i.status === 'Ainda Guardado' || i.status === 'Em Conferência').length,
      entregues: eventItems.filter((i) => i.status === 'Já Entregue').length,
      despachados: eventItems.filter((i) => i.status === 'DESPACHADO').length,
      guardaVolumes: eventItems.filter((i) => i.categoria === 'Guardado').length,
      pessoas: eventItems.filter((i) => i.categoria === 'Criança' || i.categoria === 'Idoso' || i.categoria === 'Adulto').length,
    }),
    [eventItems],
  );

  /**
   * Replica fielmente o filtro do PDF com JS embutido (Anexo 1):
   * - Padrão: ignora itens com STATUS === "Já Entregue"
   * - Agrupa em páginas de EXATAMENTE 15 linhas (1..15) ou pela Form Página física!
   */
  const anexoPages = useMemo(() => {
    const eligible =
      anexoFilter === 'nao_entregues'
        ? eventItems.filter((i) => i.status !== 'Já Entregue')
        : eventItems;

    if (eligible.length === 0) {
      return [{ pageNum: 1, items: [] as Item[] }];
    }

    if (anexoPaginationMode === 'formPagina') {
      const byPage = new Map<number, Item[]>();
      for (const it of eligible) {
        const p = Math.max(1, it.formPagina || 1);
        const list = byPage.get(p) ?? [];
        list.push(it);
        byPage.set(p, list);
      }
      const pages: Array<{ pageNum: number; items: Item[] }> = [];
      for (const p of Array.from(byPage.keys()).sort((a, b) => a - b)) {
        const group = byPage.get(p)!;
        // Se uma Form Página tiver mais de 15 itens, divide em blocos de 15 sem perder nenhum
        for (let i = 0; i < group.length; i += ANEXO1_ROWS_PER_PAGE) {
          pages.push({ pageNum: p, items: group.slice(i, i + ANEXO1_ROWS_PER_PAGE) });
        }
      }
      return pages;
    }

    // Modo automático: fatia continuamente de 15 em 15 itens (Pág. 1, Pág. 2, ...)
    const pages: Array<{ pageNum: number; items: Item[] }> = [];
    for (let i = 0; i < eligible.length; i += ANEXO1_ROWS_PER_PAGE) {
      pages.push({
        pageNum: Math.floor(i / ANEXO1_ROWS_PER_PAGE) + 1,
        items: eligible.slice(i, i + ANEXO1_ROWS_PER_PAGE),
      });
    }
    return pages;
  }, [eventItems, anexoFilter, anexoPaginationMode]);

  const visibleAnexoPages = useMemo(() => {
    if (selectedPageFilter === 'todas') return anexoPages;
    const filtered = anexoPages.filter((p) => p.pageNum === selectedPageFilter);
    return filtered.length > 0 ? filtered : anexoPages;
  }, [anexoPages, selectedPageFilter]);

  const handleDownloadAcrobatTxt = () => {
    const { blob, filename } = exportToAcrobatTxt(db, activeEvento?.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    notify('Arquivo PA.txt exportado (compatível com o PDF Acrobat JS legado)!', 'success');
  };

  const parsedSignDate = form.dataAssinatura ? form.dataAssinatura.split('-') : ['', '', ''];
  const diaAss = parsedSignDate[2] || '__';
  const mesAss = parsedSignDate[1] ? MESES_PT[Number(parsedSignDate[1]) - 1] ?? '______' : '______';
  const anoAss = parsedSignDate[0] || '20__';
  const [evY, evM, evD] = (form.data || '').split('-');
  const dataBr = evD && evM && evY ? `${evD}/${evM}/${evY}` : form.data || '__/__/____';

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Barra de Ações & Seletor de Documento Oficial (não aparece na impressão) */}
      <div className="no-print hc-card space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Documentos Oficiais & Impressão A4</h2>
            <p className="text-xs text-slate-500">
              Substitui o preenchimento manual / PDF Acrobat JS — gera automaticamente todas as páginas do{' '}
              <strong>Anexo 1 (15 itens/pág.)</strong> e o <strong>Relatório Final</strong> prontos para PDF A4.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveRelatorio(form)}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" />
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                saveRelatorio(form);
                window.setTimeout(() => window.print(), 150);
              }}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#142944]"
            >
              <Printer className="h-4 w-4" />
              Imprimir / Salvar PDF A4
            </button>
          </div>
        </div>

        {/* Abas dos 2 Formulários Oficiais */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setDocMode('anexo1')}
            className={`touch-target inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-extrabold transition ${
              docMode === 'anexo1'
                ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-xs'
                : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            ANEXO 1 — Relação dos Itens Encontrados (Pág. 16/19)
          </button>
          <button
            type="button"
            onClick={() => setDocMode('relatorio')}
            className={`touch-target inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-extrabold transition ${
              docMode === 'relatorio'
                ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-xs'
                : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            Relatório Final — Após o Evento
          </button>
          {docMode === 'anexo1' && (
            <button
              type="button"
              onClick={handleDownloadAcrobatTxt}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              title="Exportar PA.txt delimitado por TAB caso queira usar no PDF Acrobat JS legado"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar PA.txt (PDF Legado)
            </button>
          )}
        </div>
      </div>

      {docMode === 'anexo1' ? (
        <>
          {/* Controles do ANEXO 1 (não imprime) */}
          <div className="no-print hc-card space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600">
                  Itens listados no Anexo 1
                </label>
                <select
                  value={anexoFilter}
                  onChange={(e) => {
                    setAnexoFilter(e.target.value as 'nao_entregues' | 'todos');
                    setSelectedPageFilter('todas');
                  }}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  <option value="nao_entregues">Padrão Acrobat JS — Ignorar "Já Entregue"</option>
                  <option value="todos">Todos os itens do evento (inclui entregues)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600">Paginação (15 linhas/folha)</label>
                <select
                  value={anexoPaginationMode}
                  onChange={(e) => {
                    setAnexoPaginationMode(e.target.value as 'auto15' | 'formPagina');
                    setSelectedPageFilter('todas');
                  }}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  <option value="auto15">Automática (15 itens por página A4)</option>
                  <option value="formPagina">Por "Form Página" cadastrada no item</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-600">
                  Selecionar Página ({anexoPages.length} folha{anexoPages.length > 1 ? 's' : ''})
                </label>
                <select
                  value={String(selectedPageFilter)}
                  onChange={(e) =>
                    setSelectedPageFilter(e.target.value === 'todas' ? 'todas' : Number(e.target.value))
                  }
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  <option value="todas">Imprimir TODAS as páginas ({anexoPages.length})</option>
                  {anexoPages.map((p, idx) => (
                    <option key={`${p.pageNum}_${idx}`} value={p.pageNum}>
                      Somente Página {p.pageNum} ({p.items.length} itens)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <VoiceInput
                label="Salão de Assembleias"
                value={form.salaoAssembleias ?? 'Guarapari'}
                onChange={(v) => setForm({ ...form, salaoAssembleias: v })}
                placeholder="Ex.: Guarapari"
              />
              <VoiceInput
                label="Circuito / Congresso (Cabeçalho)"
                value={form.circuito}
                onChange={(v) => setForm({ ...form, circuito: v })}
                placeholder="Ex.: ES-005 Assembleia com Representante"
              />
              <VoiceInput
                label="Responsável pelo Depto."
                value={form.responsavelRelatorio}
                onChange={(v) => setForm({ ...form, responsavelRelatorio: v })}
                placeholder="Nome completo"
              />
              <VoiceInput
                label="Telefone do Responsável"
                value={form.telefoneResponsavel ?? ''}
                onChange={(v) => setForm({ ...form, telefoneResponsavel: v })}
                placeholder="(27) 9..."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <VoiceInput
                label="Congregação"
                value={form.congregacaoResponsavel}
                onChange={(v) => setForm({ ...form, congregacaoResponsavel: v })}
                placeholder="Nome da congregação / cidade"
              />
              <VoiceInput
                label="Endereço para Restituição dos Itens"
                value={form.enderecoRestituicao ?? ''}
                onChange={(v) => setForm({ ...form, enderecoRestituicao: v })}
                placeholder="Rua, número, bairro, cidade, CEP..."
              />
            </div>
          </div>

          {/* FOLHAS A4 OFICIAIS — ANEXO 1 (espelho exato do Manual Pág. 16/19 com 15 linhas por folha!) */}
          <div className="space-y-6">
            {visibleAnexoPages.map((page, pageIdx) => {
              const isLast = pageIdx === visibleAnexoPages.length - 1;
              return (
                <div
                  key={`${page.pageNum}_${pageIdx}`}
                  className={`print-sheet rounded-2xl border border-slate-300 bg-white p-6 text-black shadow-md sm:p-8 ${
                    !isLast ? 'print-page-break' : ''
                  }`}
                  style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                >
                  {/* Topo (ANEXO 1) */}
                  <div className="mb-1 text-center text-xs font-bold tracking-wide">(ANEXO 1)</div>

                  {/* Moldura Superior Oficial */}
                  <div className="border border-slate-500">
                    {/* Linha 1: SALÃO DE ASSEMBLEIAS + Código + Página */}
                    <div className="flex items-baseline justify-between border-b border-slate-500 px-3 py-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm tracking-wide uppercase">SALÃO DE ASSEMBLEIAS</span>
                        <span className="text-xl font-bold">{form.salaoAssembleias || 'Guarapari'}</span>
                      </div>
                      <div className="flex items-baseline gap-5 text-xs font-semibold">
                        <span>{activeEvento?.codigo || form.circuito}</span>
                        <span className="font-bold">{page.pageNum}</span>
                      </div>
                    </div>

                    {/* Linha 2: Título DEPARTAMENTO DE PERDIDOS E ACHADOS */}
                    <div className="border-b border-slate-500 py-1.5 text-center text-base font-bold tracking-wide uppercase">
                      DEPARTAMENTO DE PERDIDOS E ACHADOS
                    </div>

                    {/* Linha 3: Circuito / Congresso + Data */}
                    <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                      <div>
                        <span>Circuito / Congresso: </span>
                        <strong className="font-bold">
                          {form.circuito} {activeEvento?.tipo ? `(${activeEvento.tipo})` : ''}
                        </strong>
                      </div>
                      <div>
                        <span>Data: </span>
                        <strong className="underline decoration-1 underline-offset-2">{dataBr}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de 15 Linhas — RELAÇÃO DOS ITENS ENCONTRADOS */}
                  <div className="mt-3 border border-slate-600">
                    <div className="border-b border-slate-600 py-1 text-center text-xs font-bold uppercase tracking-wider">
                      RELAÇÃO DOS ITENS ENCONTRADOS:
                    </div>

                    <div className="divide-y divide-slate-400">
                      {Array.from({ length: ANEXO1_ROWS_PER_PAGE }, (_, rowIdx) => {
                        const rowItem = page.items[rowIdx];
                        return (
                          <div key={rowIdx} className="flex min-h-[38px] items-start gap-1.5 px-2 py-1 text-[11.5px] leading-snug">
                            <span className="w-5 shrink-0 font-semibold text-slate-600">{rowIdx + 1}.</span>
                            <div className="min-w-0 flex-1 break-words text-black">
                              {rowItem ? buildLegacyDesc(rowItem) : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Rodapé Responsável, Congregação, Telefone e Endereço para Restituição */}
                    <div className="border-t-2 border-slate-600 text-xs">
                      <div className="border-b border-slate-500 px-2.5 py-1.5">
                        <div className="font-semibold">Nome do responsável pelo departamento:</div>
                        <div className="pl-2 text-sm font-bold">{form.responsavelRelatorio || '\u00A0'}</div>
                      </div>
                      <div className="grid grid-cols-12 border-b border-slate-500 px-2.5 py-1.5">
                        <div className="col-span-7">
                          <span>Congregação: </span>
                          <strong className="text-sm font-bold">{form.congregacaoResponsavel || ''}</strong>
                        </div>
                        <div className="col-span-5">
                          <span>Telefone: </span>
                          <strong className="text-sm font-bold">{form.telefoneResponsavel || ''}</strong>
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5">
                        <div className="text-[11px] font-semibold uppercase">ENDEREÇO PARA RESTITUIÇÃO DOS ITENS:</div>
                        <div className="pl-3 text-sm font-bold">{form.enderecoRestituicao || '\u00A0'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Linha de rodapé do Manual */}
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-700">
                    <span>Manual de Funcionamento Salão de Assembleias de {form.salaoAssembleias || 'Guarapari'} – ES</span>
                    <span>
                      Pág. 16/19{visibleAnexoPages.length > 1 ? ` • Folha ${pageIdx + 1}/${visibleAnexoPages.length}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Formulário Editável do Relatório Final (tela) */}
          <div className="no-print hc-card space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid gap-3 sm:grid-cols-4">
              <VoiceInput
                label="Circuito"
                value={form.circuito}
                onChange={(v) => setForm({ ...form, circuito: v })}
                placeholder="ES-005"
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Tipo</label>
                <select
                  value={form.eventoTipo}
                  onChange={(e) => setForm({ ...form, eventoTipo: e.target.value as 'Assembleia' | 'Congresso' })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="Assembleia">Assembleia</option>
                  <option value="Congresso">Congresso</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Parte</label>
                <select
                  value={form.parte}
                  onChange={(e) => setForm({ ...form, parte: e.target.value as RelatorioFinal['parte'] })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">Nenhuma</option>
                  <option value="A">Parte A</option>
                  <option value="B">Parte B</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <VoiceInput
                label="Departamento"
                value={form.departamento}
                onChange={(v) => setForm({ ...form, departamento: v })}
              />
              <VoiceInput
                label="Superintendente"
                value={form.superintendente}
                onChange={(v) =>
                  setForm({ ...form, superintendente: v, assinaturaNome: prevOrVal(form.assinaturaNome, v) })
                }
              />
              <VoiceInput
                label="Ajudantes"
                value={form.ajudantes}
                onChange={(v) => setForm({ ...form, ajudantes: v })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Voluntários Necessários
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.voluntariosNecessarios}
                  onChange={(e) => setForm({ ...form, voluntariosNecessarios: Number(e.target.value) })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Voluntários Usados</label>
                <input
                  type="number"
                  min={0}
                  value={form.voluntariosUsados}
                  onChange={(e) => setForm({ ...form, voluntariosUsados: Number(e.target.value) })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
            </div>

            {(
              [
                ['antes', 'Alguma dificuldade ANTES do evento?', 'dificuldadeAntes', 'dificuldadeAntesTexto'],
                ['durante', 'Alguma dificuldade DURANTE o evento?', 'dificuldadeDurante', 'dificuldadeDuranteTexto'],
                ['apos', 'Alguma dificuldade APÓS o evento?', 'dificuldadeApos', 'dificuldadeAposTexto'],
              ] as const
            ).map(([key, label, boolKey, textKey]) => (
              <div key={key} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-800">{label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, [boolKey]: true })}
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        form[boolKey] ? 'bg-amber-600 text-white' : 'border border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      SIM
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, [boolKey]: false })}
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        !form[boolKey] ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      NÃO
                    </button>
                  </div>
                </div>
                <VoiceInput
                  multiline
                  rows={2}
                  value={form[textKey]}
                  onChange={(v) => setForm({ ...form, [textKey]: v })}
                  placeholder="Descreva observações (ou dite clicando no microfone)..."
                />
              </div>
            ))}

            <VoiceInput
              label="Sugestões para os próximos eventos"
              multiline
              rows={3}
              value={form.sugestoes}
              onChange={(v) => setForm({ ...form, sugestoes: v })}
              placeholder="Sugestões de melhoria..."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <VoiceInput
                label="Responsável pelo Relatório"
                value={form.responsavelRelatorio}
                onChange={(v) => setForm({ ...form, responsavelRelatorio: v })}
              />
              <VoiceInput
                label="Congregação"
                value={form.congregacaoResponsavel}
                onChange={(v) => setForm({ ...form, congregacaoResponsavel: v })}
              />
              <VoiceInput
                label="Nome na Assinatura"
                value={form.assinaturaNome}
                onChange={(v) => setForm({ ...form, assinaturaNome: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <VoiceInput
                  label="Cidade/UF"
                  value={form.cidadeAssinatura}
                  onChange={(v) => setForm({ ...form, cidadeAssinatura: v })}
                />
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">Data Assin.</label>
                  <input
                    type="date"
                    value={form.dataAssinatura}
                    onChange={(e) => setForm({ ...form, dataAssinatura: e.target.value })}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FOLHA OFICIAL A4 — Relatório Final */}
          <div className="print-sheet rounded-2xl border border-slate-300 bg-white p-6 text-slate-900 shadow-md sm:p-8">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex-1 pr-3 text-right">
                <p className="text-sm font-bold leading-tight">Salão de Assembleias das</p>
                <p className="text-sm font-bold leading-tight">Testemunhas de Jeová</p>
                <p className="text-[10px] text-slate-600">Rod. Manoel Loyola, 7190</p>
                <p className="text-[10px] text-slate-600">Comunidade Amarelos / Guarapari, ES – 29.226-510</p>
              </div>
              <div className="flex h-14 w-28 items-center justify-center rounded border border-slate-300 bg-gradient-to-br from-amber-100 to-sky-100 text-center text-[10px] font-bold text-[#1e3a5f]">
                Salão de Assembleias
                <br />
                Guarapari / ES
              </div>
            </div>

            <div className="mb-3 bg-[#ffff00] py-1.5 text-center text-lg font-extrabold tracking-tight text-black">
              Relatório Final - Após o Evento
            </div>

            <table className="mb-4 w-full border-collapse border border-black text-xs">
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1.5 font-semibold">
                    Circuito: <span className="font-bold text-blue-800">{form.circuito}</span>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    Assembleia
                    <br />( <span className="font-bold text-blue-800">{form.eventoTipo === 'Assembleia' ? '✓' : ' '}</span> )
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    Congresso
                    <br />( <span className="font-bold text-blue-800">{form.eventoTipo === 'Congresso' ? '✓' : ' '}</span> )
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    Parte A
                    <br />( <span className="font-bold text-blue-800">{form.parte === 'A' ? '✓' : ' '}</span> )
                  </td>
                  <td className="border border-black px-2 py-1.5 text-center">
                    Parte B
                    <br />( <span className="font-bold text-blue-800">{form.parte === 'B' ? '✓' : ' '}</span> )
                  </td>
                  <td className="border border-black px-2 py-1.5">
                    Data: <span className="font-bold text-blue-800">{evD || '__'}/{evM || '__'}/{evY || '20__'}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mb-4 space-y-1 text-xs">
              <p>
                Departamento: <span className="font-bold text-blue-800">{form.departamento}</span>
              </p>
              <p>
                Superintendente: <span className="font-bold text-blue-800">{form.superintendente || '—'}</span>
              </p>
              <p>
                Ajudantes: <span className="font-bold text-blue-800">{form.ajudantes || '—'}</span>
              </p>
              <div className="grid grid-cols-2 pt-1">
                <p>
                  Voluntários Necessários:{' '}
                  <span className="font-bold text-blue-800">{form.voluntariosNecessarios}</span>
                </p>
                <p>
                  Voluntários Usados: <span className="font-bold text-blue-800">{form.voluntariosUsados}</span>
                </p>
              </div>
            </div>

            {(
              [
                ['Alguma dificuldade antes do evento:', form.dificuldadeAntes, form.dificuldadeAntesTexto],
                ['Alguma dificuldade durante o evento:', form.dificuldadeDurante, form.dificuldadeDuranteTexto],
                ['Alguma dificuldade após o evento:', form.dificuldadeApos, form.dificuldadeAposTexto],
              ] as const
            ).map(([title, isYes, txt]) => (
              <div key={title} className="mb-3 border border-black">
                <div className="flex items-center justify-between bg-slate-200 px-2.5 py-1 text-xs font-semibold">
                  <span>{title}</span>
                  <span>
                    ( <span className="font-bold text-blue-800">{isYes ? '✓' : ' '}</span> ) SIM &nbsp;&nbsp; (
                    <span className="font-bold text-blue-800">{!isYes ? '✓' : ' '}</span> ) NÃO
                  </span>
                </div>
                <div className="min-h-[54px] whitespace-pre-wrap p-2 text-xs text-blue-900">{txt}</div>
              </div>
            ))}

            <div className="mb-4 border border-black">
              <div className="bg-slate-200 px-2.5 py-1 text-xs font-semibold">Sugestões para os próximos eventos</div>
              <div className="min-h-[64px] whitespace-pre-wrap p-2 text-xs text-blue-900">{form.sugestoes}</div>
            </div>

            <div className="mb-4 rounded border border-slate-300 bg-slate-50 p-2.5 text-[11px]">
              <p className="font-bold text-slate-800">
                Resumo Automático do Evento ({activeEvento?.codigo ?? 'Geral'}):
              </p>
              <div className="mt-1 flex flex-wrap gap-4 text-slate-700">
                <span>
                  Total de Registros: <strong>{metrics.total}</strong>
                </span>
                <span>
                  Entregues aos Donos: <strong>{metrics.entregues}</strong>
                </span>
                <span>
                  Ainda Guardados: <strong>{metrics.guardados}</strong>
                </span>
                <span>
                  Guarda-Volumes: <strong>{metrics.guardaVolumes}</strong>
                </span>
                <span>
                  Pessoas/Crianças Atendidas: <strong>{metrics.pessoas}</strong>
                </span>
                {metrics.despachados > 0 && (
                  <span>
                    Despachados (SA): <strong>{metrics.despachados}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1 border border-black p-2 text-xs">
              <div className="border-b border-black pb-1">
                Responsável pelo Relatório:{' '}
                <span className="font-bold text-blue-800">{form.responsavelRelatorio || '—'}</span>
              </div>
              <div>
                Congregação: <span className="font-bold text-blue-800">{form.congregacaoResponsavel || '—'}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-end text-xs">
              <div className="w-72 text-center">
                <p className="font-bold text-blue-800">{form.assinaturaNome || form.superintendente}</p>
                <div className="mt-1 border-t border-black pt-1 text-[10px]">Ass. Responsável pelo Relatório</div>
              </div>
              <p className="mt-4 text-xs">
                {form.cidadeAssinatura}, <strong className="text-blue-800 underline">{diaAss}</strong> de{' '}
                <strong className="text-blue-800 underline">{mesAss}</strong> de{' '}
                <strong className="text-blue-800 underline">{anoAss}</strong>.
              </p>
            </div>

            <p className="no-print mt-4 flex items-center gap-1 text-[11px] text-emerald-700">
              <Check className="h-3.5 w-3.5" /> Dica: Clique em "Imprimir / Salvar PDF A4" para exportar este relatório
              limpo sem menus.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

function prevOrVal(prev: string, next: string): string {
  return prev.trim() ? prev : next;
}

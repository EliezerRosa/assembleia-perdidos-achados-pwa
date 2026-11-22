import React, { useEffect, useMemo, useState } from 'react';
import { Check, Printer, Save } from 'lucide-react';
import { generateId } from '../../services/trackingService';
import { useAppStore } from '../../store/useAppStore';
import type { RelatorioFinal } from '../../types/domain';
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

export const FinalReportView: React.FC = () => {
  const { db, activeEvento, saveRelatorio } = useAppStore();

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
    cidadeAssinatura: 'Guarapari/ES',
    dataAssinatura: new Date().toISOString().slice(0, 10),
    assinaturaNome: activeEvento?.superintendente ?? '',
    updatedAt: new Date().toISOString(),
  }));

  useEffect(() => {
    if (existing) {
      setForm(existing);
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

  const metrics = useMemo(() => {
    const items = activeEvento ? db.itens.filter((i) => i.eventoId === activeEvento.id) : [];
    return {
      total: items.length,
      guardados: items.filter((i) => i.status === 'Ainda Guardado' || i.status === 'Em Conferência').length,
      entregues: items.filter((i) => i.status === 'Já Entregue').length,
      despachados: items.filter((i) => i.status === 'DESPACHADO').length,
      guardaVolumes: items.filter((i) => i.categoria === 'Guardado').length,
      pessoas: items.filter((i) => i.categoria === 'Criança' || i.categoria === 'Idoso' || i.categoria === 'Adulto').length,
    };
  }, [db.itens, activeEvento]);

  const parsedSignDate = form.dataAssinatura ? form.dataAssinatura.split('-') : ['', '', ''];
  const diaAss = parsedSignDate[2] || '__';
  const mesAss = parsedSignDate[1] ? MESES_PT[Number(parsedSignDate[1]) - 1] ?? '______' : '______';
  const anoAss = parsedSignDate[0] || '20__';
  const [evY, evM, evD] = (form.data || '').split('-');

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Barra de Ações (não aparece na impressão) */}
      <div className="no-print hc-card flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Relatório Final — Após o Evento</h2>
          <p className="text-xs text-slate-500">
            Espelho oficial do formulário do Salão de Assembleias (Guarapari/ES), preenchível por voz e pronto para
            impressão / PDF A4.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => saveRelatorio(form)}
            className="touch-target inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
          >
            <Save className="h-4 w-4" />
            Salvar Relatório
          </button>
          <button
            type="button"
            onClick={() => {
              saveRelatorio(form);
              window.setTimeout(() => window.print(), 150);
            }}
            className="touch-target inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#142944]"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF A4
          </button>
        </div>
      </div>

      {/* Formulário Editável (tela) */}
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
            onChange={(v) => setForm({ ...form, superintendente: v, assinaturaNome: prevOrVal(form.assinaturaNome, v) })}
          />
          <VoiceInput
            label="Ajudantes"
            value={form.ajudantes}
            onChange={(v) => setForm({ ...form, ajudantes: v })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Voluntários Necessários</label>
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

        {/* 3 Blocos de Dificuldades */}
        {(
          [
            ['antes', 'Alguma dificuldade ANTES do evento?', 'dificuldadeAntes', 'dificuldadeAntesTexto'],
            ['durante', 'Alguma dificuldade DURANTE o evento?', 'dificuldadeDurante', 'dificuldadeDuranteTexto'],
            ['apos', 'Alguma dificuldade APÓS o evento?', 'dificuldadeApos', 'dificuldadeAposTexto'],
          ] as const
        ).map(([key, label, boolKey, textKey]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-800">{label}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, [boolKey]: true })}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    form[boolKey] ? 'bg-amber-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  SIM
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, [boolKey]: false })}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    !form[boolKey] ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
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

      {/* FOLHA OFICIAL A4 (Pré-visualização & Alvo de Impressão fiel ao PDF!) */}
      <div className="print-sheet rounded-2xl border border-slate-300 bg-white p-6 text-slate-900 shadow-md sm:p-8">
        {/* Cabeçalho Salão de Assembleias */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="text-right flex-1 pr-3">
            <p className="text-sm font-bold leading-tight">Salão de Assembleias das</p>
            <p className="text-sm font-bold leading-tight">Testemunhas de Jeová</p>
            <p className="text-[10px] text-slate-600">Rod. Manoel Loyola, 7190</p>
            <p className="text-[10px] text-slate-600">Comunidade Amarelos / Guarapari, ES – 29.226-510</p>
          </div>
          <div className="flex h-14 w-28 items-center justify-center rounded border border-slate-300 bg-gradient-to-br from-amber-100 to-sky-100 text-center text-[10px] font-bold text-[#1e3a5f]">
            Salão de Assembleias<br />Guarapari / ES
          </div>
        </div>

        {/* Faixa Amarela Oficial */}
        <div className="mb-3 bg-[#ffff00] py-1.5 text-center text-lg font-extrabold tracking-tight text-black">
          Relatório Final - Após o Evento
        </div>

        {/* Tabela Topo */}
        <table className="mb-4 w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1.5 font-semibold">
                Circuito: <span className="font-bold text-blue-800">{form.circuito}</span>
              </td>
              <td className="border border-black px-2 py-1.5 text-center">
                Assembleia<br />
                ( <span className="font-bold text-blue-800">{form.eventoTipo === 'Assembleia' ? '✓' : ' '}</span> )
              </td>
              <td className="border border-black px-2 py-1.5 text-center">
                Congresso<br />
                ( <span className="font-bold text-blue-800">{form.eventoTipo === 'Congresso' ? '✓' : ' '}</span> )
              </td>
              <td className="border border-black px-2 py-1.5 text-center">
                Parte A<br />
                ( <span className="font-bold text-blue-800">{form.parte === 'A' ? '✓' : ' '}</span> )
              </td>
              <td className="border border-black px-2 py-1.5 text-center">
                Parte B<br />
                ( <span className="font-bold text-blue-800">{form.parte === 'B' ? '✓' : ' '}</span> )
              </td>
              <td className="border border-black px-2 py-1.5">
                Data: <span className="font-bold text-blue-800">{evD || '__'}/{evM || '__'}/{evY || '20__'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Dados do Departamento */}
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
              Voluntários Necessários: <span className="font-bold text-blue-800">{form.voluntariosNecessarios}</span>
            </p>
            <p>
              Voluntários Usados: <span className="font-bold text-blue-800">{form.voluntariosUsados}</span>
            </p>
          </div>
        </div>

        {/* Quadros de Dificuldades e Sugestões */}
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

        {/* Resumo Estatístico Automático do Evento */}
        <div className="mb-4 rounded border border-slate-300 bg-slate-50 p-2.5 text-[11px]">
          <p className="font-bold text-slate-800">
            Resumo Automático do Evento ({activeEvento?.codigo ?? 'Geral'}):
          </p>
          <div className="mt-1 flex flex-wrap gap-4 text-slate-700">
            <span>Total de Registros: <strong>{metrics.total}</strong></span>
            <span>Entregues aos Donos: <strong>{metrics.entregues}</strong></span>
            <span>Ainda Guardados: <strong>{metrics.guardados}</strong></span>
            <span>Guarda-Volumes: <strong>{metrics.guardaVolumes}</strong></span>
            <span>Pessoas/Crianças Atendidas: <strong>{metrics.pessoas}</strong></span>
            {metrics.despachados > 0 && <span>Despachados (SA): <strong>{metrics.despachados}</strong></span>}
          </div>
        </div>

        {/* Rodapé Responsável & Assinatura */}
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
          <Check className="h-3.5 w-3.5" /> Dica: Clique em "Imprimir / Salvar PDF A4" para exportar este relatório limpo sem menus.
        </p>
      </div>
    </div>
  );
};

function prevOrVal(prev: string, next: string): string {
  return prev.trim() ? prev : next;
}

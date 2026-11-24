import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Network } from 'lucide-react';

interface DiagramSpec {
  id: string;
  title: string;
  subtitle: string;
  code: string;
}

const DIAGRAMS: DiagramSpec[] = [
  {
    id: 'mer',
    title: '1. MER Completo (3 Apps Embutidos)',
    subtitle: '17 entidades: Achados & Guarda-Volumes + Presidência do Congresso + Resumo de A Sentinela + Equipe.',
    code: `erDiagram
    EVENTO ||--o{ ITEM : "achados (1:N)"
    EVENTO ||--o{ ITEM_PROCURADO : "procurados (1:N)"
    EVENTO ||--o| RELATORIO_FINAL : "relatorio (1:1)"
    ITEM ||--|{ RASTREIO_EVENTO : "rastreio (1:N)"
    ITEM }o--o{ ITEM_PROCURADO : "match (N:M)"
    TIPO_ITEM_CATALOGO ||--o{ ITEM : "classifica (1:N)"

    EVENTO ||--o{ VOLUNTARIO : "equipe (1:N)"
    EVENTO ||--o{ PROGRAMA_PARTE : "programa (1:N)"
    EVENTO ||--o{ LEMBRETE_AGENDA : "agenda_rbac (1:N)"
    EVENTO ||--o{ DOCUMENTO_REFERENCIA : "docs (1:N)"
    EVENTO ||--o{ SENTINELA_ESTUDO : "sentinela (1:N)"
    EVENTO ||--o{ CONVERSA_MENSAGEM : "chat (1:N)"

    VOLUNTARIO ||--o{ PROGRAMA_PARTE : "orador/sub (1:N)"
    VOLUNTARIO ||--o{ PARTICIPACAO_PROGRAMA : "demos (1:N)"
    VOLUNTARIO ||--o{ SENTINELA_COMENTARIO : "comentarista/sub (1:N)"

    PROGRAMA_PARTE ||--o{ PARTICIPACAO_PROGRAMA : "participantes (1:N)"
    PROGRAMA_PARTE ||--o{ GUIA_AUDIO_VIDEO : "dicas_play (1:N)"
    SENTINELA_ESTUDO ||--o{ SENTINELA_COMENTARIO : "ordem_cascata (1:N)"
    CONFIG_DISPOSITIVO ||--o{ SYNC_LOG : "audita (1:N)"

    EVENTO {
      string id PK "fk_id_Eventos"
      string tipo "Assembleia | Congresso"
      string codigo "CO-ES005 | ES-005.27.1"
      string status "ativo | encerrado"
    }
    VOLUNTARIO {
      string id PK "vol_*"
      string nome
      string departamento "15 departamentos"
      string funcaoSetor "Presidente|Sup.Prog|Capitao|Vol"
      boolean habilitadoSentinela
      boolean habilitadoDemos
    }
    PROGRAMA_PARTE {
      string id PK "prg_*"
      string dia "Sexta | Sabado | Domingo"
      datetime dataHoraInicioProgramada
      int tempoProgramadoMin
      string tipo "14 tipos"
      string formato "Ao Vivo | Video | Audio"
      json substitutos "1o, 2o e 3o"
      boolean checkInDia1
      boolean checkIn30MinDia
      boolean checkIn30MinPalco
      boolean ensaioPalcoFeito
      string modoCronometro "parado|ao_vivo|ensaio_pessoal|concluido"
    }
    PARTICIPACAO_PROGRAMA {
      string id PK "prt_*"
      string programaParteId FK
      string tipoParticipacao "Experiencias|Demo|Encenacao|Entrevista"
      boolean ensaioConfirmado
    }
    GUIA_AUDIO_VIDEO {
      string id PK "gav_*"
      string programaParteId FK
      int secaoSequencia
      string midiaTipo "Video|Audio|Imagem|Slide"
      string dicaPlay "Deixa exata operador"
      boolean executado "Ativar Play"
    }
    SENTINELA_ESTUDO {
      string id PK "snt_*"
      string tituloArtigo
      string horaInicio "Base cascata 10:30"
      int duracaoPrevistaMin
    }
    SENTINELA_COMENTARIO {
      string id PK "scm_*"
      string estudoId FK
      int ordenacao "1..N cascata"
      int tempoSegundos "30s padrao"
      string posicaoPalco "ESQUERDA | DIREITA | TRIBUNA"
      boolean presenteDia1
      boolean ensaioPalcoFeito
      boolean jaFeito
      text imagemRelacionada "EXIBIR esta imagem"
      json backupSnapshot "Salvar/Recuperar"
    }
    ITEM {
      string id PK
      int etiqueta
      int formPagina "15 linhas/pag"
      string valor "Baixo..Precioso"
      string status "Guardado|Conf|Entregue|DESPACHADO"
    }`,
  },
  {
    id: 'states-presidencia',
    title: '2. UML — Estados: Cronômetro Dual-Mode (Presidência)',
    subtitle: 'Fluxo Ao Vivo vs Ensaio Pessoal com alertas de último minuto (-1 min) e estouro.',
    code: `stateDiagram-v2
    [*] --> Parado : Parte cadastrada na grade 3d x 2t
    Parado --> EnsaioPessoal : INICIAR ENSAIO PESSOAL
    EnsaioPessoal --> Parado : Encerrar Ensaio (nao fecha a parte oficial)
    Parado --> AoVivo_Normal : INICIO da Parte (grava inicioRealIso)
    AoVivo_Normal --> AoVivo_UltimoMinuto : Restante <= 60s (Alerta Ambar -1 min)
    AoVivo_UltimoMinuto --> AoVivo_Estourado : Restante < 0s (Alerta Vermelho PASSOU DA HORA)
    AoVivo_Normal --> Concluido : FIM da Parte (congela duracao real)
    AoVivo_UltimoMinuto --> Concluido : FIM da Parte
    AoVivo_Estourado --> Concluido : FIM da Parte
    Concluido --> Parado : RESTAURAR Parte`,
  },
  {
    id: 'states-achados',
    title: '3. UML — Estados: Ciclo de Vida (Achados & GV)',
    subtitle: 'Foto 1 → Etiqueta Gêmea → Foto 2, Políticas §55–58, Contas, Destinar SA >=60d e Reverter <7d.',
    code: `stateDiagram-v2
    [*] --> Recepcao_Foto1 : Item/Pessoa chega ao balcao
    Recepcao_Foto1 --> Etiquetagem_Dupla : Foto 1 (Item + Etiqueta #N)
    Etiquetagem_Dupla --> Registro_Foto2 : Etiqueta gemea Formulario (Pag X)
    Registro_Foto2 --> Ainda_Guardado : Foto 2 + Rastreio
    Registro_Foto2 --> Ja_Entregue : Entrega imediata
    Ainda_Guardado --> Em_Conferencia : Solicitante descreve / Procurado
    Em_Conferencia --> Ainda_Guardado : Nao conferiu
    Em_Conferencia --> Ja_Entregue : Confirmado + Foto 3
    Ainda_Guardado --> Entregue_Contas : Dinheiro (§57)
    Ainda_Guardado --> Retido_60d : >= 60 dias
    Retido_60d --> Despachado_SA : SA escolhe DOAR | VENDER | DESCARTAR
    Despachado_SA --> Ainda_Guardado : Reverter Despacho < 7 dias`,
  },
  {
    id: 'seq-sentinela',
    title: '4. UML — Sequência: Resumo de A Sentinela (Cascata & Áudio)',
    subtitle: 'Reordenação da ordem de entrada, cascata de segundos, alerta de lado repetido e player Áudio Completo.',
    code: `sequenceDiagram
    actor Dir as Dirigente / Palco
    participant View as SentinelaView / DetailModal
    participant Svc as SentinelaService
    participant Audio as MediaRecorder / Web Speech
    participant Store as localStorage v2

    Dir->>View: Reordena pergunta (Subir/Descer) ou altera tempo (30s)
    View->>Svc: reorderSentinelaComentario() + computeSentinelaSchedule()
    Svc-->>View: Recalcula HH:MM:SS em cascata + detecta lado repetido (ESQUERDA/DIREITA)
    Dir->>View: Clica "Salvar Comentario (Backup)"
    View->>Store: Persiste backupSnapshot
    Dir->>Audio: Grava audio offline (16kbps) ou dita texto pt-BR
    Audio-->>Store: Salva audioComentario e texto transcrito
    Dir->>View: Inicia "Audio Completo" (Ensaio Sequencial)
    loop Ordem 1..N
        View->>Audio: Reproduz Pergunta -> Comentario -> Conectivo (audio ou fallback TTS)
    end`,
  },
  {
    id: 'seq-presidencia',
    title: '5. UML — Sequência: Presidência Ao Vivo + Guia A/V',
    subtitle: 'Check-in 3 etapas, WhatsApp Salmo 134:3, Cronômetro Ao Vivo e Dica Play.',
    code: `sequenceDiagram
    actor Pres as Presidente / Sup. Programa
    participant View as PresidenciaHub / ProgramaView
    participant Svc as PresidenciaService
    participant AV as GuiaAV (Ativar Play)
    participant Store as localStorage v2

    Pres->>View: Marca Check-in (1o Dia, 30m Dia, 30m Palco) + Ensaio Palco OK
    View->>Store: Salva flags na ProgramaParte
    Pres->>View: Clica "INICIO da Parte (Ao Vivo)"
    View->>Store: modoCronometro = ao_vivo
    loop A cada 1s
        View->>Svc: computeStopwatchStatus(parte, nowMs)
        Svc-->>View: Atualiza barra + alertas -1 min / PASSOU DA HORA
    end
    Pres->>AV: Acompanha Dica Play e clica "PLAY OK"
    AV->>Store: guiaAV.executado = true
    Pres->>View: Clica "FIM da Parte" -> congela duracao real`,
  },
  {
    id: 'classes',
    title: '6. UML — Classes (Domínio & 8 Serviços Puros)',
    subtitle: 'Separação limpa entre AppDatabase v2 e serviços puros testados via Vitest.',
    code: `classDiagram
    class AppDatabase {
      +number schemaVersion = 2
      +Evento[] eventos
      +Item[] itens
      +Voluntario[] voluntarios
      +ProgramaParte[] programaPartes
      +ParticipacaoPrograma[] participacoes
      +GuiaAudioVideo[] guiaAV
      +LembreteAgenda[] lembretes
      +SentinelaEstudo[] sentinelaEstudos
      +SentinelaComentario[] sentinelaComentarios
      +ConversaMensagem[] conversas
    }
    class PresidenciaService {
      +deriveTurno()
      +computePresidenciaKpis()
      +computeStopwatchStatus()
      +buildSpeakerWhatsappUrl()
    }
    class SentinelaService {
      +reorderSentinelaComentario()
      +computeSentinelaSchedule()
      +createSentinelaBackup()
      +buildBackupCoverageMatrix()
    }
    class TrackingService {
      +transitionItemToDelivered()
      +transitionItemToDispatchedSA()
      +transitionItemReopen()
    }
    class MergeService {
      +buildSyncBundle()
      +previewMerge()
      +executeMerge()
    }
    class VoiceService {
      +parseVoiceCommand()
      +parseSpokenItemFields()
      +speakPtBr()
    }
    class ExcelService {
      +importFromSpreadsheetBuffer()
      +exportToSpreadsheet()
      +exportToAcrobatTxt()
    }
    PresidenciaService --> AppDatabase
    SentinelaService --> AppDatabase
    TrackingService --> AppDatabase
    MergeService --> AppDatabase
    VoiceService --> AppDatabase
    ExcelService --> AppDatabase`,
  },
  {
    id: 'usecases',
    title: '7. UML — Casos de Uso (Suíte 3 Apps)',
    subtitle: 'Atores e fluxos dos 3 apps embutidos + sincronização multi-dispositivo.',
    code: `flowchart LR
    Vol([Voluntario Balcao])
    SA([Superint. Assembleia])
    Pres([Presidente / Sup. Prog])
    AV([Operador Audio/Video])
    Dir([Dirigente Sentinela / Palco])

    subgraph Suite ["Suite Eventos PWA (Offline-First)"]
      A1[App 1: Achados, Guarda-Vol §55-58, Procurados, Destinar SA, ANEXO 1 A4]
      A2[App 2: Presidencia Foco, Programa 3d×2t, Check-in 3x, Cronometro, Demos, Agenda RBAC]
      A3[App 2b: Guia Audio & Video com Dica Play e Ativar Play]
      A4[App 3: Resumo Sentinela Cascata 30s, Palco ESQ/DIR, Galeria, Substituicoes]
      A5[App 3b: Imagens a Exibir + Estudio Audio Offline + Audio Completo TTS]
      A6[Compartilhado: Equipe/Voluntarios + Voz pt-BR + Merge JSON Multi-Dispositivo]
    end

    Vol --> A1 & A6
    SA --> A1
    Pres --> A2 & A3 & A6
    AV --> A3 & A5
    Dir --> A4 & A5 & A6`,
  },
];

export const ArchitectureView: React.FC = () => {
  const [selectedId, setSelectedId] = useState(DIAGRAMS[0].id);
  const [svgHtml, setSvgHtml] = useState('');
  const [renderError, setRenderError] = useState('');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = DIAGRAMS.find((d) => d.id === selectedId) ?? DIAGRAMS[0];

  useEffect(() => {
    let cancelled = false;
    setRenderError('');
    setSvgHtml('');

    (async () => {
      try {
        const mermaidMod = await import('mermaid');
        const mermaid = mermaidMod.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          themeVariables: {
            primaryColor: '#e0f2fe',
            primaryTextColor: '#0f172a',
            primaryBorderColor: '#1e3a5f',
            lineColor: '#334155',
            secondaryColor: '#fef3c7',
            tertiaryColor: '#ecfdf5',
          },
        });
        const renderId = `mmd_${current.id}_${Date.now()}`;
        const { svg } = await mermaid.render(renderId, current.code);
        if (!cancelled) setSvgHtml(svg);
      } catch (err) {
        if (!cancelled) setRenderError(err instanceof Error ? err.message : 'Erro ao renderizar diagrama.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [current]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-4">
      <div className="hc-card rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-[#1e3a5f]">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Arquitetura Interativa — MER & UML (3 Apps Embutidos)</h2>
              <p className="text-xs text-slate-500">
                Documentação viva atualizada com 17 entidades (<code>docs/MER.md</code>, <code>docs/UML.md</code> e{' '}
                <code>docs/mer_uml_visual.html</code>).
              </p>
            </div>
          </div>
          <a
            href={`${import.meta.env.BASE_URL}mer-uml-visual.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#142944] transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir Explorador Gráfico em Tela Cheia
          </a>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {DIAGRAMS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedId(d.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedId === d.id
                  ? 'bg-[#1e3a5f] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {d.title}
            </button>
          ))}
        </div>
      </div>

      <div className="hc-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{current.title}</h3>
            <p className="text-xs text-slate-500">{current.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Mermaid Copiado' : 'Copiar Código Mermaid'}
          </button>
        </div>

        <div ref={containerRef} className="overflow-x-auto bg-white p-5">
          {renderError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              <p className="font-bold">Não foi possível renderizar o SVG:</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{renderError}</pre>
            </div>
          ) : svgHtml ? (
            <div className="flex justify-center [&>svg]:max-w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: svgHtml }} />
          ) : (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">Renderizando diagrama Mermaid...</div>
          )}
        </div>
      </div>
    </div>
  );
};

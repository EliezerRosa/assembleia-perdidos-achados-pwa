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
    title: '1. MER (Entidade-Relacionamento)',
    subtitle: 'Modelo completo com todas as entidades, chaves, cardinalidades e mapeamento da planilha Excel.',
    code: `erDiagram
    EVENTO ||--o{ ITEM : "possui (1:N)"
    EVENTO ||--o{ ITEM_PROCURADO : "registra (1:N)"
    EVENTO ||--o| RELATORIO_FINAL : "gera (1:1)"
    ITEM ||--|{ RASTREIO_EVENTO : "rastreia (1:N)"
    ITEM }o--o{ ITEM_PROCURADO : "corresponde_a (N:M)"
    CONFIG_DISPOSITIVO ||--o{ SYNC_LOG : "audita (1:N)"
    TIPO_ITEM_CATALOGO ||--o{ ITEM : "classifica (1:N)"

    EVENTO {
      string id PK "fk_id_Eventos"
      string tipo "Assembleia | Congresso"
      string codigo "ES-005.27.1 | CO-2027"
      string circuito "ES-005"
      string parte "A | B | Unica"
      date data "Evento Data"
      string local "Salao de Assembleias"
      int proximaEtiqueta "Auto-incremento"
      string status "ativo (ABRIR) | encerrado (FECHAR)"
    }
    ITEM {
      string id PK "Row ID / UUID"
      string eventoId FK "fk_id_Eventos"
      int etiqueta "Numero sequencial"
      string etiquetaCodigo "01 | B-01"
      string etiquetaOrigem "Original antes do merge"
      int formPagina "Form Pagina (etiqueta gemea)"
      string tipoItem "Catalogo ou personalizado"
      string valor "Baixo|Comum|Medio|Alto|Precioso"
      string categoria "Perdido|Guardado|Crianca|Idoso|Adulto"
      string fotoEntrada "Foto 1: Item + Etiqueta"
      boolean etiquetaConfirmadaNoItem
      boolean etiquetaConfirmadaNoFormulario
      string fotoEtiqueta "Foto 2: Etiqueta no Formulario"
      string fotoEntrega "Foto 3: Comprovante Entrega"
      string status "Ainda Guardado|Em Conferencia|Ja Entregue|DESPACHADO"
      string destino "DESCARTAR|DOAR|VENDER|CONTAS"
      datetime dataHoraGuardado
      string quemTrouxe
      string localAchado
      datetime dataHoraDespachado
      string quemPegou
      string donoNomeTels
      string congregacao
      string endereco
      string deviceId
    }
    RASTREIO_EVENTO {
      string id PK
      string itemId FK
      datetime timestamp
      string etapa "RECEBIDO|ETIQUETADO|FOTO|CONFERENCIA|ENTREGUE|DESPACHADO_SA|TRANSFERIDO"
      string titulo
      string detalhes
      string operador
      string dispositivo
      string localizacao
    }
    ITEM_PROCURADO {
      string id PK
      string eventoId FK
      string nomeTelefone
      string congregacao
      string descricao
      string foto
      string status "PROCURANDO|LOCALIZADO|ENTREGUE"
    }
    RELATORIO_FINAL {
      string id PK
      string eventoId FK
      string circuito
      string salaoAssembleias "ANEXO 1"
      string superintendente
      int voluntariosNecessarios
      int voluntariosUsados
      boolean dificuldadeAntes
      boolean dificuldadeDurante
      boolean dificuldadeApos
      string sugestoes
      string responsavelRelatorio
      string telefoneResponsavel "ANEXO 1"
      string enderecoRestituicao "ANEXO 1"
    }`,
  },
  {
    id: 'states',
    title: '2. UML — Máquina de Estados (Ciclo de Vida)',
    subtitle: 'Todos os estados do item desde a recepção Foto-Etiqueta-Foto até Entrega, Contas ou Destinação SA.',
    code: `stateDiagram-v2
    [*] --> Recepcao_Foto1 : Item/Pessoa chega ao balcao
    Recepcao_Foto1 --> Etiquetagem_Dupla : Foto 1 (Item + Etiqueta #N)
    Etiquetagem_Dupla --> Registro_Foto2 : Etiqueta gemea colada no Formulario (Pag X)
    Registro_Foto2 --> Ainda_Guardado : Foto 2 registrada + Dados salvos
    Registro_Foto2 --> Ja_Entregue : Entrega imediata no ato

    state Ainda_Guardado {
      [*] --> Mesa_Exposicao : Valor Baixo/Comum/Medio
      [*] --> Cofre_Restrito : Valor Alto/Precioso (Politica 55)
      [*] --> Prateleira_GV : Categoria Guardado (Politica 58)
      [*] --> Protocolo_Pessoa : Crianca/Idoso/Adulto (Politica 56)
    }

    Ainda_Guardado --> Em_Conferencia : Solicitante descreve / Match Procurado
    Em_Conferencia --> Ainda_Guardado : Nao correspondeu
    Em_Conferencia --> Ja_Entregue : Confirmado + Foto 3 + Dados Dono
    Ainda_Guardado --> Ja_Entregue : Retirada direta + Rastreio Entrega
    Ainda_Guardado --> Entregue_Contas : Dinheiro nao procurado (Politica 57)

    Ainda_Guardado --> Retido_60d : >= 60 dias sem retirada
    Retido_60d --> Despachado_SA : SA escolhe DOAR | VENDER | DESCARTAR
    Retido_60d --> Ja_Entregue : Dono localizado tardiamente

    Ja_Entregue --> Ainda_Guardado : Reabertura auditada
    Despachado_SA --> Ainda_Guardado : Reverter Despacho < 7 dias (limpa 4 campos)
    Entregue_Contas --> [*]
    Despachado_SA --> [*]
    Ja_Entregue --> [*]`,
  },
  {
    id: 'seq-intake',
    title: '3. UML — Sequência: Recepção + Voz + Foto-Etiqueta-Foto',
    subtitle: 'Fluxo granular de cadastro com acessibilidade por voz, compressão de foto e geração automática de rastreio.',
    code: `sequenceDiagram
    actor Vol as Voluntario Balcao
    participant Voz as VoiceService (pt-BR)
    participant Form as ItemFormModal
    participant Photo as PhotoService (Canvas)
    participant Track as TrackingService
    participant Store as StorageService (localStorage)

    Vol->>Voz: Fala "Novo item" (Alt+V)
    Voz->>Form: OPEN_NEW_ITEM + Proxima Etiqueta #N
    Vol->>Voz: Dita "Celular Samsung verde, valor alto, quem trouxe Ana no auditorio"
    Voz->>Voz: parseSpokenItemFields()
    Voz-->>Form: Preenche tipo, descricao, valor=Alto, quemTrouxe, local
    Form-->>Vol: Exibe alerta Politica #55 (Nao Expor)
    Vol->>Photo: Captura Foto 1 (Item com etiqueta #N)
    Photo-->>Form: JPEG comprimido (~40KB) + carimbo ETQ #N
    Vol->>Photo: Captura Foto 2 (Etiqueta gemea no Formulario Pag X)
    Photo-->>Form: JPEG comprimido + checkbox confirmado
    Vol->>Form: Clica "Salvar Item" (ou fala "Salvar item")
    Form->>Track: Gera eventos RECEBIDO, ETIQUETADO, FOTO_REGISTRADA
    Track->>Store: saveDatabase() em localStorage
    Store-->>Vol: Toast + Retorno falado TTS confirmando Etiqueta #N`,
  },
  {
    id: 'seq-merge',
    title: '4. UML — Sequência: Mesclagem Multi-Dispositivo',
    subtitle: 'Como juntar itens de vários celulares e PCs em um único dispositivo com detecção e resolução de colisões.',
    code: `sequenceDiagram
    actor CelB as Voluntario (Celular B)
    participant AppB as PWA Celular B
    participant Share as Arquivo JSON / Web Share
    actor PcA as Coordenacao (PC / Mobile A)
    participant AppA as PWA Equipamento A
    participant Merge as MergeService
    participant StoreA as localStorage (A)

    CelB->>AppB: Exportar Evento Ativo (JSON)
    AppB->>Share: Gera SyncBundle V1 (eventos, itens, fotos base64, rastreio)
    Share-->>PcA: Envia via WhatsApp / Bluetooth / USB / Drive
    PcA->>AppA: Seleciona arquivo .json em Sincronizar
    AppA->>Merge: previewMerge(localDb, bundle)
    Merge->>Merge: Mapeia evento por ID ou (Codigo + Data)
    Merge->>Merge: Detecta novos itens, conflitos de ID e colisoes de Etiqueta
    Merge-->>PcA: Exibe MergePreview (ex.: 2 colisoes detectadas)
    PcA->>Merge: Escolhe estrategia (Renumerar | Prefixo | Manter) e Confirma
    Merge->>Merge: Preserva etiquetaOrigem + une timelines de rastreio + registra TRANSFERIDO_DISPOSITIVO
    Merge->>StoreA: Persiste base consolidada + SyncLogEntry
    StoreA-->>PcA: Todos os itens consolidados em um unico equipamento`,
  },
  {
    id: 'classes',
    title: '5. UML — Diagrama de Classes (Domínio & Serviços)',
    subtitle: 'Separação limpa entre entidades de domínio e serviços puros testáveis.',
    code: `classDiagram
    class AppDatabase {
      +number schemaVersion
      +string activeEventoId
      +ConfiguracaoDispositivo config
      +Evento[] eventos
      +Item[] itens
      +ItemProcurado[] procurados
      +RelatorioFinal[] relatorios
      +SyncLogEntry[] syncHistory
    }
    class StorageService {
      +loadDatabase() AppDatabase
      +saveDatabase(db) SaveResult
      +getStorageUsage() QuotaInfo
      +createDemoSeedData(config) Seed
    }
    class TrackingService {
      +isRestrictedDisplay(item) boolean
      +isLostPerson(cat) boolean
      +requiresOwnerIdentification(item) boolean
      +isItemRetido(item, prazoDias) boolean
      +transitionItemToConference() TransitionResult
      +transitionItemToDelivered() TransitionResult
      +transitionItemToDispatchedSA() TransitionResult
      +transitionItemReopen() TransitionResult
    }
    class PhotoService {
      +compressImageFile(file, opts) CompressedPhoto
      +estimateDataUrlKB(dataUrl) number
    }
    class MergeService {
      +buildSyncBundle(db, scope) SyncBundle
      +parseSyncBundle(json) ParseResult
      +previewMerge(localDb, bundle) MergePreview
      +executeMerge(localDb, bundle, opts) MergeResult
    }
    class ExcelService {
      +importFromSpreadsheetBuffer(buf, name, db) ExcelImportResult
      +exportToSpreadsheet(db, format, eventoId) BlobFile
      +exportToAcrobatTxt(db, eventoId) BlobFile
    }
    class VoiceService {
      +startSingleUtteranceRecognition(cb) StopFn
      +parseVoiceCommand(transcript, ctx) VoiceActionType
      +parseSpokenItemFields(raw, customTypes) PartialItem
      +speakPtBr(text, enabled) void
    }
    StorageService --> AppDatabase
    MergeService --> AppDatabase
    MergeService --> TrackingService
    ExcelService --> AppDatabase
    ExcelService --> TrackingService
    VoiceService --> AppDatabase`,
  },
  {
    id: 'usecases',
    title: '6. UML — Casos de Uso Granulares',
    subtitle: 'Mapeamento de atores e funcionalidades até o nível de operação no balcão.',
    code: `flowchart LR
    Vol([Voluntario Balcao])
    Enc([Encarregado Depto.])
    SA([Superint. Assembleia])
    Dono([Dono / Solicitante])
    DevExt([Outro Celular / PC])

    subgraph PWA ["PWA Perdidos & Achados + Guarda-Volumes"]
      UC1[UC01 Selecionar / Abrir-Fechar Evento + Convite Equipe]
      UC2[UC02 Cadastrar Item Foto1-Etiqueta-Foto2 + Form Pagina 15l]
      UC3[UC03 Cadastrar Guarda-Volumes §58]
      UC4[UC04 Protocolo Pessoa Perdida §56]
      UC5[UC05 Acionar Comandos e Ditado por Voz]
      UC6[UC06 Buscar, 5 Secoes Glide e Conferir Item §55]
      UC7[UC07 Registrar Entrega + Foto 3 + Rastreio]
      UC8[UC08 Cadastrar e Cruzar Item Procurado]
      UC9[UC09 Destinar Swipe >60d + Reverter Despacho <7d]
      UC10[UC10 Gerar/Imprimir ANEXO 1 15l/pag + Relatorio Final A4]
      UC11[UC11 Exportar / Importar / Mesclar Dispositivos]
      UC12[UC12 Importar/Exportar Excel .xlsx e PA.txt Acrobat]
    end

    Vol --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8
    Enc --> UC1 & UC10 & UC11 & UC12
    SA --> UC9 & UC10
    Dono -.-> UC3 & UC6 & UC7 & UC8
    DevExt --> UC11`,
  },
  {
    id: 'components',
    title: '7. UML — Componentes & Implantação PWA',
    subtitle: 'Arquitetura offline-first rodando em PC, Android e iOS sem dependência de servidor.',
    code: `flowchart TB
    subgraph Client ["Dispositivo Usuario (PC / Android / iOS)"]
      SW[Service Worker Workbox<br/>Cache App Shell Offline]
      UI[React 19 + Tailwind CSS v4<br/>UI Ergonomica + Alto Contraste + Print A4]
      Store[React Context Store]
      LS[(Browser localStorage<br/>assembleia_pa_db_v1)]

      subgraph Engines ["Servicos de Dominio"]
        TS[TrackingService<br/>Maquina de Estados]
        PS[PhotoService<br/>Canvas Compress + Carimbo]
        VS[VoiceService<br/>Web Speech API + TTS]
        MS[MergeService<br/>Resolucao de Colisoes]
        ES[ExcelService<br/>SheetJS .xlsx / .csv]
      end

      Cam[Camera API capture=environment]
      Mic[Microfone / SpeechRecognition]
      Share[Web Share API / Download]
    end

    SW --> UI
    UI <--> Store
    Store <--> LS
    UI --> TS & PS & VS & MS & ES
    PS --> Cam
    VS --> Mic
    MS --> Share
    ES --> Share`,
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
              <h2 className="text-lg font-extrabold text-slate-900">Arquitetura Interativa — MER & UML Granular</h2>
              <p className="text-xs text-slate-500">
                Documentação viva integrada ao PWA (também versionada em <code>docs/MER.md</code>, <code>docs/UML.md</code> e{' '}
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

# UML — Modelagem Completa e Granular (Suíte Eventos — 3 Apps Embutidos)

Documentação UML atualizada cobrindo **Casos de Uso**, **Classes de Domínio e Serviços**, **Máquinas de Estados** (Item de Achados & Cronômetro Presidência), **Diagramas de Sequência** (Recepção Voz/Foto, Presidência Ao Vivo/A&V, Resumo de A Sentinela Cascata/Áudio e Mesclagem Multi-Dispositivo) e **Componentes PWA Offline-First**.

---

## 1. Diagrama de Casos de Uso (3 Apps Embutidos)

```mermaid
flowchart LR
    Vol([Voluntário Balcão])
    SA([Superint. Assembleia])
    Pres([Presidente / Sup. Programa])
    AV([Operador Áudio & Vídeo])
    Dir([Dirigente Sentinela / Palco])
    Dev([Outro Mobile / PC])

    subgraph Sys ["Suíte Eventos PWA (Offline-First • localStorage v2)"]
        subgraph App1 ["App 1 — Perdidos & Achados + Guarda-Volumes"]
            UC01[UC01 Gerir Eventos ABRIR/FECHAR + Convite]
            UC02[UC02 Cadastrar Item Foto1-Etiqueta-Foto2 §55-58]
            UC03[UC03 Busca, 5 Seções Glide, Conferência & Entrega]
            UC04[UC04 Itens Procurados & Cruzamento N:M]
            UC05[UC05 Deck Swipe Destinar SA >=60d + Reverter <7d]
            UC06[UC06 ANEXO 1 15l/pág + Relatório Final A4 + Excel/PA.txt]
        end

        subgraph App2 ["App 2 — Presidência do Congresso"]
            UC07[UC07 Painel Evento em Foco & Folha Sessão A4]
            UC08[UC08 Gerir Programa 3d×2t, Oradores & 3 Substitutos]
            UC09[UC09 Check-in 3 Etapas, Ensaio Palco & WhatsApp Sl 134:3]
            UC10[UC10 Cronômetro Dual-Mode Ao Vivo / Ensaio + Alertas -1m/Estouro]
            UC11[UC11 Gerir Demonstrações, Entrevistas & Experiências]
            UC12[UC12 Operar Guia Áudio & Vídeo com Dica Play e Ativar Play]
            UC13[UC13 Agenda, Lembretes RBAC 7 Perfis & Documentos Ref.]
        end

        subgraph App3 ["App 3 — Resumo de A Sentinela"]
            UC14[UC14 Gerir Estudo, Ordem de Entrada & Cascata 30s]
            UC15[UC15 Controlar Coreografia ESQUERDA/DIREITA/TRIBUNA & Galeria]
            UC16[UC16 Matriz de Substituições, Check-in 1º Dia & Ensaio 8:30]
            UC17[UC17 Operar Deck Imagens a Exibir A/V]
            UC18[UC18 Estúdio Áudio Offline, Salvar/Recuperar & Áudio Completo TTS]
            UC19[UC19 Mural Conversar Com Todos]
        end

        subgraph Shared ["Compartilhado"]
            UC20[UC20 Cadastro Unificado de Equipe & Voluntários]
            UC21[UC21 Comandos e Ditado por Voz pt-BR]
            UC22[UC22 Exportar/Mesclar JSON Multi-Dispositivo Todos os 3 Apps]
        end
    end

    Vol --> UC01 & UC02 & UC03 & UC04 & UC06 & UC21
    SA --> UC05 & UC06
    Pres --> UC01 & UC07 & UC08 & UC09 & UC10 & UC11 & UC13 & UC20 & UC21 & UC22
    AV --> UC12 & UC17 & UC13
    Dir --> UC14 & UC15 & UC16 & UC17 & UC18 & UC19 & UC20 & UC21
    Dev --> UC22
```

---

## 2. Diagrama de Classes (Domínio & 8 Serviços Puros)

```mermaid
classDiagram
    class AppDatabase {
      +number schemaVersion = 2
      +string activeEventoId
      +ConfiguracaoDispositivo config
      +Evento[] eventos
      +Item[] itens
      +ItemProcurado[] procurados
      +RelatorioFinal[] relatorios
      +Voluntario[] voluntarios
      +ProgramaParte[] programaPartes
      +ParticipacaoPrograma[] participacoes
      +GuiaAudioVideo[] guiaAV
      +LembreteAgenda[] lembretes
      +DocumentoReferencia[] referencias
      +SentinelaEstudo[] sentinelaEstudos
      +SentinelaComentario[] sentinelaComentarios
      +ConversaMensagem[] conversas
      +SyncLogEntry[] syncHistory
    }

    class StorageService {
      +loadDatabase() AppDatabase
      +saveDatabase(db) SaveResult
      +getStorageUsage() QuotaInfo
      +createDemoSeedData(config) DemoSeedResult
    }
    class TrackingService {
      +isRestrictedDisplay(item) boolean
      +isItemRetido(item, prazoDias) boolean
      +transitionItemToDelivered() TransitionResult
      +transitionItemToDispatchedSA() TransitionResult
      +transitionItemReopen() TransitionResult
    }
    class PresidenciaService {
      +deriveTurno(iso) TurnoCongresso
      +computeProgramEndTime(iso, min) string
      +sortProgramaPartes(list) ProgramaParte[]
      +requiresStageRehearsal(parte) boolean
      +computePresidenciaKpis(list) PresidenciaKpis
      +computeStopwatchStatus(parte, nowMs) StopwatchSnapshot
      +buildSpeakerWhatsappUrl(parte, tipo) string
      +extractSpeakerCloneFields(source) Partial
    }
    class SentinelaService {
      +sortSentinelaComentarios(list) SentinelaComentario[]
      +reorderSentinelaComentario(list, id, dir) SentinelaComentario[]
      +computeSentinelaSchedule(estudo, list) SentinelaScheduleSummary
      +createSentinelaBackup(com) SentinelaBackupSnapshot
      +restoreSentinelaFromBackup(com) SentinelaComentario
      +buildBackupCoverageMatrix(list) SubstituicaoGroup[]
      +buildSentinelaWhatsappUrl(com, est, dest, tipo) string
    }
    class MergeService {
      +buildSyncBundle(db, scope, evtId) SyncBundle
      +previewMerge(localDb, bundle) MergePreview
      +executeMerge(localDb, bundle, opts) MergeResult
    }
    class VoiceService {
      +parseVoiceCommand(raw, ctx) VoiceActionType
      +parseSpokenItemFields(raw, types) PartialItem
      +speakPtBr(text, enabled) void
    }
    class ExcelService {
      +importFromSpreadsheetBuffer() ExcelImportResult
      +exportToSpreadsheet() BlobFile
      +exportToAcrobatTxt() BlobFile
    }
    class PhotoService {
      +compressImageFile(file, opts) CompressedPhoto
    }

    StorageService --> AppDatabase
    MergeService --> AppDatabase
    MergeService --> TrackingService
    ExcelService --> AppDatabase
    PresidenciaService ..> AppDatabase
    SentinelaService ..> AppDatabase
    VoiceService ..> AppDatabase
    PhotoService ..> AppDatabase
```

---

## 3. Máquinas de Estados

### 3.1 Ciclo de Vida do Item (Perdidos e Achados)

```mermaid
stateDiagram-v2
    [*] --> Recepcao_Foto1 : Item/Pessoa chega ao balcão
    Recepcao_Foto1 --> EtiquetaGemea_Foto2 : Foto 1 + Etiqueta #N no item e Formulário (Pág. X)
    EtiquetaGemea_Foto2 --> AindaGuardado : Salvar cadastro (rastreio RECEBIDO + ETIQUETADO)
    EtiquetaGemea_Foto2 --> JaEntregue : Entrega imediata no ato
    AindaGuardado --> EmConferencia : Dono descreve (§55) ou match Procurado
    EmConferencia --> AindaGuardado : Não conferiu
    EmConferencia --> JaEntregue : Confirmado + Foto 3 + Dados Dono
    AindaGuardado --> JaEntregue : Retirada direta
    AindaGuardado --> EntregueContas : Dinheiro não procurado (§57)
    AindaGuardado --> Retido60d : >= 60 dias sem retirada
    Retido60d --> DespachadoSA : SA escolhe DOAR | VENDER | DESCARTAR
    DespachadoSA --> AindaGuardado : Reverter Despacho < 7 dias
    JaEntregue --> AindaGuardado : Reabertura auditada
```

### 3.2 Máquina de Estados — Cronômetro Dual-Mode da Presidência do Congresso

```mermaid
stateDiagram-v2
    [*] --> Parado : Parte programada
    Parado --> EnsaioPessoal : INICIAR ENSAIO PESSOAL
    EnsaioPessoal --> Parado : Encerrar Ensaio (salva ensaioDuracaoSegundos sem fechar parte)
    Parado --> AoVivo_Normal : INÍCIO da Parte (grava inicioRealIso)
    AoVivo_Normal --> AoVivo_UltimoMinuto : Restante <= 60s (Alerta Âmbar -1 min)
    AoVivo_UltimoMinuto --> AoVivo_Estourado : Restante < 0s (Alerta Vermelho PASSOU DA HORA)
    AoVivo_Normal --> Concluido : FIM da Parte (congela duracaoRealSegundos)
    AoVivo_UltimoMinuto --> Concluido : FIM da Parte
    AoVivo_Estourado --> Concluido : FIM da Parte
    Concluido --> Parado : RESTAURAR Parte
```

---

## 4. Diagramas de Sequência Granulares

### 4.1 Presidência — Check-in, Cronômetro Ao Vivo & Guia Áudio e Vídeo

```mermaid
sequenceDiagram
    actor Pres as Presidente / Sup. Programa
    participant Hub as PresidenciaHub / ProgramaView
    participant Svc as PresidenciaService
    participant AV as GuiaAV (Ativar Play)
    participant Store as localStorage v2

    Pres->>Hub: Registra Check-in (1) 1º Dia, (2) 30m Dia, (3) 30m Palco + Ensaio OK
    Hub->>Store: Persiste flags na ProgramaParte
    Pres->>Hub: Clica "INÍCIO da Parte (Ao Vivo)"
    Hub->>Store: modoCronometro="ao_vivo", inicioRealIso=now
    loop A cada 1 segundo
        Hub->>Svc: computeStopwatchStatus(parte, nowMs)
        Svc-->>Hub: elapsed, remaining, isFinalMinute (-1m), isOvertime
    end
    Pres->>AV: Acompanha Dica Play embarcada na parte e marca "▶ PLAY OK"
    AV->>Store: guiaAV.executado = true
    Pres->>Hub: Clica "FIM da Parte"
    Hub->>Store: modoCronometro="concluido", duracaoRealSegundos congelado
```

### 4.2 Resumo de A Sentinela — Cascata de Horários, Palco & Áudio Completo

```mermaid
sequenceDiagram
    actor Dir as Dirigente / Irmão do Palco
    participant View as SentinelaView / DetailModal
    participant Svc as SentinelaService
    participant Media as MediaRecorder / Web Speech
    participant Store as localStorage v2

    Dir->>View: Reordena comentário (↑ / ↓) ou ajusta tempo (30s -> 40s)
    View->>Svc: reorderSentinelaComentario() + computeSentinelaSchedule()
    Svc-->>View: Recalcula cascata HH:MM:SS de todos os itens + alertaLadoRepetido (ESQUERDA↔DIREITA)
    Dir->>View: Clica "Salvar Comentário (Backup)"
    View->>Store: Salva backupSnapshot imutável
    Dir->>Media: Grava áudio offline (16 kbps) ou dita texto pt-BR
    Media-->>Store: Salva audioComentario (DataURL) / comentarioSugerido
    Dir->>View: Abre aba "Áudio Completo" e inicia Ensaio Sequencial
    loop Para cada comentário 1..N
        View->>Media: Toca Pergunta -> Comentário -> Conectivo (áudio gravado ou fallback TTS pt-BR)
    end
```

### 4.3 Mesclagem Multi-Dispositivo (Todos os 3 Apps Embutidos)

```mermaid
sequenceDiagram
    actor DispB as Celular / PC B (Presidência / Balcão / Sentinela)
    participant Merge as MergeService
    actor Coord as Equipamento Consolidador A
    participant StoreA as localStorage A

    DispB->>Merge: buildSyncBundle(dbB) -> SyncBundle (Achados + Programa + A/V + Sentinela + Equipe)
    Coord->>Merge: previewMerge(dbA, bundle)
    Merge-->>Coord: Resumo de colisões de etiquetas + deltas de Programa, Guia A/V, Sentinela e Equipe
    Coord->>Merge: executeMerge(dbA, bundle, estratégias)
    Merge->>StoreA: Unifica Eventos (código+data), resolve colisões de etiqueta e mescla registros mais recentes por ID
```

---

## 5. Diagrama de Componentes e Implantação PWA

```mermaid
flowchart TB
    subgraph Client ["Dispositivo Usuário (PC / Android / iOS — GitHub Pages HTTPS)"]
        SW[Workbox Service Worker<br/>Cache Offline Completo]
        Shell[AppShell Responsivo<br/>Seletor 3 Apps Embutidos + Sidebar PC + Bottom Nav Dinâmica]
        subgraph Modules ["3 Apps Embutidos + Compartilhados"]
            M1[App 1: Achados & Guarda-Volumes<br/>5 Views + 2 Modais + ANEXO 1 A4]
            M2[App 2: Presidência do Congresso<br/>Foco, Programa, Demos, Guia A/V, Agenda/Docs]
            M3[App 3: Resumo de A Sentinela<br/>Ordem Cascata, Palco/Galeria, Imagens A/V, Áudio]
            M4[Compartilhado: Equipe, Sync/Merge, Voz pt-BR, MER+UML]
        end
        Store[AppProvider Context Store]
        Services[8 Serviços Puros Vitest<br/>Storage, Tracking, Presidencia, Sentinela, Merge, Voice, Excel, Photo]
        LS[(localStorage v2<br/>assembleia_pa_db_v1)]
        APIs[Web APIs Nativas<br/>Camera, MediaRecorder, Web Speech, TTS, Web Share, Print A4]
    end

    SW --> Shell
    Shell --> M1 & M2 & M3 & M4
    M1 & M2 & M3 & M4 <--> Store
    Store --> Services
    Services <--> LS
    Services <--> APIs
```

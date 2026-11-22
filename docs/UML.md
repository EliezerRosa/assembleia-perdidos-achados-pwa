# UML — Modelagem Completa e Granular

Documentação UML completa cobrindo **Casos de Uso**, **Classes de Domínio e Serviços**, **Máquina de Estados do Ciclo de Vida**, **5 Diagramas de Sequência Granulares**, **Diagrama de Atividades Operacional** e **Diagrama de Componentes e Implantação PWA**.

---

## 1. Diagrama de Casos de Uso (Granular por Ator)

```mermaid
flowchart LR
    Vol([Voluntário do Balcão])
    Enc([Encarregado do Depto.])
    SA([Superintendente de Assembleia])
    Dono([Dono / Solicitante])
    Dev([Outro Mobile / PC])

    subgraph Sys ["PWA Perdidos e Achados & Guarda-Volumes"]
        subgraph ModEventos ["Módulo Eventos"]
            UC01[UC01 Selecionar Evento Ativo]
            UC02[UC02 Criar Evento Assembleia/Congresso com Código e Parte A/B]
            UC03[UC03 Consultar KPIs por Evento]
        end

        subgraph ModCustodia ["Módulo Recepção & Custódia"]
            UC04[UC04 Cadastrar Item: Foto 1 -> Etiqueta Gêmea -> Foto 2]
            UC05[UC05 Registrar Guarda-Volumes com Validação §58]
            UC06[UC06 Acionar Protocolo Pessoa/Criança Perdida §56]
            UC07[UC07 Aplicar Alerta de Item de Valor / Não Expor §55]
            UC08[UC08 Imprimir Par de Etiquetas Gêmeas]
        end

        subgraph ModCiclo ["Módulo Busca, Conferência & Entrega"]
            UC09[UC09 Buscar e Filtrar Itens por Etiqueta/Texto/Status/Restrito]
            UC10[UC10 Colocar Item Em Conferência com Solicitante]
            UC11[UC11 Registrar Entrega ao Dono com Foto 3 e Rastreio]
            UC12[UC12 Encaminhar Dinheiro ao Depto. de Contas §57]
            UC13[UC13 Reabrir Item Auditado no Rastreio]
        end

        subgraph ModProcurados ["Módulo Itens Procurados"]
            UC14[UC14 Cadastrar Solicitação de Item Procurado com Foto]
            UC15[UC15 Cruzar Similaridade Automática com Base Completa]
            UC16[UC16 Vincular Múltiplos Prováveis Itens Localizados]
        end

        subgraph ModSA ["Módulo Destinação SA & Relatório"]
            UC17[UC17 Avaliar Deck de Itens Retidos >= 60 dias]
            UC18[UC18 Despachar Item: Doar / Vender / Descartar / Contas]
            UC19[UC19 Preencher e Imprimir Relatório Final A4]
        end

        subgraph ModVozSync ["Acessibilidade por Voz & Multi-Dispositivo"]
            UC20[UC20 Navegar por Comandos de Voz pt-BR]
            UC21[UC21 Ditar Campos Individuais ou Frase Multi-Campo]
            UC22[UC22 Exportar/Compartilhar Pacote JSON com Fotos]
            UC23[UC23 Importar e Mesclar com Resolução de Colisões de Etiqueta]
            UC24[UC24 Importar e Exportar Planilha Excel .xlsx / .csv]
        end
    end

    Vol --> UC01 & UC03 & UC04 & UC05 & UC06 & UC07 & UC08 & UC09 & UC10 & UC11 & UC12 & UC14 & UC15 & UC16 & UC20 & UC21
    Enc --> UC01 & UC02 & UC13 & UC19 & UC22 & UC23 & UC24
    SA --> UC17 & UC18 & UC19
    Dono -.-> UC05 & UC10 & UC11 & UC14
    Dev --> UC22 & UC23
```

---

## 2. Diagrama de Classes (Domínio, Estado e Serviços)

```mermaid
classDiagram
    class AppDatabase {
      +number schemaVersion
      +string activeEventoId
      +ConfiguracaoDispositivo config
      +Evento[] eventos
      +Item[] itens
      +ItemProcurado[] procurados
      +RelatorioFinal[] relatorios
      +string[] tiposPersonalizados
      +SyncLogEntry[] syncHistory
    }

    class Evento {
      +string id
      +EventoTipo tipo
      +string codigo
      +string circuito
      +EventoParte parte
      +string data
      +string local
      +int proximaEtiqueta
      +string status
    }

    class Item {
      +string id
      +string eventoId
      +int etiqueta
      +string etiquetaCodigo
      +string etiquetaOrigem
      +int formPagina
      +string tipoItem
      +string descricao
      +ValorItem valor
      +CategoriaItem categoria
      +string fotoEntrada
      +boolean etiquetaConfirmadaNoItem
      +boolean etiquetaConfirmadaNoFormulario
      +string fotoEtiqueta
      +string fotoEntrega
      +StatusItem status
      +DestinoSA destino
      +RastreioEvento[] rastreio
    }

    class RastreioEvento {
      +string id
      +string timestamp
      +EtapaRastreio etapa
      +string titulo
      +string detalhes
      +string operador
      +string dispositivo
      +string localizacao
    }

    class ItemProcurado {
      +string id
      +string eventoId
      +string nomeTelefone
      +string congregacao
      +string descricao
      +string foto
      +string[] provaveisItensIds
      +StatusProcurado status
    }

    class RelatorioFinal {
      +string id
      +string eventoId
      +string circuito
      +string superintendente
      +int voluntariosNecessarios
      +int voluntariosUsados
      +boolean dificuldadeAntes
      +boolean dificuldadeDurante
      +boolean dificuldadeApos
      +string sugestoes
    }

    class StorageService {
      +loadDatabase() AppDatabase
      +saveDatabase(db) SaveResult
      +getStorageUsage() QuotaUsage
      +createDemoSeedData(config) SeedData
    }

    class TrackingService {
      +isRestrictedDisplay(item) boolean
      +isLostPerson(cat) boolean
      +requiresOwnerIdentification(item) boolean
      +isCashItem(item) boolean
      +isItemRetido(item, prazoDias) boolean
      +transitionItemToConference(item, op, dev, obs) TransitionResult
      +transitionItemToDelivered(item, payload, op, dev) TransitionResult
      +transitionItemToDispatchedSA(item, destino, op, dev, obs) TransitionResult
      +transitionItemReopen(item, motivo, op, dev) TransitionResult
      +buildLegacyDesc(item) string
    }

    class PhotoService {
      +compressImageFile(file, opts) CompressedPhoto
      +estimateDataUrlKB(dataUrl) number
    }

    class MergeService {
      +buildSyncBundle(db, scope, eventoId) SyncBundle
      +parseSyncBundle(jsonText) ParseResult
      +previewMerge(localDb, bundle) MergePreview
      +executeMerge(localDb, bundle, opts) MergeResult
    }

    class ExcelService {
      +importFromSpreadsheetBuffer(buf, fileName, db) ExcelImportResult
      +exportToSpreadsheet(db, format, eventoId) BlobExport
    }

    class VoiceService {
      +isSpeechRecognitionSupported() boolean
      +startSingleUtteranceRecognition(cb) StopFn
      +parseVoiceCommand(raw, ctx) VoiceActionType
      +parseSpokenItemFields(raw, customTypes) Partial~Item~
      +speakPtBr(text, enabled) void
    }

    AppDatabase *-- Evento
    AppDatabase *-- Item
    AppDatabase *-- ItemProcurado
    AppDatabase *-- RelatorioFinal
    Item *-- RastreioEvento
    StorageService --> AppDatabase
    MergeService --> AppDatabase
    MergeService --> TrackingService
    ExcelService --> AppDatabase
    ExcelService --> TrackingService
    VoiceService ..> Item
```

---

## 3. Máquina de Estados — Ciclo de Vida Completo do Item

```mermaid
stateDiagram-v2
    [*] --> Recepcao : Item ou pessoa entregue no balcão
    Recepcao --> Foto1_EtiquetaItem : Colar etiqueta #N no item + tirar Foto 1
    Foto1_EtiquetaItem --> EtiquetaForm_Foto2 : Colar 2ª etiqueta #N no Formulário (Pág. X) + tirar Foto 2
    EtiquetaForm_Foto2 --> AindaGuardado : Salvar cadastro (rastreio RECEBIDO + ETIQUETADO + FOTO_REGISTRADA)
    EtiquetaForm_Foto2 --> JaEntregue : Entrega imediata no ato do cadastro

    state AindaGuardado {
        [*] --> ExposicaoMesa : Valor Baixo/Comum/Médio
        [*] --> CofreRestrito : Valor Alto/Precioso ou Carteira/Bolsa (§55)
        [*] --> PrateleiraGV : Categoria Guardado (§58)
        [*] --> AtendimentoPessoa : Categoria Criança/Idoso/Adulto (§56)
    }

    AindaGuardado --> EmConferencia : Dono descreve item ou vínculo com Item Procurado
    EmConferencia --> AindaGuardado : Descrição não conferiu (retorna custódia)
    EmConferencia --> JaEntregue : Identidade confirmada + Dados do Dono + Foto 3
    AindaGuardado --> JaEntregue : Retirada direta confirmada + Rastreio ENTREGUE

    AindaGuardado --> EntregueContas : Dinheiro não retirado ao fim da assembleia (§57)
    AindaGuardado --> Retido60Dias : Permanência >= 60 dias sem retirada
    Retido60Dias --> JaEntregue : Dono localizado após o evento (envio/retirada)
    Retido60Dias --> DespachadoSA : SA define DOAR | VENDER | DESCARTAR

    JaEntregue --> AindaGuardado : Reabertura auditada (etapa REABERTO)
    DespachadoSA --> AindaGuardado : Reabertura auditada (etapa REABERTO)

    EntregueContas --> [*]
    DespachadoSA --> [*]
    JaEntregue --> [*]
```

---

## 4. Diagramas de Sequência Granulares

### 4.1 Sequência A — Recepção com Acessibilidade por Voz + Foto • Etiqueta • Foto

```mermaid
sequenceDiagram
    actor Vol as Voluntário Balcão
    participant Mic as VoiceAssistant / VoiceService
    participant Form as ItemFormModal
    participant Cam as PhotoCaptureCard / PhotoService
    participant Track as TrackingService
    participant Store as AppStore / localStorage

    Vol->>Mic: Toca microfone (ou Alt+V) e fala "Novo item"
    Mic->>Mic: parseVoiceCommand("Novo item") -> OPEN_NEW_ITEM
    Mic->>Form: Abre modal com Próxima Etiqueta #N pré-calculada
    Vol->>Form: Toca "Ditar Formulário"
    Form->>Mic: startSingleUtteranceRecognition(pt-BR)
    Vol->>Mic: "Celular Samsung capa verde, valor alto, categoria perdido, quem trouxe Maria no banheiro feminino"
    Mic->>Mic: parseSpokenItemFields()
    Mic-->>Form: Preenche tipoItem="Celular", descricao, valor="Alto", categoria="Perdido", quemTrouxe="Maria", localAchado="Banheiro feminino"
    Form->>Track: isRestrictedDisplay() -> true
    Form-->>Vol: Exibe alerta laranja Política §55 ("NÃO EXPOR")
    Vol->>Cam: Fotografa item com etiqueta #N (Foto 1)
    Cam->>Cam: Canvas resize <=900px + JPEG 0.72 + carimbo "ETQ #N"
    Cam-->>Form: fotoEntrada (DataURL ~40KB) + check etiquetaNoItem=true
    Vol->>Cam: Cola 2ª etiqueta na Pág. X do formulário e fotografa (Foto 2)
    Cam-->>Form: fotoEtiqueta (DataURL ~35KB) + check etiquetaNoForm=true
    Vol->>Form: Clica "Salvar Item" (ou fala "Salvar item")
    Form->>Track: Cria eventos RECEBIDO, ETIQUETADO e FOTO_REGISTRADA
    Form->>Store: Grava item + incrementa Evento.proximaEtiqueta em localStorage
    Store-->>Vol: Toast + TTS "Item etiqueta #N salvo com sucesso!"
```

### 4.2 Sequência B — Busca, Conferência e Entrega ao Dono com Comprovação

```mermaid
sequenceDiagram
    actor Dono as Dono / Solicitante
    actor Vol as Voluntário Balcão
    participant List as ItemsListView
    participant Detail as ItemDetailModal
    participant Track as TrackingService
    participant Store as AppStore / localStorage

    Dono->>Vol: Informa perda de celular Samsung com capa verde
    Vol->>List: Busca por voz "Buscar celular" (ou digita)
    List-->>Vol: Exibe ETQ #02 (Badge "Não Expor #55")
    Vol->>Detail: Abre detalhe e confere foto sem exibir o item no balcão
    Vol->>Dono: Pede descrição detalhada / desbloqueio (§55)
    Vol->>Detail: Clica "Em Conferência" (opcional) -> grava evento CONFERENCIA
    Dono->>Vol: Comprova propriedade e fornece nome, telefone, congregação e endereço
    Vol->>Detail: Clica "Registrar Entrega ao Dono", dita dados e captura Foto 3 (opcional)
    Detail->>Track: transitionItemToDelivered()
    Track->>Track: Valida quemPegou, define status="Já Entregue", gera evento ENTREGUE
    Detail->>Store: Atualiza Item e marca ItemProcurado vinculado como ENTREGUE
    Store-->>Vol: Confirmação visual + TTS + Linha do tempo atualizada
```

### 4.3 Sequência C — Fluxo Emergencial de Criança / Pessoa Perdida (§56)

```mermaid
sequenceDiagram
    actor Ind as Indicador / Voluntário
    participant App as PWA Balcão
    participant SA as Indicadores + SA + SC
    actor Resp as Pais / Responsável

    Ind->>App: Fala "Criança perdida" ou clica botão "Criança / Pessoa"
    App-->>Ind: Abre formulário pré-configurado (Categoria=Criança, Valor=Precioso) + Alerta Vermelho §56
    Note over Ind,App: Regra crítica §56: NÃO fazer anúncio no microfone!
    Ind->>App: Registra foto, roupa, nome/idade, quem trouxe e salva
    Ind->>SA: Notifica imediatamente Depto. Indicadores, SA e SC
    Resp->>Ind: Chega ao balcão procurando a criança
    Ind->>App: Confere identidade do responsável, registra entrega com nome/tel/congregação
    App-->>Ind: Encerra ocorrência com trilha completa de horário entrada → entrega
```

### 4.4 Sequência D — Destinação Pós-Evento de Itens Retidos (>60 dias) pelo SA

```mermaid
sequenceDiagram
    actor SA as Superintendente de Assembleia
    participant Deck as DestinationDeckView
    participant Track as TrackingService
    participant Store as AppStore / localStorage

    SA->>Deck: Abre aba "Destinar (SA)"
    Deck->>Track: Filtra itens com status Guardado e getDiasGuardado() >= 60
    Deck-->>SA: Exibe cartões com foto, etiqueta, meses em guarda e botão Orientações (§54-58)
    SA->>Deck: Navega entre cartões e seleciona destino (DOAR | VENDER | DESCARTAR | CONTAS)
    SA->>Deck: Toca "DESPACHAR ITEM ACIMA"
    Deck->>Track: transitionItemToDispatchedSA(item, destino)
    Track->>Track: Define status=DESPACHADO (ou Já Entregue se CONTAS), quemPegou=SA, evento DESPACHADO_SA
    Deck->>Store: Salva em localStorage e avança automaticamente para o próximo cartão
```

### 4.5 Sequência E — Exportação, Importação e Mesclagem Multi-Dispositivo

```mermaid
sequenceDiagram
    actor VolB as Voluntário (Celular B)
    participant SyncB as SyncHub (Celular B)
    participant Canal as Arquivo .json / Web Share (WhatsApp/Bluetooth/USB)
    actor Coord as Encarregado (PC / Celular A)
    participant SyncA as SyncHub (Equipamento A)
    participant Merge as MergeService

    VolB->>SyncB: Toca "Exportar Evento Ativo" ou "Compartilhar Direto"
    SyncB->>Merge: buildSyncBundle(dbB, "single_event")
    SyncB-->>Canal: Gera PA_Sync_ES-005_CelularB.json (com fotos base64 + rastreio)
    Canal-->>Coord: Recebe arquivo no PC ou Celular A
    Coord->>SyncA: Clica "Importar & Mesclar Pacote (.json)"
    SyncA->>Merge: parseSyncBundle() + previewMerge(dbA, bundle)
    Merge->>Merge: Unifica evento por ID ou (codigo + data)
    Merge->>Merge: Classifica novosItens, conflitosId e colisoesEtiqueta
    Merge-->>Coord: Exibe MergePreview com alerta de colisões de etiqueta
    Coord->>SyncA: Escolhe estratégia ("Renumerar" ou "Prefixo do equipamento") e confirma
    SyncA->>Merge: executeMerge(dbA, bundle, opts)
    Merge->>Merge: Renumera preservando etiquetaOrigem, une timelines de rastreio e registra TRANSFERIDO_DISPOSITIVO
    Merge-->>SyncA: Base unificada salva no localStorage + SyncLogEntry gravado
```

---

## 5. Diagrama de Atividades Operacional (Fluxo de Decisão do Balcão)

```mermaid
flowchart TD
    Start([Item ou Pessoa chega ao balcão]) --> Tipo{É pessoa perdida?}
    Tipo -- Sim --> P56[Acionar Política §56:<br/>NÃO anunciar no microfone;<br/>avisar Indicadores, SA e SC]
    Tipo -- Não --> Cat{É Guarda-Volumes?}
    P56 --> Foto1

    Cat -- Sim --> Roupa{É roupa comum?}
    Roupa -- Não --> P58[Exigir Nome, Tel., Congregação<br/>e Endereço do Dono §58]
    Roupa -- Sim --> Foto1
    P58 --> Foto1

    Cat -- Não --> Val{Valor Alto/Precioso<br/>ou Carteira/Bolsa?}
    Val -- Sim --> P55[Marcar Não Expor §55<br/>Guardar em área restrita/cofre]
    Val -- Não --> Mesa[Expor na mesa de Achados]
    P55 --> Foto1
    Mesa --> Foto1

    Foto1[1. Colar Etiqueta #N no item + Tirar Foto 1] --> Foto2[2. Colar 2ª Etiqueta #N no Formulário Pág. X + Tirar Foto 2]
    Foto2 --> Salvar[Salvar em localStorage + Criar Rastreio]
    Salvar --> Procura{Dono apareceu<br/>durante o evento?}

    Procura -- Sim --> Conf[Conferir descrição/identidade + Registrar Entrega + Foto 3]
    Conf --> FimEntregue([Status: Já Entregue])

    Procura -- Não --> Din{É Dinheiro?}
    Din -- Sim --> Contas[Entregar ao Depto. Contas §57]
    Contas --> FimContas([Status: Já Entregue — Contas])

    Din -- Não --> Enc[Fica com Encarregado do Depto. §57]
    Enc --> Aguarda{Dono procurou<br/>em até 60 dias?}
    Aguarda -- Sim --> Conf
    Aguarda -- Não --> DeckSA[Entra no Deck Destinar SA]
    DeckSA --> DecSA[SA escolhe: DOAR, VENDER ou DESCARTAR]
    DecSA --> FimSA([Status: DESPACHADO])
```

---

## 6. Diagrama de Componentes e Implantação PWA

```mermaid
flowchart TB
    subgraph Devices ["Execução Multiplataforma (PC Windows/Mac/Linux + Android + iOS)"]
        subgraph Browser ["Navegador / App Instalado (Standalone PWA)"]
            Manifest[manifest.webmanifest + Ícones 192/512]
            SW[Workbox Service Worker<br/>Cache Offline de Assets]

            subgraph Presentation ["Camada de Apresentação (React 19 + Tailwind CSS v4)"]
                Shell[AppShell Responsivo<br/>Sidebar PC + Bottom Nav Mobile]
                Views[7 Views Especializadas + Modais<br/>Eventos, Itens, Procurados, Destinar, Relatório A4, Sync, MER/UML]
                VoiceUI[VoiceAssistant HUD + VoiceInput por Campo]
            end

            subgraph State ["Camada de Estado"]
                Store[AppProvider Context Store]
            end

            subgraph DomainServices ["Camada de Serviços Puros (Testados via Vitest)"]
                TrackSvc[TrackingService]
                PhotoSvc[PhotoService]
                VoiceSvc[VoiceService]
                MergeSvc[MergeService]
                ExcelSvc[ExcelService]
                StorSvc[StorageService]
            end

            subgraph WebAPIs ["APIs Nativas do Dispositivo"]
                LS[(localStorage<br/>assembleia_pa_db_v1)]
                Speech[Web Speech API<br/>SpeechRecognition + SpeechSynthesis]
                Camera[File/Camera API<br/>capture=environment + Canvas]
                ShareAPI[Web Share API / File Download / window.print]
            end
        end
    end

    SW --> Presentation
    Manifest --> Browser
    Presentation <--> Store
    Store --> DomainServices
    StorSvc <--> LS
    VoiceSvc <--> Speech
    PhotoSvc <--> Camera
    MergeSvc --> ShareAPI
    ExcelSvc --> ShareAPI
```

# Memória do Repositório — assembleia-perdidos-achados-pwa (Suíte Eventos v2)

## Contexto de Domínio
- **Suíte Eventos PWA** (offline-first, PC + Mobile, `localStorage` chave `assembleia_pa_db_v1`, `schemaVersion = 2` retrocompatível com v1).
- Reúne os **3 Apps Embutidos** clonados e modernizados do app Glide `Eventos (New)` (`ANL4cdICJTsLdTONT7Hp` no time `Testes`):
  1. **Perdidos e Achados & Guarda-Volumes**
  2. **Presidência do Congresso** (Programa 3d×2t, Oradores + 3 Substitutos, Check-in 3 etapas, Ensaios no Palco, Cronômetro Dual-Mode, Demonstrações/Entrevistas, Guia Áudio & Vídeo com Dica Play/Ativar Play, Agenda, Lembretes 7 perfis RBAC e Documentos)
  3. **Resumo de A Sentinela** (Ordem de Entrada com cascata cronológica em segundos — 30s padrão —, ESQUERDA/DIREITA/TRIBUNA `#FFD700` com auditoria de alternância, Galeria de Palco, Substituições, Imagens a Exibir A/V, Estúdio Áudio offline 16kbps + Salvar/Recuperar + Áudio Completo TTS + Conversar Com Todos)
- Compartilha um backbone comum: `Evento`, `Voluntario` (Equipe), `VoiceAssistant` (`pt-BR`), `MergeService` (multi-dispositivo) e documentação viva MER + UML (17 entidades).

## Regras Críticas de Negócio (Invariantes)
1. **LGPD / Privacidade (Repo Público)**: NUNCA commitar planilhas reais (`*.xlsx`, `*.csv`), fotos reais ou dados pessoais dos irmãos no Git. Usar somente dados sintéticos fictícios no seed de demonstração.
2. **Retrocompatibilidade `localStorage` (`v1 → v2`)**: `loadDatabase()` inicializa seguramente os arrays novos sem perder registros anteriores de Achados; `SyncBundle` preserva formato `ASSEMBLEIA_PA_SYNC_V1` com campos opcionais para os módulos novos.
3. **Achados (§54–58)**: Foto 1 → Etiqueta Gêmea (`Form Página` 15 linhas/pág.) → Foto 2; §55 Não Expor; §56 Pessoa Perdida (sem anúncio mic); §57 Contas + Destinar SA >= 60d + Reverter < 7d; §58 Guarda-Volumes.
4. **Presidência**: Ensaio no Palco elegível para `Ao Vivo` + (`Discurso` | `Oração`); Cronômetro Dual-Mode (Ao Vivo vs Ensaio Pessoal) com alertas `-1 min` e `PASSOU DA HORA`; `Ativar Play` no Guia A/V.
5. **Resumo de A Sentinela**: Reordenar perguntas recalcula cascata `HH:MM:SS` completa; alerta se dois comentaristas seguidos compartilham `ESQUERDA` ou `DIREITA`; `MediaRecorder` usa 16 kbps (máx. 60s) para proteger a cota de `localStorage`.
6. **HTML Visual Offline (`mer_uml_visual.html`)**: Sempre usar cores hex concretas resolvidas em JS (`getPalette()`), nunca `var(--card)` direto em atributos SVG `fill`, para evitar caixas pretas fora de iframe.

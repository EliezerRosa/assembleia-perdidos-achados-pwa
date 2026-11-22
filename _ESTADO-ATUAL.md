# Estado Atual do Projeto — Perdidos & Achados / Guarda-Volumes PWA

**Última atualização:** 2026-11-22  
**Workspace local:** `C:\Antigravity - Assembleia`  
**Repositório remoto:** `origin/main` (GitHub `EliezerRosa/assembleia-perdidos-achados-pwa`, privado)

---

## Status Geral

- **Aplicação PWA (PC + Mobile):** Concluída, compilando sem erros (`tsc --noEmit` + `vite build` + Workbox SW) e validada por suíte de testes Vitest.
- **Modelagem MER + UML Granular:** Concluída em `docs/MER.md`, `docs/UML.md`, `docs/ARQUITETURA.md` e integrada interativamente no app (`src/components/views/ArchitectureView.tsx`).
- **Compatibilidade Excel (`Perdidos e Achados (Guarda-Volumes).xlsx`):** Validada contra o arquivo real de 170 registros em 7 eventos (sem versionar nenhum dado pessoal/PII no Git).
- **Voz (Acessibilidade pt-BR):** Implementada via Web Speech API + parser multi-campo + TTS + fallback por barra de comando (`Ctrl+K`).
- **Sincronização Multi-Dispositivo (`localStorage` + JSON Merge):** Implementada com detecção/resolução de colisões de etiquetas, preservação de `etiquetaOrigem`, união de timelines de rastreio e Web Share API.

---

## Estrutura Principal

- `src/types/domain.ts` — Entidades e contratos TypeScript estritos.
- `src/constants/catalog.ts` — Catálogo normalizado de tipos de item, orientações §54–58 e guia de comandos de voz.
- `src/services/`:
  - `storageService.ts` — Persistência `localStorage` (`assembleia_pa_db_v1`), medidor de cota e seed fictício.
  - `photoService.ts` — Compressão Canvas JPEG + carimbo opcional de etiqueta/hora.
  - `trackingService.ts` — Máquina de estados, regras §55–58, retenção `>= 60d` e rastreio imutável.
  - `mergeService.ts` — Exportação `SyncBundle`, `previewMerge` e `executeMerge` multi-dispositivo.
  - `excelService.ts` — Importação/exportação `.xlsx` e `.csv` compatível com as 25 colunas do Glide/Excel.
  - `voiceService.ts` — Reconhecimento de voz `pt-BR`, TTS e parser de comandos/formulário multi-campo.
- `src/store/useAppStore.tsx` — Estado global reativo sincronizado com `localStorage`.
- `src/components/views/` — 7 telas completas + 2 modais (`DashboardEventsView`, `ItemsListView`, `ItemFormModal`, `ItemDetailModal`, `WantedItemsView`, `DestinationDeckView`, `FinalReportView`, `SyncHubView`, `ArchitectureView`).
- `src/__tests__/` — Suíte Vitest cobrindo tracking, merge, voice e excel.

---

## Próximos Passos Sugeridos (Opcionais)

1. Publicar build estático (`dist/`) no Vercel, Netlify ou GitHub Pages (com HTTPS obrigatório para instalação PWA e uso da câmera/microfone em celulares via rede externa).
2. Caso deseje inspecionar telas adicionais do app Glide original (`https://go.glideapps.com/app/fDanoeJRA4XDD8zcrTca/layout`), habilitar remote debugging no Chrome (`chrome://inspect/#remote-debugging`) na próxima sessão.
3. Importar localmente o arquivo `Perdidos e Achados (Guarda-Volumes).xlsx` pela aba **Exportar / Mesclar** para popular o histórico no navegador de trabalho.

# Estado Atual do Projeto — Suíte Eventos PWA (3 Apps Embutidos)

**Última atualização:** 2026-11-23  
**Workspace local:** `C:\Antigravity - Assembleia`  
**Repositório remoto:** `origin/main` (GitHub `EliezerRosa/assembleia-perdidos-achados-pwa`)  
**Deploy GitHub Pages (HTTPS + PWA):** https://eliezerrosa.github.io/assembleia-perdidos-achados-pwa/  
**CI/CD:** `.github/workflows/deploy-pages.yml` (`typecheck` → `test` → `build` → GitHub Pages)

---

## Status Geral

- **Suíte Eventos PWA v2 (PC + Mobile, `schemaVersion = 2`, retrocompatível com v1):** Concluída, validada com `tsc --noEmit` (0 erros), **6 arquivos / 18 testes Vitest aprovados** e build PWA Workbox limpo.
- **App Embutido 1 — Perdidos & Achados + Guarda-Volumes:** Completo (Foto → Etiqueta → Foto, §54–58, Procurados, Destinar SA >=60d + Reverter <7d, Excel 25 cols, `PA.txt`, `ANEXO 1` 15l/pág A4 + `Relatório Final` A4).
- **App Embutido 2 — Presidência do Congresso:** Clonado e modernizado do Glide `ANL4cdICJTsLdTONT7Hp` (`PresidenciaHubView`, `ProgramaView`, `ParticipacoesDemosView`, `GuiaAVView`, `AgendaLembretesView`, `presidenciaService.ts`):
  - Painel *Evento em Foco* + Folha do Presidente de Sessão A4 (6 turnos);
  - Programa 3 dias × 2 turnos, 14 tipos, 3 formatos, orador + 3 substitutos (com clonagem e promoção 1-toque);
  - Check-in 3 etapas + Ensaio no Palco + WhatsApp modelo Salmo 134:3 + log de contatos;
  - Cronômetro Dual-Mode (*Ao Vivo* vs *Ensaio Pessoal*) com alertas `-1 min` e `PASSOU DA HORA`;
  - Participantes de Demonstrações/Entrevistas/Experiências/Encenações;
  - Guia Áudio & Vídeo com `Dica Play` e modo `Ativar Play` (em aba própria e embarcado dentro da parte);
  - Agenda, Lembretes filtrados por 7 perfis RBAC (*Já Lido e Feito*) e Documentos de Referência.
- **App Embutido 3 — Resumo de A Sentinela:** Clonado e modernizado do Glide `Resumo de A Sentinela (Grok)` (`SentinelaView`, `SentinelaDetailModal`, `sentinelaService.ts`):
  - Estudo + Ordem de Entrada reordenável (`↑`/`↓`) com **encadeamento cronológico em cascata em segundos** (30s padrão);
  - Coreografia `ESQUERDA` / `DIREITA` / `TRIBUNA` com banner dourado `#FFD700` e alerta automático de lado repetido;
  - `Resumo Galeria` com fotos, `1º Dia` + `Ensaio Palco (Dom 8:30)` com convite WhatsApp, Matriz de Substituições e Orientações oficiais (`w19.01`, `w16.09`, `th`);
  - Deck **Imagens a Exibir** para A/V (`👈👈👈 EXIBIR esta imagem`);
  - Estúdio de Áudio offline (`MediaRecorder` 16 kbps) + ditado `pt-BR` + **Salvar / Recuperar Backup** + Player sequencial **`Áudio Completo`** (com fallback TTS) + chat **`Conversar Com Todos`**.
- **Backbone Compartilhado:** `EquipeVoluntariosView`, Seletor dos 3 Apps no topo do `AppShell` (com Bottom Nav mobile dinâmica de 5 abas por app), `voiceService` expandido, `mergeService` consolidando os 3 apps e **MER + UML v2 (17 entidades)** atualizados em `docs/MER.md`, `docs/UML.md`, `docs/ARQUITETURA.md`, `docs/mer_uml_visual.html`, `public/mer-uml-visual.html` e `ArchitectureView.tsx`.

---

## Arquitetura de Arquivos

- `src/types/domain.ts` — Contratos estritos das 17 entidades + `AppSuiteMode` + `SyncBundle` v1/v2.
- `src/constants/catalog.ts` — `SCHEMA_VERSION = 2`, enums oficiais Glide, orientações §54–58 e Orientações Sentinela.
- `src/services/` — 8 serviços puros: `storageService`, `photoService`, `trackingService`, `presidenciaService`, `sentinelaService`, `mergeService`, `excelService`, `voiceService`.
- `src/store/useAppStore.tsx` — Store reativo unificado dos 3 apps persistido em `localStorage` (`assembleia_pa_db_v1`).
- `src/components/views/` — 15 views/modais cobrindo os 3 apps + Equipe + Sync + MER/UML.
- `src/__tests__/` — 6 suítes Vitest (`tracking`, `presidencia`, `sentinela`, `voice`, `merge`, `excel` — 18/18 aprovados).

---

## Próximos Passos Sugeridos (Opcionais)

1. Testar os 3 apps embutidos no endereço online (`https://eliezerrosa.github.io/assembleia-perdidos-achados-pwa/`) clicando em **Carregar Dados de Demonstração Fictícios** para explorar Achados, Presidência e Resumo de A Sentinela imediatamente.
2. Caso queira no futuro importar planilhas `.xlsx` dedicadas da grade do Programa do Congresso ou do Resumo de A Sentinela (além da planilha já suportada de Perdidos e Achados), basta adicionar parsers equivalentes em `excelService.ts`.

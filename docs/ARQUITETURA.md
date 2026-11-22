# Arquitetura e Decisões Técnicas

## 1. Visão Geral

O **Perdidos & Achados — Guarda-Volumes PWA** foi projetado para operar **100% offline-first** em **PCs** (Windows/macOS/Linux) e **Mobiles** (Android e iOS) durante Assembleias e Congressos, onde a conectividade de internet no Salão de Assembleias frequentemente oscila ou inexiste.

## 2. Stack Escolhida

| Camada | Tecnologia | Justificativa |
| --- | --- | --- |
| Build & Bundler | **Vite 6** + **TypeScript 5.8 (strict)** | Build rápido, code-splitting (`vendor`, `xlsx`, `mermaid`) e segurança de tipos |
| UI & Responsividade | **React 19** + **Tailwind CSS v4** + **Lucide Icons** | Layout adaptativo (Sidebar no Desktop, Bottom Navigation ergonômica no Mobile), alvos de toque >= 44px e folha de impressão `@media print` A4 |
| PWA | **vite-plugin-pwa (Workbox)** | Manifesto instalável, Service Worker com cache offline automático e banner de instalação nativo |
| Persistência | **Browser `localStorage`** (`assembleia_pa_db_v1`) | Atende diretamente ao requisito de armazenamento local transparente, com medidor de uso em KB/MB/% e proteção contra `QuotaExceededError` |
| Fotos | **HTML5 Canvas (`photoService.ts`)** | Redimensiona automaticamente fotos para <= 900px e comprime em JPEG (~35–55 KB/foto), com carimbo opcional da etiqueta e hora |
| Planilhas | **SheetJS (`xlsx`)** | Importação direta de `Perdidos e Achados (Guarda-Volumes).xlsx` e `.csv`, e exportação retrocompatível com as 25 colunas |
| Acessibilidade por Voz | **Web Speech API (`pt-BR`)** | Reconhecimento contínuo por comando + ditado por campo + preenchimento multi-campo por frase natural + retorno falado (`SpeechSynthesis`) + fallback por barra de comando (`Ctrl+K`) |
| Documentação Viva | **Mermaid.js** (lazy-loaded) | Renderização interativa dos diagramas MER e UML dentro da própria aplicação + arquivos versionados em `docs/` |
| Testes | **Vitest** | Testes unitários automatizados para ciclo de vida, mesclagem multi-dispositivo, voz e importação/exportação Excel |

## 3. Estratégia de Mesclagem Multi-Dispositivo (Requisito #9)

Para permitir que múltiplos voluntários cadastrem itens simultaneamente em celulares e PCs independentes e depois consolidem tudo em um único equipamento:

1. **Identidade Única Global**: Cada item possui `id` único, `deviceId`, `deviceName` e `updatedAt`.
2. **Prevenção Opcional na Origem**: Na aba *Sincronizar*, cada equipamento pode configurar um prefixo (ex.: `A-`, `B-`) ou etiqueta inicial (ex.: `1`, `101`, `201`).
3. **Unificação Automática de Evento**: Eventos criados separadamente com o mesmo `(codigo, data)` são mesclados em um único evento ao importar o pacote `.json`.
4. **Detecção e Resolução de Colisões de Etiqueta**: Antes de gravar, o `MergePreview` exibe quantas etiquetas colidiram e permite escolher:
   - **Renumerar automático (recomendado)**: atribui a próxima etiqueta livre do evento e preserva a etiqueta original em `etiquetaOrigem` e no rastreio.
   - **Prefixo do equipamento**: diferencia visualmente (ex.: `CEL-01`).
   - **Manter igual**: preserva ambos os códigos.
5. **União de Rastreio e Fotos**: Quando o mesmo item (`id`) foi atualizado em dois equipamentos (ex.: foto da etiqueta no Celular A e entrega no PC B), o motor mantém a atualização mais recente, **preserva fotos de ambos os lados** e une cronologicamente todos os eventos de `rastreio[]`.

## 4. Privacidade e LGPD

- Nenhum dado pessoal real (nomes, telefones, endereços ou congregações da planilha operacional) é versionado no repositório Git.
- O `.gitignore` bloqueia arquivos `*.xlsx`, `*.xls`, `*.csv` e `*.backup.json`.
- O aplicativo oferece um conjunto de dados **100% fictício** para demonstração e um importador local para o usuário carregar sua própria planilha `Perdidos e Achados (Guarda-Volumes).xlsx` diretamente no navegador.

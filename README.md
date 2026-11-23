# Perdidos & Achados — Guarda-Volumes (PWA)

🌐 **Acesso Online (GitHub Pages / Instalável como PWA):** https://eliezerrosa.github.io/assembleia-perdidos-achados-pwa/

Aplicativo **PWA (Progressive Web App)** offline-first desenvolvido para rodar em **PC (Windows/macOS/Linux)** e **Mobiles (Android/iOS)** no Departamento de **Perdidos e Achados & Guarda-Volumes** de Assembleias e Congressos.

Baseado no fluxo operacional da planilha `Perdidos e Achados (Guarda-Volumes).xlsx`, do aplicativo Glide de referência, das orientações oficiais (§54–58) e do `Relatório Final - Após o Evento` (Salão de Assembleias — Guarapari/ES).

---

## Principais Recursos

1. **PWA Instalável & 100% Offline-First (`PC + Mobile`)**
   - Manifesto Web App, ícones PNG 192/512 + Apple Touch Icon e Service Worker Workbox.
   - Persistência em `localStorage` (`assembleia_pa_db_v1`) com medidor de espaço e compressão automática de fotos via Canvas (~40 KB/foto).
2. **Fluxo Foto → Etiqueta → Foto (+ Foto de Entrega)**
   - **Foto 1**: Foto do item com a etiqueta física `#N` colada (com carimbo opcional de etiqueta + hora).
   - **Etiqueta Gêmea**: Numeração sequencial automática por evento + confirmação de aplicação no objeto e na `Form Página` do formulário em papel + impressão de par de etiquetas gêmeas.
   - **Foto 2**: Foto da etiqueta no formulário físico / comprovante.
   - **Foto 3 (opcional)**: Foto comprobatória na entrega ao dono.
3. **Ciclo de Vida Completo & Rastreio Auditável**
   - Máquina de estados: `Ainda Guardado` → `Em Conferência` → `Já Entregue` / `Entregue ao Depto. Contas` / `DESPACHADO (DOAR | VENDER | DESCARTAR)` + `Reabertura` auditada.
   - Linha do tempo cronológica (`rastreio[]`) registrando data/hora, operador, equipamento e localização de custódia em cada etapa.
   - Alertas automáticos das **Orientações Oficiais (§54–58)**:
     - **§55**: Artigos de valor (`Alto`/`Precioso`), carteiras, bolsas e celulares marcados como **Não Expor** (cofre/área restrita).
     - **§56**: Fluxo prioritário de **Criança / Pessoa Perdida** (alerta explícito: *não anunciar no microfone; avisar Indicadores, SA e SC*).
     - **§57**: Dinheiro direcionado ao **Departamento de Contas**; itens retidos há `>= 60 dias` entram automaticamente no deck **Destinar (SA)**.
     - **§58**: Validação de dados do dono (Nome/Tel., Congregação e Endereço) para itens de **Guarda-Volumes** (exceto roupas).
4. **Acessibilidade por Voz (`pt-BR`) & UIX Ergonômica**
   - Assistente flutuante de voz (`Alt+V`) e barra de comando rápida (`Ctrl+K`) para abrir telas, buscar e filtrar.
   - Botão de microfone individual em cada campo de formulário + **Ditado Inteligente Multi-Campo** (ex.: *"Celular Samsung capa verde, valor alto, categoria perdido, quem trouxe Maria no banheiro feminino"*).
   - Retorno falado (TTS), modo **Alto Contraste** e controle de tamanho da fonte (`Normal` / `Grande` / `Extra`).
5. **Itens Procurados com Correspondência Inteligente**
   - Registro de solicitações com foto de referência e pontuação automática de similaridade contra todos os itens cadastrados (incluindo os já entregues para rastreio).
6. **Relatório Final Oficial & ANEXO 1 (Relação dos Itens Encontrados — 15 linhas/pág. A4)**
   - **ANEXO 1 (Manual de Funcionamento Pág. 16/19):** substitui o antigo PDF com JavaScript embutido (`PA.txt`), gerando automaticamente folhas A4 de 15 itens por página (ignorando *"Já Entregue"* por padrão, ou paginando por `Form Página`), com impressão multi-página em 1 clique + exportação opcional de `PA.txt` compatível com o PDF legado.
   - **Relatório Final — Após o Evento (Guarapari/ES):** preenchível por voz, com resumo estatístico automático e layout de impressão A4 limpo (`@media print`).
7. **Exportação, Importação & Mesclagem Multi-Dispositivo + Excel**
   - Exportação de pacote JSON completo (com fotos e rastreio) + compartilhamento nativo (`Web Share API` para WhatsApp/Bluetooth/Drive).
   - **Importação com Pré-visualização e Resolução de Colisões de Etiquetas** (renumerar automaticamente preservando `etiquetaOrigem`, prefixo por equipamento ou manter), permitindo juntar registros de vários celulares e PCs em um único aparelho.
   - Importação e exportação nativa `.xlsx` e `.csv` compatível com as 25 colunas da planilha original.
8. **Modelagem MER + UML Granular**
   - Documentada em [docs/MER.md](docs/MER.md), [docs/UML.md](docs/UML.md) e [docs/ARQUITETURA.md](docs/ARQUITETURA.md).
   - **Explorador Gráfico-Visual Interativo (100% offline):** [docs/mer_uml_visual.html](docs/mer_uml_visual.html) e publicado online em https://eliezerrosa.github.io/assembleia-perdidos-achados-pwa/mer-uml-visual.html (também acessível na aba **MER + UML** do app).

---

## Como Executar

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em desenvolvimento (acessível também na rede local para testar no celular!)
npm run dev

# 3. Executar testes unitários e verificação de tipos
npm run typecheck
npm test

# 4. Gerar build de produção PWA (pasta dist/)
npm run build
npm run preview
```

---

## Privacidade & LGPD

- Nenhum dado pessoal real da planilha operacional é incluído neste repositório.
- O `.gitignore` bloqueia arquivos `*.xlsx`, `*.xls`, `*.csv` e `*.backup.json`.
- Para trabalhar com sua base histórica, abra a aba **Exportar / Mesclar** no PWA e clique em **Importar Planilha Excel (.xlsx)** — os dados permanecem estritamente no `localStorage` do seu navegador.

# Padronização visual das gestões — 19/10/2026

Paulo autorizou a padronização visual de geradores, veículos, rotas, motoristas e catadores, seguindo Gestão de PEVs e Gestão de Resíduos. Base: Katua_Web/main f27a4ea. Entrega de interface; a implantação na VPS continua sob responsabilidade de Paulo.

## Diagnóstico

As páginas combinavam cabeçalhos grandes com breadcrumbs, botões próprios e Bootstrap, buscas desenhadas com estilos inline, tamanhos de fonte diferentes e vários tons para as mesmas ações. Cadastros, edições, documentos e manutenções não mantinham a mesma apresentação das listagens. A lista de motoristas reside em staff-management; os catadores têm páginas próprias no mesmo diretório.

## Implementação

- Cabeçalho compartilhado com identificação KATUÁ, módulo, título principal h1, descrição e ações existentes. Tipografia herda Geist do painel, com a hierarquia das telas de referência.
- Navegação interna por módulo no padrão de botões de PEVs: lista, cadastro e telas relacionadas. A aba atual é identificada visualmente e com aria-current. Cadastros e edições continuam acessíveis pelos caminhos existentes.
- Paleta comum: texto verde escuro #203b2d, destaque #176944, ação principal #198754, bordas #dce7df e cabeçalho de tabela #f2f7f3. Alertas e situações preservam cores semânticas distintas.
- Cartões com bordas suaves, cantos de 14 px e espaçamento regular. Botões, campos e seletores com cantos de 8 px, tamanhos coerentes e estados de foco, desabilitado e hover.
- Tabelas com cabeçalhos uniformes, linhas mais legíveis, ações com ícones coerentes e rolagem contida em telas estreitas. Cabeçalhos não quebram palavras em letras isoladas. Controles e navegação se reorganizam no celular.
- Buscas inline migradas para classe comum, sem alterar filtros. Rótulos acessíveis nas buscas em português e nas ações de editar veículo/motorista. Textos de confirmação de documentos, manutenção e frequência em português, preservando os respectivos eventos de exclusão/inativação.
- Estilo restrito ao componente ManagementWorkspace e a uma lista explícita de rotas. Sidebar, cabeçalho global, autenticação, dashboard, relatórios, PEVs e resíduos mantêm seus estilos. O wrapper não inclui cabeçalhos globais.
- Removidas duas variáveis/parâmetros sem uso em documentos legados da equipe para o lint dos arquivos alterados passar; não modifica envio ou tratamento de arquivos.

Os handlers, contratos de API, campos enviados, cálculos, filtros, validações e regras de negócio foram preservados. A navegação interna é o acréscimo de interface desta etapa. Não há alteração em KatuApp, banco, dependências ou variáveis de ambiente.

## Telas abrangidas

| Módulo | Telas |
| --- | --- |
| Geradores — 4 | Lista, cadastro, edição, documentos/histórico |
| Veículos — 9 | Lista, cadastro e edição; lista/cadastro/edição de documentos; lista/cadastro/edição de manutenções |
| Rotas — 5 | Lista, cadastro, edição, MTR/notas fiscais e calendário operacional |
| Motoristas — 3 | Lista, cadastro e edição |
| Catadores — 3 | Lista, cadastro e documentos/ficha |
| Registros relacionados da equipe — 9 | Rotas delegadas e formulários legados; frequência e documentos da equipe, com suas listas, cadastros e edições |

Total: 33 páginas. As telas legadas continuam com os contratos funcionais anteriores; padronizar o visual não homologa endpoints antigos nem cria funcionalidades ausentes.

## Arquivos principais

- frontend/src/components/management/ManagementWorkspace.jsx — escopo e cabeçalho compartilhado.
- frontend/src/components/management/managementModules.js — rotas, módulos e navegação.
- frontend/src/components/management/managementWorkspace.css — regras visuais restritas.
- frontend/src/layouts/AdminLayout.jsx — aplicação do escopo somente às rotas selecionadas.
- frontend/src/pages/generator-management/*.jsx
- frontend/src/pages/vehicle-management/*.jsx
- frontend/src/pages/route-management/*.jsx
- frontend/src/pages/staff-management/*.jsx
- frontend/src/pages/operations/OperationalCalendar.jsx
- docs/validacao-visual-gestoes-2026-10-19.json

## Validação

ESLint dos componentes e páginas alterados e build Vite aprovados. Os 26 testes existentes de unidade/contrato/regressão passaram. Permanece o aviso de bundle grande, já presente no painel.

Conferência em Chromium local com respostas de API simuladas e dados fictícios: 33 páginas em 1440 px e 430 px (66 combinações), com cabeçalho único, navegação interna e ausência de transbordamento horizontal da página. Não houve erro JavaScript nem requisição de gravação nesse percurso. Capturas de listas, cadastro, edição e ficha revisadas visualmente. Modal de inativação abriu e cancelou; rotas de PEVs e resíduos conferidas fora do novo escopo.

Uma rodada curta após os ajustes finais confere novamente os cinco módulos, documentos, manutenção, formulário, busca, navegação e modal. O relatório registra os resultados. A validação é de apresentação e interação da interface; não substitui testes funcionais com API real, homologação do Google Maps dos geradores ou dados de produção. Avisos preexistentes de imports de imagens em public aparecem no servidor de desenvolvimento; o build concluiu.

## Atualização na VPS

Somente Katua_Web/main. No caminho já utilizado na VPS:

```bash
cd /var/www/katua/frontend && git pull --ff-only origin main && cd frontend && npm ci && npm run build
```

Se o Git bloquear por alteração local/conflito, preservar os arquivos e conferir o conflito. Após o build, abrir painel.katua.com.br com Ctrl+Shift+R e conferir as cinco gestões. Esta etapa não exige migração do banco nem reinicialização da API.

## Backlog e continuidade

| Item | Prioridade | Situação / critério |
| --- | --- | --- |
| Padronizar letras, cores, botões e cartões | P1 | Implementado nos cinco módulos e páginas relacionadas |
| Conferência desktop e celular | P1 | Validada localmente com dados fictícios; conferência final na VPS pelo responsável |
| Publicação visual na VPS | P1 | Paulo executa o comando do painel e confere com dados reais |
| Próximas melhorias funcionais | P2 | Próxima etapa após aceite do visual; definir diagnóstico e prioridades por módulo |
| Endpoints e telas legadas da equipe | P2 | Revisar compatibilidade de /api/staff, atribuições antigas, frequência e documentos antes de evoluir funções; contratos mantidos nesta entrega |
| Indicadores e filtros | P2 | Rever regras, unidades, cartões e cálculos em etapa funcional própria, sem presumir correção a partir desta mudança visual |
| Escala e desempenho | P2 | Avaliar paginação no servidor, carregamento de módulos e bundle conforme volume real |
| Idioma e acessibilidade completos dos legados | P2 | Cabeçalhos e confirmações principais ajustados; revisar traduções restantes, rótulos e navegação por teclado em etapa funcional |

Próximo passo: publicar o painel e validar a apresentação com Paulo; depois avançar para as funções das gestões com escopo definido. Sem implantação na VPS nesta entrega.

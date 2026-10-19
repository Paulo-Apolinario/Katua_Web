# Continuidade — coletas e solicitações

19/10/2026. Base: Katua_Web main 232d9d2. Usuário autorizou todas as melhorias propostas, incluindo uma linha por coleta. Entrega somente no painel. Sem alterações de API, schema, migrações, VPS ou dados reais.

## Diagnóstico confirmado

WasteList consultava entradas de materiais (/collection-entries, padrão de 50 registros) e ignorava a paginação da API. DataTable recebia limites undefined, resultando em zero linhas mesmo com dados. Barras de 100% não tinham medida; ausência virava zero/kg; indicadores não acompanhavam filtros. Solicitações não tinham filtros/paginação, confundiam criação/data desejada com programação e permitiam escolhas de equipe divergente da rota. Erros apareciam somente em toast e dados anteriores podiam continuar visíveis.

## Decisões e implementação

- /waste-list usa GET /collections, uma linha por operação, incluindo pendentes sem materiais. Endpoint existente retorna conjunto completo; paginação local 10/25/50 não limita aos primeiros 50. GET /collections/:id sob demanda e ?coleta=<id> para acessar/recarregar detalhes.
- Materiais e destinações preservados em /collected-waste e /collected-waste/:id; detalhes de cada material oferecem link para sua entrada quando existe wasteEntry.id. Nada foi removido desses fluxos.
- Busca sem distinção de acentos; filtros por etapa, gerador, rota, catador, motorista, veículo e período de programação/finalização em campo/criação. Cartões seguem filtros. Registros sem a data escolhida ficam fora do período.
- Quantidades apenas dos materiais informados, agrupadas por unidade, excluindo canceladas. Não soma litros com kg, não presume kg nem converte ausência em zero. Aviso sobre medidas ausentes e distinção de estoque. Barras artificiais retiradas.
- Todas as etapas da coleta em português. Histórico usa apenas datas e atores registrados. Equipe é a vinculada à coleta, sem substituir pelo vínculo atual da rota. Previsão da solicitação separada do material real.
- Solicitações com busca por protocolo/gerador/material/endereço, município/bairro quando estruturados, período com três tipos de data, filas e paginação. Não interpreta bairro/cidade de endereço livre. Cartões mostram distribuição conforme busca/local/período; seletor de fila atua sobre tabela.
- Com coleta vinculada, solicitação fica Delegada, inclusive se a coleta foi cancelada: contrato não permite segunda coleta para o mesmo scheduleId. IN_PROGRESS sem vínculo aparece Em atendimento, sem classificação de encerramento.
- Analisar consulta GET /schedules/:id. Estimativas e notas do gerador separadas das orientações operacionais. POST /collections não envia peso ou materiais reais.
- Opções carregadas ao abrir, com atualização e bloqueio se houver falha. Catadores AVAILABLE; veículos ACTIVE; motoristas AVAILABLE ou ON_ROUTE da própria rota. Selecionar rota preenche/mantém equipe; conflitos e vínculos indisponíveis são explicados antes do envio. Limpar rota limpa vínculos herdados.
- Sucesso exige collection.id retornado pelo servidor; link Ver coleta criada. Proteção a cliques duplicados. Rejeição preserva formulário e orienta atualizar quando resposta for incerta. Nenhuma confirmação local/offline.
- Estado reinicia por ID autenticado; respostas tardias ignoradas e dados anteriores limpos na nova consulta. Sem cache compartilhado.
- Modal acima do menu, foco contido/restaurado, ESC, título acessível e rolagem interna. CSS restrito às telas; tabela com quebra no desktop e rolagem horizontal contida no celular. Não altera DataTable/menu global.

## Arquivos

- frontend/src/pages/waste-management/WasteList.jsx
- frontend/src/pages/waste-management/CollectionRequests.jsx
- frontend/src/utils/collectionWorkspace.js
- frontend/src/components/collections/CollectionDialog.jsx
- frontend/src/components/collections/WorkspaceParts.jsx
- frontend/src/components/collections/collectionWorkspace.css
- frontend/src/services/scheduleService.js (codifica identificador no GET por ID)
- frontend/tests/collection-workspace.test.mjs
- frontend/tests/collection-workspace-browser.mjs
- docs/melhorias-coletas-2026-10-19.md
- docs/validacao-coletas-2026-10-19.json

## Validação executada

ESLint dos arquivos de implementação sem avisos; Vite build passou, mantendo aviso preexistente de bundle grande. Treze testes de contrato/regressão: quatro novos grupos de unidades/datas/filas/equipe e nove existentes de MTR/rotas/veículos.

Seis cenários Chromium, API Fastify/Prisma e PGlite descartável; 65 coletas e 14 solicitações. Fluxo feliz sem API mock: paginação >50; filtros; unidades; histórico; datas distintas; opção de manutenção ausente; equipe herdada; criação confirmada e persistida após recarga sem fabricar peso; solicitação delegada não duplicável; foco/ESC; camada/limites do modal móvel; outra cooperativa sem leitura por ID e com listas vazias; motorista redirecionado ao login.

Erros 409/500 simulados: formulário preservado, listagem sem dados antigos, confirmação bloqueada se opções falham. Offline/reconexão: erro persistente e recuperação real. Duas criações simultâneas para mesmo scheduleId: uma 201, outra rejeitada e uma linha persistida no PGlite. Isso não substitui concorrência com PostgreSQL nativo. Capturas desktop/móvel revisadas; credenciais e fixture temporárias não entram no repositório.

Comandos: node --test tests/collection-workspace.test.mjs tests/edit-contracts.test.mjs tests/route-assignment-summary.test.mjs tests/mtr-preparation.test.mjs ; npm run build.

Teste integrado requer KatuApp ao lado e dependências em KATUA_VALIDATION_TOOLS, Playwright em KATUA_PLAYWRIGHT_MODULE e Chromium em KATUA_CHROMIUM_PATH. Cria banco isolado em 127.0.0.1:54329; nunca usa DATABASE_URL real.

## Backlog

| Item | Evidência e impacto | Prioridade | Estado |
| --- | --- | --- | --- |
| Lista por coleta, paginação e estados | Contrato antigo ocultava registros e confundia material/operação | P1 | validado localmente |
| Filtros, quantidades e datas | Cartões e datas anteriormente inconsistentes | P1 | validado localmente |
| Análise, delegação e histórico | Criação real conferida após recarga | P1 | validado localmente |
| Publicar e conferir na VPS | Sem deploy ou observação em produção nesta etapa | P1 | pendente de publicação |
| Disponibilidade final na API /collections | collection.service.ts create filtra veículo diferente de INACTIVE antes de herdar equipe da rota; não garante MAINTENANCE/ocupação em todas as entradas. Proteção nova é da interface, não garantia do servidor | P1 | confirmado; etapa de integridade da API pendente |
| PostgreSQL real e demais perfis | PGlite não cobre todos os interleavings nativos; collector/gerador/admin em todos os endpoints não testados | P1 | a confirmar no ambiente adequado |
| Escala das listagens | Endpoints retornam conjunto completo com relações; paginação local não reduz rede | P2 | confirmado; evolução de paginação/agregação no servidor pendente |
| Dados estruturados e histórico legado | Não deduz bairro/cidade de endereço livre nem eventos de datas ausentes | P2 | a confirmar com dados reais |

## Próximo passo

Publicar somente painel e conferir com dados reais. API/banco não precisam atualizar nesta entrega. Depois tratar disponibilidade final na criação da coleta como etapa própria de integridade, com transações/concorrência e regras já definidas para rotas. Não declarar integridade global de atribuições ou validação de produção com base nesta entrega de interface.

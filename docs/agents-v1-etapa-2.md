# KATUÁ Agents v1 — Etapa 2: Interface e Interação

Entrega em 04/11/2026. Criadores e desenvolvedores da plataforma: **Paulo Roberto Apolinario da Silva** e **Nilton Felipe de Oliveira Braz**.

Implementação mantida em branches locais `work/agents-v1-interface-20261104`. Backend continua a etapa 1; painel partiu da `main` atualizada. Sem push, merge, alteração de produção ou deploy. O envio aos repositórios permanece reservado para depois das três etapas e da validação solicitada.

## Comportamento entregue

- **Um assistente flutuante**, restrito à cooperativa e integrado ao AdminLayout. Permanece aberto entre telas sem remontar os formulários operacionais. Minimizar preserva conversa/rascunho; fechar recolhe o painel e limpa o contexto da ocorrência, preservando o histórico.
- **Histórico por usuário no servidor**, com seleção de conversa, nova conversa, paginação de conversas e mensagens. Ao recarregar a página, o usuário seleciona uma conversa do histórico para recuperá-la. Rascunhos não são persistidos no navegador.
- **Comandos rápidos e texto limitado ao catálogo**. A interface identifica expressamente o motor por regras. Comando desconhecido retorna orientação; não é apresentado como conversa livre de IA e não é salvo como conversa pelo backend.
- **Respostas reais das APIs**, identificando o Agente de Coletas, Rotas ou Gestor retornado pelo servidor. Exibem indicadores traduzidos, motivos, recorte da consulta e links internos permitidos. Não há HTML gerado pelo agente nem dados demonstrativos na aplicação de produção.
- **Sino preservado**: InboxBell, a API de notificações, a marcação de leitura e os eventos de atualização continuam sendo os mecanismos existentes. A Central de avisos ganhou a ação “Analisar com assistente” para notificações de propostas dos agentes.
- **Contexto autorizado**: a interface consulta novamente proposta + execução, ou ocorrência, no backend. IDs contidos no aviso não são tratados como autorização. Abrir o contexto não marca o aviso como lido nem resolve a ocorrência/proposta.
- **Central de Agentes em `/agents`**, com entrada no menu lateral: agentes/configurações, últimas execuções, ocorrências, recomendações, análises e histórico de atividades. Todos usam APIs reais e paginação.
- **Preferências reais**: habilitar agente, permitir análises automáticas, configurar intervalo de 15 a 1440 minutos e autorizar avisos sobre novas recomendações. Nenhum controle simula uma função ausente.
- **Propostas com evidências**, registros envolvidos, sugestão, consequência esperada descrita sem prometer resultados e situação atual. Aprovação/rejeição exigem motivo e versão. Não existe botão de execução operacional.
- **Falhas e repetição segura**: envios sem confirmação podem ser consultados com o mesmo evento; a interface não gera outra operação automaticamente. Erros do assistente ficam no próprio módulo, sem transformar falha opcional do chat em alerta de consulta da tela operacional.
- **Sessão**: mudança de usuário/token, logout e expiração desmontam o estado do assistente e interrompem suas consultas. Conversas, contextos e rascunhos não atravessam sessões.

## Interação e acessibilidade

Painel lateral no desktop, com redução do espaço da página para não cobrir seus campos. No tablet/celular, painel recolhível de altura limitada, sem backdrop, bloqueio de rolagem ou captura modal do teclado. A página recebe espaço inferior para permitir rolar os formulários acima do painel. O usuário pode minimizar o assistente a qualquer momento.

Botões de abertura, minimizar e fechar têm nomes acessíveis. Escape recolhe a conversa; o foco retorna ao controle de origem ou ao botão flutuante. Campos têm rótulos, mensagens usam região de log com anúncio educado e carregamento/erros têm estados acessíveis. Links são restritos a caminhos internos conhecidos; textos são renderizados pelo React, sem `dangerouslySetInnerHTML`.

Capturas com dados descartáveis de QA:

- `docs/agents-v1-evidence/desktop.png`: 1440 × 1000.
- `docs/agents-v1-evidence/mobile.png`: 390 × 844.

## Ajustes necessários no backend

A etapa 1 vinculava habilitação à execução automática e emitia avisos de propostas sem preferência própria. Para os controles desta interface terem efeito real, foram acrescentados:

1. `AgentConfig.automationsEnabled` e `AgentConfig.notificationsEnabled`.
2. Validação, auditoria, versionamento e idempotência desses campos no endpoint de configuração existente.
3. O worker ignora configurações com automação desligada; consultas manuais continuam disponíveis se o agente estiver habilitado.
4. Novas propostas continuam registradas quando avisos estão desligados, mas não geram InboxNotification. Avisos anteriores não são apagados. Reativar avisos não reenvia propostas já existentes.
5. `GET /agents/occurrences/:id`, autenticado e isolado por cooperativa, para abrir contexto exato sem depender de uma página de listagem.

Migração incremental: **`20261104030000_agents_ui_preferences`**. Adiciona duas colunas booleanas a AgentConfig, sem apagar dados. Os defaults `true` mantêm o comportamento anterior de configurações existentes; o agente continua desabilitado por padrão e o módulo global continua opt-in. Foi verificado que habilitação, intervalo e versão de uma configuração anterior são preservados.

Não houve mudança operacional em rotas, coletas, estoque ou pesos. A única nova API é a leitura do contexto de ocorrência; as demais funções usam os endpoints da etapa 1. O corpo de PATCH `/agents/:agent/config` passa a aceitar:

```json
{
  "enabled": true,
  "automationsEnabled": false,
  "notificationsEnabled": true,
  "intervalMinutes": 60,
  "expectedVersion": 1,
  "eventId": "preferencias_web_001"
}
```

Nenhuma migração foi executada na VPS.

## Arquivos criados e modificados

Painel — criados:

- `frontend/src/components/agents/AgentChat.jsx`: janela, histórico, comandos e estados da conversa.
- `frontend/src/components/agents/AgentsProvider.jsx`: estado compartilhado, sessão, contexto e repetição segura.
- `frontend/src/components/agents/AnalysisResult.jsx`: apresentação dos resultados reais.
- `frontend/src/components/agents/ProposalCard.jsx`: evidências e decisão humana sem execução.
- `frontend/src/components/agents/agentsContext.js`: contexto e hook de acesso.
- `frontend/src/components/agents/agentsFormat.js`: traduções, datas, links permitidos e deduplicação de listas.
- `frontend/src/components/agents/agents.css`: layout responsivo e foco acessível, limitado ao módulo.
- `frontend/src/pages/agents/AgentsCenter.jsx`: Central de Agentes e suas consultas/configurações.
- `frontend/src/services/agentsService.js`: cliente das APIs e eventos do módulo.
- `tests/agents/browser.mjs`: validação da interface com API local real.
- Este relatório, `docs/agents-v1-etapa-2-validacao.json` e as duas capturas em `docs/agents-v1-evidence/`.

Painel — modificados:

- `frontend/src/layouts/AdminLayout.jsx`: ciclo de vida do assistente na sessão administrativa.
- `frontend/src/components/Sidebar.jsx`: entrada da Central para cooperativa.
- `frontend/src/routes/index.jsx`: rota `/agents`.
- `frontend/src/pages/Notifications.jsx`: ação contextual, preservando leitura e links existentes.
- `frontend/src/services/apiClient.js`: opção interna de suprimir o aviso global de leitura; o módulo de agentes mostra seus próprios erros. O comportamento padrão das demais consultas é preservado.

Backend — modificados:

- `server/prisma/schema.prisma` e nova migração de preferências.
- `server/src/modules/agents/agents.config.ts`, `agents.schemas.ts`: preferências reais e versionadas.
- `server/src/modules/agents/agents.triggers.ts`, `agents.execution.ts`: respeitar opção de automação e aviso.
- `server/src/modules/agents/agents.proposals.ts`: emitir aviso somente quando autorizado.
- `server/src/modules/agents/agents.routes.ts`: leitura de contexto de ocorrência.
- `server/tests/agents/run.mjs`, `integration.ts`: preservação da configuração anterior, novos cenários e suporte à execução integrada da interface.
- `docs/agents-v1-etapa-2-integracao.md`: resumo dos ajustes de integração.

`InboxBell.jsx` e `inboxService.js` não foram substituídos nem modificados. Não há novo sistema de notificações.

## Testes executados e resultados

| Verificação | Resultado |
|---|---|
| Cenários do backend, JWT/RBAC, duas cooperativas, comandos, propostas e preferências | 66 aprovados, zero falhas |
| Interface com Chromium e APIs reais em banco descartável | 25 aprovados, zero falhas |
| Migrações incrementais sobre schema anterior e configuração existente | Aprovadas; dados anteriores preservados |
| TypeScript do backend | Aprovado |
| Build do backend | Aprovado |
| Build Vite do painel | Aprovado |
| ESLint nos arquivos desta entrega | Zero erros; um aviso anterior em Sidebar |
| ESLint completo do frontend | Cinco erros e oito avisos anteriores; detalhados abaixo |
| Erros JavaScript na interface principal nos percursos executados | Nenhum |
| Verificação de whitespace no diff | Aprovada |

Os 25 cenários de navegador incluem: catálogo real, teclado/foco, navegação com chat aberto, formulário de veículo editável, comando desconhecido, persistência após recarga, identificação dos agentes, contexto pelo sino sem leitura automática, ausência de avisos duplicados, perda de resposta com reutilização do evento (inclusive após atualizar histórico), indisponibilidade/recuperação, desktop/tablet/celular, preferências reais, análise manual, ocorrências, decisão humana sem alterar rota, históricos, outra cooperativa, perfil municipal, logout e expiração.

O ambiente foi Chromium com dimensões 1440 × 1000, 820 × 1180 e 390 × 844, build Vite real, Fastify/JWT/Prisma reais e PGlite descartável via socket local. Interrupções de conexão e respostas 401/503 foram injetadas no transporte para testar falhas; as informações operacionais vieram das APIs. Nenhum acesso de escrita ocorreu em produção.

A trilha máquina-legível está em `docs/agents-v1-etapa-2-validacao.json`. Reexecuções substituem a evidência anterior; não aumentam a quantidade de testes reportada.

### Situação do lint completo

Os cinco erros já existem na `main`, conferidos também no conteúdo original desses arquivos:

- `BarChart.jsx`: três variáveis/parâmetros sem uso (`error`, `loading`, `w`).
- `WasteCollectionChart.jsx`: duas variáveis sem uso (`loading`, `error`).

Há oito avisos anteriores de hooks/Fast Refresh, incluindo o de Sidebar. Esses componentes de gráficos não foram alterados nesta etapa. Portanto, o lint dos arquivos novos não adicionou erros, mas **o lint completo do projeto ainda não está aprovado**.

## Reprodução local

Após instalar as dependências já existentes, gerar o Prisma Client e preparar as ferramentas locais com PGlite/socket e Playwright/Chromium, execute o build do painel e:

```bash
AGENTS_UI=1 \
KATUA_AGENTS_UI_RUNNER=/caminho/painel/tests/agents/browser.mjs \
KATUA_PANEL_DIST=/caminho/painel/frontend/dist \
KATUA_VALIDATION_TOOLS=/caminho/ferramentas \
node server/tests/agents/run.mjs
```

Execute o comando a partir da raiz do projeto do backend. O runner cria o banco descartável em `127.0.0.1:54329`, a API em `127.0.0.1:3339` e a página estática em `127.0.0.1:5181`. O navegador de validação deve estar disponível em `/tmp/katua-pev-browser`. Dependências de teste permanecem externas aos projetos; não foi adicionada biblioteca à aplicação.

## Limitações e próxima validação

- Sem teste em aparelho físico Android/iPhone, leitores de tela reais ou teclado virtual de cada navegador. Foram verificados estrutura acessível, foco, teclado e dimensões de tela no Chromium.
- Sem teste de carga na VPS ou em PostgreSQL nativo multiprocesso. Os limites conservadores da etapa 1 continuam ativos.
- O pacote JavaScript principal do painel continua grande (aproximadamente 2,55 MB antes de gzip); o build mantém o aviso de divisão de código, já existente. Esta entrega não é uma otimização geral do bundle.
- A migração nova e o frontend devem ser homologados juntos antes da futura ativação. O frontend sozinho não cria APIs nem altera a configuração global do servidor.
- O histórico persiste no servidor; rascunho e tentativa ainda não confirmada ficam em memória durante a sessão. Após recarregar/logout, deve-se consultar o histórico antes de repetir uma análise cujo resultado era incerto.
- Recomendações representam um retrato da análise. Aprovação/rejeição não executam a operação e não confirmam automaticamente que o problema foi resolvido.
- Permanecem pendentes o lint global anterior e as definições de retenção dos históricos já registradas na etapa 1.
- Etapa 3, push, merge e deploy não foram iniciados.

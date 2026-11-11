# Analytics de participação — painel funcional

Implementação em 11/11/2026 da primeira versão descrita em `02-interface-participacao-atendimento.md`.

Nova entrada **Analytics**, logo após **Configurações do Sistema**, abre `/analytics/participation`. Disponível ao perfil cooperativa. Os relatórios existentes continuam em suas rotas.

## Experiência

- Filtros de período, PF/pequeno/grande gerador, município/UF e bairro. Atalhos 7/30/60 dias; evolução semanal ou mensal; aplicação explícita dos filtros.
- Cinco indicadores: ativos, primeira participação registrada, recorrentes, participações confirmadas e solicitações abertas criadas no período.
- Evolução por semana/mês, valores acessíveis em texto e barras por bairro do cadastro atual. Semanas/mês nas extremidades podem estar parciais. Pessoas repetidas em semanas diferentes não equivalem a pessoas únicas no período.
- Cobertura separa geradores, PF, PEV, entregadores avulsos, origem não identificada e vínculos a conferir.
- Lista paginada, busca por nome apenas na lista e detalhe com janelas de participação, recência, regularidade e histórico da cooperativa.
- Qualidade expansível com contagens/bases e escopo. Registro incompleto, erro, vazio e dia atual parcial recebem mensagens próprias.

Consultas anteriores são canceladas quando os filtros mudam. Erros não mantêm números antigos como se fossem válidos para a nova seleção. Os totais vêm da API, sem derivar o resumo da página de participantes.

## Validação e implantação

Build Vite, ESLint dos módulos novos e teste Playwright em computador e celular. `frontend/tests/participation/visual.mjs` usa o build local e a fixture sintética gerada pelo teste de integração da API. Testa posição do menu, filtros, detalhe, busca, ausência de transbordamento no celular, vazio, erro e acesso somente de leitura. `KATUA_VALIDATION_TOOLS` aponta para ferramentas externas Playwright/Chromium; `KATUA_ANALYTICS_FIXTURE` aponta para a fixture.

Atualizar primeiro a API em `/var/www/katua/app/server`, depois compilar este painel em `/var/www/katua/frontend/frontend` com `VITE_API_BASE_URL=https://vps.katua.com.br`. Sem migração, variável obrigatória nova ou atualização do aplicativo Expo nesta entrega.

Os números exibidos em produção virão dos registros reais da cooperativa. As validações locais não medem a completude da base da VPS. Recursos de previsão, interação digital e cobertura histórica de serviço permanecem para etapas posteriores.

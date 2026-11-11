# Analytics — especificação da primeira tela

Data: 11/11/2026. Estado: especificação de interface; navegação, página e chamadas abaixo ainda não foram implementadas.

Contrato canônico: repositório KatuApp, `docs/analytics/01-levantamento-e-dicionario.md`, definição `participation-v1`.

## 1. Entrada e responsabilidade

- Novo item **Analytics**, logo abaixo do grupo **Configurações do Sistema**, como item próprio, não um subitem da configuração.
- Rota proposta: `/analytics/participation`.
- Título: **Participação e atendimento**.
- Explicação: “Acompanhe a participação de pessoas físicas e geradores e a situação das demandas de coleta.”
- Acesso inicial: cooperativa autenticada e ativa, com escopo imposto pela API.
- Manter os relatórios atuais e `/analytics-dashboard`. A visão existente de relatórios operacionais não é o novo Analytics de participação.
- Sem colocar novos botões ou indicadores na tela inicial do catador.

Pontos de integração verificados em `main` (`657636083a26a3e192424fdf65b46010a20f99d7`): `frontend/src/components/Sidebar.jsx`, `frontend/src/routes/index.jsx` e `frontend/src/pages/reports/AnalyticsDashboard.jsx`. Os arquivos locais possuem conteúdo idêntico a esses arquivos remotos na data do levantamento.

## 2. Organização visual

A página terá uma sequência vertical, com filtro único e sem várias telas concorrentes:

1. Título, explicação da população e horário da atualização.
2. Filtros e ações de aplicar/limpar.
3. Resumo da participação, com contexto de cobertura.
4. Evolução temporal e distribuição por bairro.
5. Lista de acompanhamento, com detalhes por origem.
6. Qualidade e limitações dos registros em área expansível.

Na tela larga, os gráficos podem aparecer lado a lado. Em celular, filtros, resumo e gráficos ficam empilhados. As mesmas definições e totais devem valer em todas as larguras. O conteúdo principal não dependerá de abrir um gráfico para descobrir uma ressalva de cobertura.

## 3. Filtros

| Campo | Comportamento |
| --- | --- |
| Período | Início/fim e atalhos 7, 30 e 60 dias. Padrão últimos 30 dias, com dia atual identificado como parcial. |
| Perfil | Todos da população v1, pessoa física, pequeno gerador, grande gerador. |
| Local | Município/UF quando necessários e bairro; incluir “Bairro não informado”. Não agrupar bairros homônimos de cidades diferentes. |
| Busca da lista | Nome de exibição autorizado, sem buscar ou exibir CPF e telefone no resumo. |

Aplicar filtros de forma explícita; manter uma única seleção para os blocos associados. Informar quais filtros afetam cada gráfico. O quadro de pontos PEV, se adicionado depois, terá população claramente diferente da lista de moradores/geradores.

O bairro disponível inicialmente vem do cadastro atual. Mostrar essa informação perto do filtro. Não sugerir que PF sem bairro deixou de participar nem resolver endereço livre por heurística no navegador.

O período filtra participações por recebimento e demandas por criação. Essa diferença precisa ficar no texto de ajuda, sem um seletor técnico de várias bases de data nesta primeira página.

## 4. Resumo

Cinco indicadores principais:

| Indicador | Texto de ajuda |
| --- | --- |
| Participantes ativos | Cadastros PF/geradores identificados com recebimento confirmado no período. |
| Primeira participação registrada | Ativos cuja primeira participação no histórico disponível ocorreu no período. |
| Já participavam | Ativos com participação anterior ao período. Complementa o indicador anterior. |
| Participações confirmadas | Operações atribuídas à população PF/geradores, sem duplicar materiais ou documentos. |
| Solicitações abertas | Situação atual das demandas criadas no período, ainda sem recebimento confirmado. |

Logo abaixo, mostrar a cobertura: recebimentos totais, operações atribuíveis à população v1 e operações de outras origens/sem atribuição suficiente. Esses totais são fornecidos pela API, sem recalcular a identidade no frontend.

PEV, entregador local e origem anônima não viram automaticamente moradores/geradores. Não chamar todos os recebimentos de participações individuais.

Comparações com período anterior somente quando a API declarar base comparável. Base zero: “Sem base de comparação”. Falta de dados: “Não disponível”, com motivo. Não exibir percentuais fictícios nem substituir erro por zero.

## 5. Gráficos

### Evolução da participação

- Série de operações confirmadas e série de participantes ativos, com legenda e eixos claros.
- Agrupamento por semana ou mês. Definir início de semana em segunda-feira e sinalizar semanas parciais.
- Mesmo participante em semanas distintas pode contar em cada semana; a soma semanal de pessoas não equivale a pessoas únicas no período.
- Tooltip mostra intervalo, número de operações, número de origens identificadas e cobertura quando pertinente.
- Não interpolar ou preencher como zero um período que a API classificou como sem cobertura.

### Participação por bairro

- Barras horizontais com operações e/ou origens identificadas, alternáveis e claramente nomeadas.
- Exibir os números absolutos e a informação de bairro do cadastro atual.
- “Bairro não informado” permanece acessível e contabilizado.
- Não usar rótulos “maior adesão da população” ou “bairro menos engajado” sem denominador territorial e disponibilidade do serviço.
- Gráfico de pizza não é necessário para essa comparação; barras permitem comparar bairros e rótulos com mais clareza.

## 6. Lista e detalhe

Colunas propostas: nome de exibição, perfil, município/bairro, participações no período, última participação registrada, dias desde a última e demandas abertas criadas no período. Detalhe abre um painel lateral ou seção expansível com histórico restrito à cooperativa.

Ordenação inicial por última participação, sem pontuação de engajamento. Paginação no servidor. Totais do resumo vêm do conjunto filtrado completo, não da página exibida.

No detalhe:

- Participações em 7/30/60 dias, como janelas independentes.
- Linha do tempo de solicitações e recebimentos vinculados; eventos de uma mesma operação agrupados.
- Intervalo típico e variabilidade apenas quando houver amostra suficiente.
- Texto sobre cobertura da identificação e quantidade de datas usadas.
- Sem histórico: “Sem participação registrada”. Com amostra pequena: “Histórico insuficiente para avaliar regularidade”.

Não exibir sinal vermelho de abandono ou criar bloqueio por dias sem participação. Nesta versão, não enviar mensagens automáticas nem criar tarefas em nome do gestor.

## 7. Qualidade e limites

Área expansível **Qualidade dos registros**, com contadores agregados e explicação:

- Recebimentos sem data válida, separados do período por não ser possível datá-los.
- Recebimentos sem origem atribuível à população v1.
- Operações com relações conflitantes.
- Registros sem bairro estruturado.
- Recebimentos sem quantidade registrada/pesagem pendente e pesos legados sem classificação.
- Demandas com situação divergente da coleta vinculada.

Cada contador informa o seu denominador e se considera o período selecionado ou todo o histórico disponível. Não apresentar uma única porcentagem de “qualidade geral” baseada em pesos arbitrários.

Legenda permanente de período histórico: “Visão atual dos registros pelas datas de recebimento. Correções e recebimentos retroativos podem atualizar os números.”

## 8. Estados da interface

| Estado | Apresentação |
| --- | --- |
| Carregando | Indicador de carregamento sem dados numéricos provisórios que pareçam reais. |
| Sem operações no período | Mensagem e opção de ampliar o período; zeros apenas após consulta válida. |
| Existem recebimentos, mas não há identidade suficiente | Mostrar cobertura e explicar por que o número de participantes não está disponível. |
| Falha na API | Mensagem com tentar novamente, sem conservar números antigos como se fossem do filtro novo. |
| Consulta anterior termina após mudança de filtro | Descartar resposta antiga usando cancelamento/identificador de requisição. |
| Sem permissão | Não renderizar dados; respeitar retorno de autorização da API. |
| Dados parciais ou recurso não instrumentado | Exibir limitação e motivo; ocultar interpretação indevida, não inventar registros. |

Filtros com labels associados, interação por teclado, resumo acessível dos gráficos e contraste adequado. Um único horário de atualização deve corresponder à mesma consulta/referência dos indicadores.

## 9. Integração planejada

Usar as chamadas propostas no dicionário de backend sob `/analytics/participation`. Não reutilizar diretamente `/reports/overview`, porque a semântica de execução e a seleção de origens são diferentes.

Receber da API as métricas, definições, cobertura, população, filtros aplicados, período efetivo e `readMode`. Não inferir idade da participação de `updatedAt`, da posição na lista ou do estado atual de uma notificação.

Arquivo de página sugerido: `frontend/src/pages/analytics/ParticipationAnalytics.jsx`; cliente de API e componentes conforme os padrões já existentes no painel. Esses arquivos ainda não foram criados.

Primeira versão sem exportação detalhada de dados pessoais, previsão, histórico de login ou alterações nos formulários de endereço. Acrescentar funções após necessidade e qualidade verificadas.

## 10. Critérios de aceite para a implementação

1. Analytics aparece após Configurações do Sistema e os relatórios anteriores continuam acessíveis.
2. Contagem única por operação e nenhuma troca entre autor do registro, origem e executor da coleta.
3. Primeira participação considera o histórico da cooperativa além da janela e dos filtros geográficos visíveis.
4. Soma “primeira registrada + já participavam” corresponde a ativos quando ambos os cálculos estão disponíveis.
5. Totais não dependem da página da tabela; filtro e respostas atrasadas não misturam conjuntos.
6. Registros incompletos e pessoas sem histórico recebem explicação, sem pontuação inventada.
7. Informações de outra cooperativa permanecem inacessíveis, inclusive por URL de detalhe.
8. Dia atual, semanas parciais, bairros do cadastro atual e status atuais das solicitações ficam identificados.
9. A página funciona em desktop e celular, com leitura por teclado e mensagens claras.
10. Validação dos números usa os casos do dicionário e dados agregados reais autorizados antes de alegar cobertura de produção.

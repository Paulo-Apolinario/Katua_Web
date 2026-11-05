# Planejamento de rotas por bairro

Atualização de 05/11/2026, restrita ao painel web.

## Uso e regras

Em criar/editar rota ou no formulário de rota fixa, a seção de pontos contém **Adicionar geradores por bairro**. O seletor reúne bairros dos geradores da cooperativa, normalizando acentos, caixa e espaços. Municípios e UFs diferentes permanecem separados. As rotas comuns, fixas e por área usam o mesmo editor.

Selecionar um bairro apresenta a prévia. O botão adiciona todos os geradores válidos ao planejamento; é possível repetir para outros bairros. A gravação efetiva continua ocorrendo somente ao salvar a rota.

A prévia informa novos geradores, cadastros já presentes e cadastros incompletos. Os incompletos ficam listados para revisão de nome, endereço ou coordenadas e não são adicionados em lote. Utiliza-se a localização já cadastrada, sem inventar coordenadas. Confira mapa e sequência antes de salvar.

Não duplica geradores já planejados ou vinculados a coletas selecionadas. Na direção inversa, uma coleta cuja origem foi incluída como novo ponto fica desabilitada na lista de disponíveis. Operações existentes distintas no mesmo endereço continuam identificadas separadamente. Esta deduplicação se refere ao planejamento atual, não à existência de solicitações em outras datas ou rotas.

Respeita os limites existentes de 100 novos pontos e a capacidade restante de 200 visitas da execução comum. Se o lote não cabe, nada é adicionado parcialmente: o painel orienta dividir a rota. A otimização rodoviária mantém seu limite existente de 60 pontos por cálculo.

Nas rotas fixas, a seleção retrata os cadastros naquele momento. Geradores cadastrados futuramente no mesmo bairro não entram automaticamente: edite a rota para incluí-los. As regras atuais de dias específicos, equipe, recorrência e atualização de execuções continuam vigentes.

## Interface e compatibilidade

- Catadores em cartões com checkbox acima do seletor de equipe.
- Duração estimada e editores de saída/destino final retirados dos formulários comuns e fixos; horário de saída prevista preservado.
- Os dados existentes de duração e origem/destino são preservados. Novos planejamentos mantêm sede e estimativa padrão já utilizadas pelo backend (240 minutos), inclusive nas verificações de conflito de agenda. Não houve redefinição do cálculo de conflitos.
- Coletas disponíveis com controles uniformes, contagem e botão de limpar filtros.
- PEVs/geradores com nome, endereço, contagem e indicação de cadastro já incluído, sem o antigo corte silencioso de 20 resultados.
- Busca individual normaliza acentos e caixa; endereço avulso e recarga de cadastros preservados.

Nenhuma alteração no backend, Prisma ou banco. Reutiliza `/route-planning/sources`, `/routes` e `/route-plans`. A API já filtra as fontes pela cooperativa autenticada e fornece bairro, município, UF e coordenadas; a validação de pertencimento permanece no servidor.

## Validação

- Build Vite aprovado. Permanecem os avisos anteriores de tamanho do bundle e importação mista de `internalDocumentPdf.js`.
- ESLint dos quatro arquivos JS/JSX alterados aprovado.
- 9 testes automatizados de regras aprovados: agrupamento, municípios/UF, nomes semelhantes, vínculos, deduplicação, fontes distintas, cadastros inválidos, coordenadas zero, limite e lista vazia.
- 10 testes de navegador aprovados no build local, com APIs simuladas: prévia, lote, deduplicação nos dois sentidos, payload comum, filtros, PEV, endereço avulso, payload recorrente, rota por área e mobile sem transbordamento.
- 10 testes de regressão dos filtros de bairro e histórico de geradores aprovados.

Os testes de interface verificam requisições e payloads locais; não comprovam integração contra o banco de produção. Nenhuma gravação em produção, operação na VPS ou deploy foi realizada.

Reprodução na raiz do repositório: `node --test tests/routes/neighborhoods.test.mjs`.

Para testes de navegador, informar `KATUA_PANEL_DIST` (build do frontend), `KATUA_VALIDATION_TOOLS` (diretório com Playwright instalado) e disponibilizar Chromium em `/tmp/katua-pev-browser`. Executar `node tests/routes/neighborhoods.browser.mjs`. O servidor abre somente `127.0.0.1:5184`; todas as chamadas de API são interceptadas.

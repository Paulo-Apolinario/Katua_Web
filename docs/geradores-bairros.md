# Geradores — bairros e seleção de histórico

Atualização de 04/11/2026, somente no painel React. Sem alterações no servidor, banco, App ou VPS.

## Comportamento

- Listar Geradores: novo campo Bairro do gerador, com sugestões dos bairros preenchidos nos cadastros da cooperativa. Combina com classificação e busca geral. A localização mostra bairro e cidade/UF; a busca geral também encontra bairros.
- Histórico de coletas de Geradores: filtro de bairro também limita as coletas aos geradores selecionados que correspondem ao bairro informado. O filtro fica no parâmetro bairro da URL e sobrevive ao recarregamento.
- Pesquisa por nomes completos ou parciais, sem distinguir acentos, maiúsculas e espaços extras. Sugestões repetidas por essas diferenças são reunidas; não há gravação ou correção automática nos cadastros.
- Sem filtro, cadastros sem bairro continuam disponíveis e mostram Bairro não informado. Eles não recebem um bairro inventado.
- Seletor em cartões com nome, bairro, cidade e checkbox. Selecionar resultados adiciona os cadastros visíveis sem apagar seleções anteriores. Limpar seleção remove apenas os identificadores selecionados e mantém bairro e demais filtros.
- Selecionados fora do bairro ficam preservados, mas não entram nas coletas exibidas enquanto o filtro estiver aplicado. Aviso e etiqueta Fora do bairro identificam a situação. Limpar bairro devolve esses cadastros ao histórico.
- Pesquisa por nome limita o seletor; não remove silenciosamente os cadastros já selecionados. Etiquetas permitem remover individualmente cada seleção.
- Filtros de período/status, detalhes e downloads por coleta mantidos. A seleção compartilhada dos históricos de catador, motorista e veículo permanece disponível; filtro de bairro somente para geradores.

A API existente já retorna o campo neighborhood e todos os geradores da cooperativa autenticada. O filtro utiliza esses registros em memória, sem novos endpoints, requisições a serviços de endereço, dependências ou migrações. A tabela e os PDFs permanecem nos fluxos atuais.

## Validação

Build Vite aprovado; ESLint dos componentes e utilitário alterados sem erros; git diff --check aprovado. Dez cenários Chromium aprovados com build real e respostas de API simuladas localmente (não são testes em produção): bairro/acento/maiúsculas, classificação combinada, cartões, filtro do histórico, preservação e recarregamento da seleção, seleção em lote, bairro inexistente, limpeza, regressão dos históricos de motorista e participantes catadores, adaptação ao celular e ausência de chamadas de gravação/erros JavaScript.

Runner: tests/generators/neighborhoods.browser.mjs. Evidência: geradores-bairros-validacao.json. Execução com KATUA_PANEL_DIST apontando para frontend/dist e KATUA_VALIDATION_TOOLS para o diretório externo de Playwright. Nenhum dado de produção foi acessado ou alterado.

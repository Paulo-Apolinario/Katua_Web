# Central de documentos e identificação das saídas de lotes

Em **Ordens de Serviço**, o atalho **Destinação de lotes** consulta diretamente os comprovantes de saída do estoque, incluindo documentos sem O.S. de coleta vinculada. Não é necessário abrir as ordens uma a uma para localizar o consolidado.

Cada cartão identifica tipo e categoria, consolidado quando aplicável, material e quantidade na unidade original, destinatário, data/hora da saída, códigos dos lotes, emissão e O.S. de origem. Visualização e PDF permanecem disponíveis. Os documentos da programação e da coleta continuam na aba Todos os documentos e nos detalhes da O.S.

A lista de ordens mostra quais têm saída do estoque e quantos consolidados possuem, com ação **Ver saídas** já filtrada pela O.S. A data de criação aparece separada da programação. A busca aceita material, destinatário, lote, número/referência e O.S., com filtros de categoria, tipo e período de emissão. Limpar busca na categoria de lotes mantém essa categoria selecionada.

Após confirmar uma saída em Estoque e Lotes, **Ver na central de documentos** abre a busca pelo número exato do comprovante gerado. Lotes de várias coletas podem compor um único comprovante consolidado; os vínculos de origem permanecem visíveis.

Validação: build Vite, ESLint e oito cenários de navegador com dados sintéticos: identificação na O.S., filtro direto por ordem, saídas sem O.S., busca de lote, prévia/PDF, limpeza e tipo, programação/download da O.S. e responsividade. Nenhuma operação de produção foi realizada.

Requer o backend atualizado antes do painel. Sem migrações. Preservar o build anterior para rollback; documentos e saldos existentes não são alterados.

Consolidados vinculados a várias O.S. exibem “Compartilhado entre N O.S.” e “Total da saída”. O documento por lote exibe “Saída deste lote”. É o mesmo documento consolidado referenciado por suas origens, sem somar ou emitir novamente a baixa. Nomes históricos são identificados como “Origem registrada na emissão”; a interface não substitui o conteúdo preservado do comprovante pelo cadastro atual.

## Uma entrada por destinação

A visão principal agrupa o consolidado e os comprovantes por lote em uma única entrada. **Expandir lotes (N)** consulta os detalhes sob demanda e mostra a tabela com todos os lotes, quantidades retiradas, saldo anterior/restante e os botões **Visualizar lote** / **Baixar PDF do lote**. **Recolher lotes** volta à visão compacta; reabrir o mesmo item reutiliza os detalhes já consultados. Uma falha na consulta oferece nova tentativa e mantém o consolidado visível.

A contagem e paginação são de destinações agrupadas. Saídas avulsas sem consolidado não desaparecem. A seleção explícita do tipo individual permite consultar esses comprovantes isoladamente. Os detalhes da O.S. também usam a visualização agrupada.

Validação atual: 10 cenários de navegador, incluindo expansão/recolhimento sem nova requisição, PDFs individuais, falha/repetição da consulta e tabela com rolagem horizontal contida no celular. Atualizar backend antes do painel. Sem alterações nos arquivos emitidos ou saldos.

# Analytics: detalhar, comparar e exportar — 11/11/2026

## Navegação

O total e as cinco situações dos pedidos abrem listas paginadas, com busca e atalhos para solicitação/coleta. Os indicadores de qualidade também abrem seus registros, informando quando a análise cobre todo o histórico em vez do período. O retorno preserva os filtros. Erro/vazio/carregamento são explícitos e respostas antigas são canceladas.

As listas consultam a situação atual; seus horários de atualização podem diferir do resumo se alguém alterar uma operação entre as consultas. Diagnósticos de qualidade podem se sobrepor; as situações reconciliadas dos pedidos são categorias exclusivas.

A visão geral inclui comparação com intervalo anterior equivalente, valores absolutos, variação quando há base e aviso de período parcial. O cálculo descreve registros disponíveis, com escopos diferentes para recebimentos/participação e pedidos. Não sugere causa, completude ou comparação de jornada de trabalho.

## Abas

- Geradores: primeira participação, retorno, repetição e materiais registrados no detalhe do histórico.
- Bairros: seleção de material por catálogo/nome e unidade, intensidade por recebimentos e quantidade registrada na tabela. Materiais repetidos na mesma coleta não duplicam a operação.
- Uso: cobertura por perfil, contas sem medição, primeiro sinal disponível e observação dos clientes web/app. Sinal não comprova instalação/versão atualizada; ausência não comprova desuso.

## Resumo executivo

Botões PDF/Excel usam uma consulta agregada integral da API, sem depender da página ou de buscas locais. Os arquivos incluem cooperativa, período, filtros, emissão em horário de Fortaleza, comparação e base anterior, pedidos por situação, qualidade, bairros, materiais separados por unidade, cobertura do uso e método/limites. O material selecionado localmente no mapa não restringe o resumo geral; o alcance é informado no arquivo e na tela.

Excel usa oito planilhas com cabeçalhos, larguras e quebra de texto; PDF pagina tabelas e informa numeração. Não aciona impressão. Mudança dos filtros cancela a consulta de exportação e impede salvar um relatório de contexto anterior. Bibliotecas existentes são utilizadas; sem dependência nova.

## Validação e implantação

Build Vite/ESLint e Playwright: listas de pedidos/qualidade, retorno com filtros, comparação, filtro de óleo em litros, categorias vazias, falhas/retry, navegação em celular e downloads reais. A planilha é reaberta com ExcelJS; o PDF é verificado por extração de texto/renderização. Fixtures são sintéticas e vêm dos testes locais da API.

Atualizar API e painel nos diretórios existentes. Não há nova migração nesta etapa; manter `prisma:deploy` no comando garante que a migração de uso da etapa anterior já esteja aplicada. Aplicativo Expo e assistente não foram alterados nesta entrega; o assistente continua oculto.

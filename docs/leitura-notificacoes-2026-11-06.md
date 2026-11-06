# Leitura dos avisos da cooperativa

**Abrir atendimento** registra o aviso como lido antes de navegar ao destino; **Analisar com assistente** também registra leitura. A leitura persiste pela API existente, atualiza o contador/sino e, ao retornar à central, o aviso não exibe “Novo” nem “Marcar como lido”. O conteúdo continua no histórico. Leitura não significa resolução da ocorrência operacional.

A marcação manual individual/coletiva continua disponível para avisos não lidos. “Marcar todos como lidos” fica oculto quando não há pendências de leitura. Se a API falhar, o aviso permanece não lido e o erro é informado; não há confirmação falsa de leitura.

Avisos antigos que nunca tiveram leitura registrada podem ser marcados individualmente ou por “Marcar todos como lidos”, caso já tenham sido consultados. Não inferimos leitura ou conclusão de todas as operações a partir do estado atual da tela.

Validação: build Vite e ESLint; cinco cenários de navegador cobrindo aviso já lido, marcação individual e sino, abertura de atendimento e retorno, falha da API e marcação coletiva com histórico preservado. Inclui verificação de layout no celular. APIs simuladas e dados sintéticos; sem acesso à VPS.

Sem migração ou mudança no backend. Para disponibilizar, atualizar e construir o painel. Preservar o build anterior para rollback; trocar build não desfaz leituras já persistidas na API.

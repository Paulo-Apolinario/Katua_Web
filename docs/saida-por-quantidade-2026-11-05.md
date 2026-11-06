# Saída de estoque por quantidade e observações opcionais

Em **Estoque e Lotes → Estoque atual**, cada material possui **Destinar quantidade**. O formulário reúne quantidade/unidade, tipo de saída, destinatário, data/hora e dados opcionais de transporte. O gestor confere a tabela de lotes e saldos antes de confirmar. Uma alteração no formulário invalida a prévia.

O backend distribui a quantidade entre os lotes disponíveis mais antigos, sem utilizar reservas ou misturar unidades. Exemplo: total de 400 kg pode consumir 370 kg de um lote e 30 kg de outro com 60 kg, mantendo 30 kg no segundo lote. O PDF interno informa lotes, retiradas, saldos, destinatário, horário, responsável e protocolo. O registro também aparece na central de documentos e nas O.S. de origem vinculadas.

Em caso de resposta perdida, os controles ficam bloqueados e o protocolo é preservado na sessão. **Conferir protocolo / concluir tentativa** consulta o documento; se não localizado, repete a mesma operação, sem gerar um novo UUID. Uma rejeição definitiva por prévia alterada libera nova conferência. Atualizar o backend antes do painel.

No atendimento de O.C., as observações são opcionais para aceitar ou receber. A confirmação da conferência continua necessária. Recusa e pedido de complementação exigem motivo.

Validação: build Vite, ESLint dos arquivos alterados, seis cenários de navegador específicos (prévia, confirmação, invalidação, PDF, resposta perdida e recuperação, celular), além de 12 testes de regras e 10 de interface do fluxo de recebimento existente. Avisos conhecidos de chunk grande/importação mista do Vite permanecem sem impedir o build.

O documento é interno e não substitui emissão fiscal, ambiental ou de transporte. Sem mudança de esquema Prisma, sem deploy ou acesso à VPS. Antes do deploy manual, preservar builds e SHAs anteriores e verificar o backup habitual do banco. Reverter código não reverte baixas de estoque já confirmadas.

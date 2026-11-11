# Analytics — acompanhamento das solicitações

Entrega de 11/11/2026, dentro da aba Analytics existente, após a cobertura dos recebimentos.

O novo quadro **Atendimento das solicitações** apresenta pedidos de coleta, ordens extras e chamados de PEV em três cartões. Mostra volume criado no período, pendências atuais, vínculos entre fluxos e recebimentos quando aplicável. Não soma os cartões como atendimentos distintos.

Em **Ver situações e tempo de espera**, o gestor consulta a distribuição por situação, idade das pendências, pedido mais antigo e tempo mediano até recebimento com amostra válida. Registros retrospectivos, falta de datas e vínculos a conferir ficam explícitos. Os rótulos são em português; situações não reconhecidas solicitam conferência sem exibir código técnico em inglês.

Atalhos abrem as telas existentes de pedidos, ordens extras e PEVs/chamados. Eles não alteram registros nem aplicam automaticamente o período do Analytics às telas operacionais. As ações continuam seguindo seus fluxos normais.

## Escopo visível

- **Somente o período aplicado**, por criação, em toda a cooperativa. O texto deixa claro que perfil, município e bairro não afetam este quadro.
- Situação atual, com horário próprio de atualização e dia atual parcial. Não confundir o quadro com uma fotografia histórica ou toda a fila de pendências.
- Idade de pedido não significa atraso. Agendamentos futuros podem estar pendentes.
- Ordem aceita não comprova recebimento; chamado resolvido não comprova doação.
- Erro do novo endpoint não apaga os indicadores de participação. Retry e cancelamento evitam misturar respostas anteriores com um novo período.

## Verificação e implantação

Build Vite e ESLint dos componentes alterados. O teste visual existente foi ampliado para conferir três cartões, dados da fixture da API, rótulos/mediana, links, query limitada ao período, erro independente, recuperação, vazio e celular sem transbordamento.

Atualizar primeiro a API em `/var/www/katua/app/server` e depois compilar o painel em `/var/www/katua/frontend/frontend`, com o endereço de API já utilizado. Sem migração de banco, configuração nova ou atualização do Expo. Números e completude da VPS dependem dos registros reais após implantação.

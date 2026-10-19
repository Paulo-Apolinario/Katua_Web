# Gestão de Resíduos — decisões, validação e continuidade

Data: 19/10/2026. Autorização: aperfeiçoar todas as opções da aba Gestão de Resíduos. Bases main: Katua_Web eef0d7a e KatuApp 7825800. Nenhum deploy, acesso à VPS, edição de .env, migração ou operação em dados reais.

## Escopo confirmado

Seis opções: Resíduos Coletados, Gestão de Destinações, Visão do Estoque, Catálogo de Resíduos, Cadastrar Tipo de Resíduo e Adicionar Lote. Inclui detalhes da entrada e edição de catálogo/lote. Rotas existentes preservadas. API operacional é KatuApp/server; backend antigo do painel não é utilizado.

## Problemas e resultado

| Problema confirmado | Comportamento entregue |
| --- | --- |
| PATCH de catálogo normalizava payload completo; reativar enviava nome/categoria vazios e defaults | Atualização parcial preserva omitidos e envia somente campos informados. Reativar altera apenas status |
| Campos opcionais não podiam ser removidos | Limpeza explícita via null/valor vazio aceita na API para campos opcionais de catálogo/lote; formulários enviam a limpeza |
| defaultUnit/isActive divergiam de unit/status | Cadastro/atualização/inativação sincronizam os aliases usados nas integrações existentes |
| Resumo de entradas tratava envelope da resposta como summary e podia mostrar zero sem fonte | Totais de todas as entradas filtradas vêm de totalsByUnit e pagination; sem somar unidades diferentes ou usar só a página |
| Filtros ACTIVE/CANCELLED enviados pelo painel eram rejeitados pelo schema strict da API | API aceita status validado e aplica-o em listagem geral e por entrada |
| Histórico por entrada podia truncar acima de 100 registros e ocultar falha de consulta | Paginação real de histórico; falha de entrada/histórico explicitada, sem sucesso ou vazio fictício |
| Data final de filtro era meia-noite, excluindo quase todo o dia | Datas de formulário convertidas do calendário local; final vai até 23:59:59.999 local. ISO com horário explícito preservado |
| Disponibilidade de estoque podia incluir vendidos/descartados/cancelados | Visão separa disponível e reservado por unidade; estados encerrados continuam no histórico e não entram no disponível |
| availableQuantity de lote manual novo permanecia zero padrão | Novo lote manual inicializa saldo com a quantidade. Edição manual atualiza saldo só se estava intacto ou no padrão legado |
| Lote vinculado podia perder quantidade/unidade/código/origem em edição manual | Campos de origem preservados no painel e na API. Atualizações desses dados só são aceitas se mantêm o valor; lote cancelado somente consulta |
| Edição de destinação omitia campos vazios | Documento/observações removidos explicitamente quando o usuário os limpa; motivo do cancelamento usa cancelledReason real |
| Reserva não oferecia o campo de finalidade exigido pelo backend; rejeito/descarte não antecipavam motivo | Formulário mostra destino/finalidade da reserva e valida motivo de rejeito/descarte antes do envio |
| Duas destinações podiam ler o mesmo saldo antes de gravar | Create/update/cancel compartilham trava FOR UPDATE da entrada dentro da transação |
| Cancelar/mudar tipo de uma destinação podia atingir lote vendido com saldo nominal intacto | API rejeita lote vendido, descartado, cancelado ou com quantidade movimentada, preservando operação existente |
| Erros e modais sem padrão, inclusive sob menu lateral | Mensagem persistente, recarga/reconexão, foco/ESC/restauração, camada acima do menu e rolagem interna; CSS restrito ao módulo |

## Definições usadas

- Entrada representa material registrado em campo; não pressupõe recebimento físico nem estoque. Destinar não conclui automaticamente o ciclo da coleta.
- Saldo a destinar vem da entrada; estoque disponível vem dos lotes disponíveis. Reserva, venda e descarte são situações distintas. Alterar situação do lote não emite nota fiscal nem registra valor de venda.
- Unidades permanecem separadas. Disponível usa saldo controlado quando presente; lotes manuais antigos sem esse controle usam quantidade registrada, com aviso explícito. Não se converte litro/unidade/m³ para peso.
- Itens sem lotes aparecem como Sem lotes registrados. Erro/carregamento não vira zero nos cartões.
- Código/classificação/NCM são dados cadastrados, sem validação fiscal/ambiental externa. Apenas formato numérico do NCM é verificado; não há classificação automática ou presunção de enquadramento.
- A origem da coleta/entrada e os atores/documentos existentes permanecem consultáveis. Quantidade de destinação continua imutável na edição; correções de quantidade exigem o fluxo existente de cancelamento/nova destinação, respeitando movimentações do lote.
- Sem exclusão definitiva. Inativação afeta novas escolhas, mantendo referências. Lote cancelado permanece consultável.
- Novas consultas limpam dados antigos e ignoram respostas tardias. Componentes reiniciam por usuário autenticado. Não há confirmação offline ou gravação local das operações.

## Arquivos do painel

- frontend/src/pages/waste/{CollectedWasteList,WasteDestinationForm,WasteDestinationHistory}.jsx
- frontend/src/pages/waste-type/{WasteTypeList,AddWasteType,EditWasteType}.jsx
- frontend/src/pages/waste-stock/{WasteStockList,AddWasteStockLot,EditWasteStockLot}.jsx
- frontend/src/components/waste-workspace/WastePage.jsx
- frontend/src/components/waste-workspace/WasteInventory.jsx
- frontend/src/components/waste-workspace/WasteOperations.jsx
- frontend/src/components/waste-workspace/useWasteResource.js
- frontend/src/components/waste-workspace/useModalFocus.js
- frontend/src/components/waste-workspace/wasteWorkspace.css
- frontend/src/components/waste/WasteDestinationModal.jsx
- frontend/src/components/collections/WorkspaceParts.jsx (opções de tamanho de página)
- frontend/src/utils/wasteWorkspace.js
- frontend/src/services/{wasteTypeService,wasteStockService,collectionEntryService,collectionWasteDestinationService}.js
- frontend/tests/waste-workspace.test.mjs
- frontend/tests/waste-workspace-browser.mjs
- docs/gestao-residuos-2026-10-19.md
- docs/validacao-gestao-residuos-2026-10-19.json

As páginas são pontos de entrada pequenos para componentes compartilhados, evitando duplicar regras entre cadastro/edição e lista/detalhe. Nenhuma funcionalidade útil de destinação, cancelamento, catálogo ou lote foi removida. Filtros técnicos por IDs foram substituídos por pesquisa, seleção de catálogo e navegação contextual; filtros por identidade individual adicionais permanecem como evolução de usabilidade.

## Arquivos da API

- server/src/modules/waste-stock/waste-stock.schemas.ts
- server/src/modules/waste-stock/waste-stock.service.ts
- server/src/modules/collection-waste-destinations/collection-waste-destinations.schemas.ts
- server/src/modules/collection-waste-destinations/collection-waste-destinations.service.ts
- docs/gestao-residuos-2026-10-19.md

Sem mudança no schema.prisma. Não executar migrate deploy/db push por causa desta entrega. A tipagem redundante de update de destinação foi removida para respeitar stockItemId nullable; o check TypeScript passou integralmente.

## Validação executada

- ESLint dos arquivos de implementação sem avisos; Vite build passou. Mantém aviso preexistente de bundle grande.
- Backend: tsc --noEmit e build tsup passaram.
- 18 testes de contrato/regressão passaram: cinco novos grupos e 13 anteriores de coletas/MTR/rotas/veículos.
- Nove cenários Chromium com API Fastify/Prisma e PGlite descartável; contas de teste, sem credenciais ou dados reais. Fluxo feliz usa API real local, sem mocks.
- Criar/editar catálogo, inativar/reativar sem perda de nome/categoria/unidade, apagar descrição e recarregar; criar lote manual, editar/limpar local e recarregar.
- 23 entradas, paginação 20+3, totais kg/L de todas as páginas, filtro no fim do dia em America/Fortaleza.
- Destinação para estoque gera lote vinculado, altera saldo e não muda etapa COLLECTED da coleta; edição de quantidade de lote de origem rejeitada na API.
- Edição nullable de destinação; rejeição 409 simulada mantém motivo no modal; cancelamento real retorna saldo, conserva motivo/ator/data e cancela lote; recarga conserva histórico.
- Todos os seis tipos de destinação; 25 movimentações na mesma entrada, histórico paginado 20+5; lote vendido impede cancelamento.
- Unidade incompatível e quantidade acima do saldo rejeitadas sem gravação parcial. Duas solicitações simultâneas de 7 para saldo 10: uma criação, outra rejeição e saldo final 3.
- Estoque exclui vendidos/cancelados; desktop/celular revisados visualmente; modal acima do menu e foco contido.
- Offline/reconexão sem registros antigos ou sucesso falso. Outra cooperativa não lê/altera IDs nem destina entrada alheia; motorista tem POST negado e painel redireciona ao login.

A concorrência foi executada com PGlite, não PostgreSQL nativo. As travas são SQL PostgreSQL, mas interleavings e movimentações simultâneas de lotes exigem validação no banco nativo. Não houve observação em produção. Dados de fixture e tokens temporários não foram incluídos no GitHub.

## Backlog de continuidade

| Item | Prioridade | Estado / evidência |
| --- | --- | --- |
| Seis opções do menu e três telas auxiliares | P1 | validado localmente conforme cenários acima |
| PATCH, limpeza de campos, totais, filtro de situação e saldo por entrada | P1 | validado localmente |
| Publicação e teste com cadastro real | P1 | pendente de publicação; usuário executa na VPS |
| Concorrência PostgreSQL real (destinação x lote, carga prolongada) | P1 | a confirmar no ambiente adequado; PGlite não cobre todos os cenários |
| Histórico detalhado de vendas/saídas/ajustes de lote | P2 | confirmado: modelo tem situação/saldo, não substitui razão completa de movimentações ou financeiro; nova etapa de domínio |
| Totais legados da API usados por outros clientes | P2 | confirmado: campos totalQuantity/totalQuantityKg não têm a definição de disponível da nova visão; painel não usa esses campos como saldo disponível |
| Paginação e filtros de catálogo/estoque no servidor | P2 | confirmado: consulta atual retorna catálogo/lotes completos, paginação dessas visões é local |
| Mais filtros por gerador/equipe com seleção por nome | P2 | pendente de evolução; busca e links contextuais estão operacionais |
| Todos os perfis/admin, conta trocada durante request e ambientes móveis nativos | P2 | a confirmar; nesta etapa testados cooperativa, outra cooperativa e motorista no painel/API |
| Recebimento físico e conciliação de estoque legado | P1 | a confirmar com operação real; não pressupor que material coletado já foi recebido |

## Publicação pelo usuário e próximo passo

Atualizar API antes do painel, pois status/limpeza/proteções dependem dela. Sem migração de banco, sem alteração em .env e sem necessidade de exportar Expo nesta etapa.

API: na pasta /var/www/katua/app executar git pull origin main; depois em /var/www/katua/app/server executar npm run build; reiniciar katua-api.service e conferir active. Painel: na pasta /var/www/katua/frontend executar git pull origin main; depois em /var/www/katua/frontend/frontend executar npm run build. Se pull apresentar conflito, interromper e analisar, sem resetar alterações locais.

Após publicação, conferir catálogo/reativação, lote manual, entrada real, destinação parcial e histórico após recarga. Cancelamento de teste somente em operação apropriada. Depois priorizar concorrência nativa, recebimento físico e razão de movimentações de estoque. Demais pendências de rotas/frotas, SMTP e histórico de migrações permanecem fora desta entrega.

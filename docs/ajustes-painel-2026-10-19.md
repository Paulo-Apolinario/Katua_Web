# Ajustes de idioma e menu — 19/10/2026

Escopo solicitado: painel primeiro; API e App Web ficam para uma etapa posterior. Referência: main 6479eb1. Nenhuma mudança de backend, schema ou banco nesta entrega.

## Evidências e decisões

1. Imagem do login: Route POST:/auth/login-link not found. É uma resposta de rota HTTP ausente, não comprova falta de tabela ou função no banco. O endpoint e a migração AuthEmailToken já foram preparados no KatuApp, mas a versão/processo/proxy que respondeu na VPS não foi inspecionada nesta etapa. Conferência adiada conforme pedido do responsável; não executar migração apenas por essa mensagem.
2. Imagem de veículos: cabeçalho Actions e paginação Showing / Previous / Next vêm do componente DataTable compartilhado. Traduzidos para Ações, Exibindo … de …, Anterior e Próximo; estado vazio passa a Nenhum registro encontrado. Corrigido também o início da contagem vazia para 0, em vez de 1.
3. Imagem do menu: ocultado o grupo Zona & Área, incluindo Lista de Zonas e Criar Zona, pela retirada de seus links do Sidebar. Gestão de Rotas permanece. Zonas e rotas são entidades diferentes no código; ocultar a entrada é uma decisão de navegação, não uma fusão dos modelos. Os dados, telas, rotas por URL e endpoints de zonas não foram removidos. A busca do menu já não continha zonas.

## Arquivos alterados

- frontend/src/components/DataTable.jsx
- frontend/src/components/Sidebar.jsx
- docs/ajustes-painel-2026-10-19.md

## Verificações executadas

- npm run build: passou; permanece o aviso anterior de bundle grande.
- ESLint dos dois componentes: passou.
- Chromium desktop 1440x1100, Vite local e respostas de API simuladas: cabeçalho Ações; paginação de 11 registros (1–10, 11–11 e retorno); estado vazio com Exibindo 0 - 0 de 0; ausência de links de zonas; abertura de Gestão de Rotas, navegação à lista e recarga. Passou.
- Não foram escritos novos testes permanentes para essas alterações simples de apresentação. Não houve teste de permissões, persistência no banco ou concorrência: esses contratos não mudaram e a API foi simulada neste teste visual.
- Não houve deploy, alteração da VPS, migração ou validação da versão publicada por nós. O responsável relatou atualização do painel na VPS antes desta entrega; a mensagem HTTP ausente é evidência dessa tela, não inspeção do servidor.

## Backlog e continuidade

| Item | Prioridade | Estado | Próximo passo |
| --- | --- | --- | --- |
| Textos portugueses da tabela compartilhada | P1 | validado | Publicação pelo responsável |
| Ocultar Zona & Área no menu | P1 | validado | Publicação pelo responsável |
| Publicar estes ajustes do painel | P1 | pendente de publicação | Atualizar main e gerar build na VPS |
| POST /auth/login-link ausente no ambiente acessado | P1 | confirmado | Após testes do responsável, conferir API em execução, build e proxy; não atribuir ao schema sem evidência |
| Estado da migração AuthEmailToken na VPS | P1 | a confirmar | Consultar somente quando retomada a etapa da API |
| Demais textos do painel ainda em inglês | P2 | a confirmar | Revisar telas além do componente compartilhado em etapa própria |

Resumo de continuidade: dois componentes alterados; idioma compartilhado em português e menu de zonas oculto, preservando os caminhos e dados. Build, lint e navegação local aprovados. Próximo passo: responsável publicar o painel e continuar seus testes; só depois retomar API e App Web. Nenhum arquivo de ambiente foi alterado.

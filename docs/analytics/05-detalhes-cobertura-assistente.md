# Cobertura clicável e assistente oculto — 11/11/2026

Os seis cartões de **Cobertura dos recebimentos** abrem `/analytics/participation/coverage/:bucket`, inclusive quando a contagem é zero. A tela preserva período e seleção geográfica, informa o alcance de todos os perfis, oferece busca/paginação e permite abrir cada recebimento para consultar datas, materiais/unidades e protocolo extra quando disponível. Há atalho para a coleta em `/waste-list?coleta=...`.

Filtros do Analytics passam a ser guardados na URL. O retorno da cobertura restaura os filtros aplicados; avançar/voltar no navegador também acompanha essa seleção. Dados de cadastro atual, origem sem identidade e vínculos a conferir têm explicações próprias. Erro, carregamento e vazio não recebem valores demonstrativos. Consultas são canceladas ao mudar seleção, categoria ou página.

## Assistente

`frontend/src/config/features.js` centraliza `ASSISTANT_VISIBLE = false`. Essa chave oculta o chat flutuante, a entrada da Central de Agentes e os botões contextuais das notificações, mantendo o provider desabilitado na interface. A rota antiga `/agents` redireciona para Analytics. Para reativação futura, alterar a chave e recompilar o painel. Configurações, histórico, serviços e rotinas de backend dos agentes são preservados; esta entrega é uma ocultação da interface.

## Verificação e atualização

Build Vite, ESLint dos módulos novos/alterados e teste visual com fixture emitida pela API descartável: navegação pelos cartões, lista, detalhe, óleo em litros, retorno com filtros, categoria vazia, erro/retry, celular sem transbordamento e ausência dos acessos ao assistente. As chamadas do teste permanecem somente de leitura, sem solicitações aos serviços de agentes.

Atualizar primeiro a API e depois o painel, nos diretórios de deploy existentes. Sem migração de banco, dependência nova ou atualização Expo.

# Estoque: histórico separado de lotes cancelados

Data local: 26/10/2026 — Fortaleza/CE. Repositório: Katua_Web, branch main.

## Problema observado

As imagens mostram um lote vendido de 50 kg e três lotes cancelados da mesma coleta. Na análise do fluxo de destinação, mudar de Estoque para outro tipo anula o lote anterior, zera seu saldo controlado e guarda o motivo. Voltar para Estoque gera outro lote com rastreabilidade. Os cancelados já eram excluídos do saldo disponível, mas continuavam na lista expandida e no contador “Ver lotes (4)”.

A correção separa a visão operacional do histórico de anulações. Para o exemplo fornecido, a linha do material passa a ter **Ver lotes (1)** e **Ver histórico (3)**. Os registros originais não são apagados nem reaproveitados como se fossem o mesmo lote ativo.

## Entregue

- [x] Duas abas na Visão do Estoque: **Lotes válidos** e **Histórico de cancelamentos**, com contadores separados.
- [x] Lista, expansão, contador e CSV operacional excluem `CANCELLED`.
- [x] Materiais que possuem exclusivamente lotes cancelados ficam no histórico; cadastros novos sem lote continuam identificados como vazios.
- [x] Vendidos e descartados permanecem identificados entre os lotes válidos, sem compor saldo disponível. A mudança não interpreta “válido” como “disponível”.
- [x] Acesso ao histórico por material, com indicação da seleção e opção de consultar todos.
- [x] Histórico mostra apenas registros cancelados, motivos/observações e vínculos à coleta/entrada de origem.
- [x] Histórico não soma quantidades anuladas como saldo: os indicadores contam registros e vínculos, em vez de apresentar um total de peso dessas revisões.
- [x] Busca histórica também considera o motivo/observação e o identificador da coleta. Filtros de categoria, unidade, cadastro, processamento e origem são preservados.
- [x] Exportação histórica separada, com identificação de quantidade histórica anulada, motivo e última atualização; exportação operacional não inclui as anulações.
- [x] Consulta de lote cancelado com título próprio, campos bloqueados, sem botão de salvar e retorno ao histórico do respectivo material.
- [x] Aba e seleção do material permanecem na URL, inclusive após recarregar a página.
- [x] Catálogo, formulários de lotes válidos e permissões existentes preservados.

## Escopo técnico

Apenas o painel foi alterado. `filterInventory` recebe escopo explícito e identificação opcional do material; o comportamento padrão dos demais consumidores permanece compatível. A API continua fornecendo os registros completos à cooperativa autenticada, permitindo consulta histórica e acesso direto ao lote cancelado.

Não há alteração de quantidades no banco, exclusão de lotes, migração, mudança de API ou mudança de App Expo. A associação à entrada original permanece intacta. A análise foi feita no código e nas imagens; nenhum dado da VPS foi acessado ou modificado.

## Validação

**20 verificações passaram**: 11 testes automatizados de regras/regressão e 9 cenários no Chromium com a interface Vite real e respostas controladas de API.

O cenário visual reproduz o exemplo com um lote vendido de papelão e três anulações; também cobre material com apenas lotes cancelados, material novo sem lote, lotes disponíveis/reservados, busca de motivo, CSV de cada aba, recarga, consulta sem edição e largura de 390 px. Nenhuma mutação foi enviada à API no teste visual.

ESLint dos arquivos alterados e build Vite passaram. Permanece o aviso preexistente de bundle grande. Resultado consolidado em `docs/validacao-estoque-historico-2026-10-26.json`. Teste visual reproduzível em `frontend/tests/inventory-history-browser.mjs`, exigindo ferramentas externas de validação em `KATUA_VALIDATION_TOOLS` e caminho do Chromium em `KATUA_CHROMIUM_PATH`.

## Atualização da VPS pelo responsável

Atualizar somente o painel, em uma linha:

```bash
cd /var/www/katua/frontend && git pull --ff-only origin main && cd frontend && npm ci --include=dev && VITE_API_BASE_URL=https://vps.katua.com.br npm run build
```

Depois, recarregar com Ctrl + F5 e acessar Gestão de Resíduos → Visão do Estoque. Esta alteração não exige reiniciar a API, migrar o banco ou exportar novamente o App.

## Backlog

- [ ] Filtros de período no histórico, com definição explícita da data de referência.
- [ ] Linha do tempo agrupada por entrada de origem para consultar revisões sucessivas de destinação.

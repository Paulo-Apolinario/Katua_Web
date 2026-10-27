# Correção do bloqueio dos catadores no planejamento de rotas

Data: 27/10/2026.

## Correção concluída

- [x] Removido atributo `disabled` duplicado no checkbox de catadores em `RoutePlanner.jsx`.
- [x] Unificadas as condições: planejamento bloqueado, equipe cadastrada selecionada ou rota em andamento.
- [x] Preservado o bloqueio original (`locked`), que poderia ser sobrescrito pelo segundo atributo.
- [x] Lint direcionado e build de produção verificados, sem o aviso de atributo duplicado.

O build mostrado na VPS havia terminado com sucesso. O aviso de pacote acima de 500 kB é independente desta correção e não impede a compilação. Não há mudança de API, banco ou App; atualizar somente o painel.

## Backlog

- [ ] Avaliar divisão dos pacotes do painel por página em trabalho específico de desempenho.

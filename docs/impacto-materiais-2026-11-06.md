# Catálogo técnico e painel de impacto ambiental

Acesse **Gestão de resíduos → Catálogo → Editar material** para vincular o nome comercial à composição padronizada, apresentação, cor e informações técnicas. Não há preenchimento automático da classificação por nome, cor ou tipo de objeto. Classificações antigas são preservadas.

Em **Relatórios e análises → Impacto ambiental**:

- Semana civil (segunda a domingo), mês, ano e intervalo personalizado de até 366 dias.
- Filtros combinados por gerador, composição padronizada, item comercial e conferência da quantidade.
- Quantidades físicas por unidade; massa conferida separada da provisória.
- Detalhes por material, gerador, evolução mensal, estoque/destinações, rastreabilidade e qualidade/metodologia.
- Rastreabilidade permite conferir identificação dos materiais da coleta; declaração e revisões são preservadas. A lista exibe as 50 coletas recentes do filtro, sem limitar os totais; refine o período para encontrar outras.
- Saídas são agrupadas por quantidade física, sem multiplicá-las pelos comprovantes ou O.S. Saldo de estoque é atual e não histórico; o período das saídas considera a data de destinação.
- Exportação de resumo em PDF e Excel, com filtros, metodologia, revisão, cobertura e limitações.

**Metodologia** abre a configuração: fonte, versão, responsável técnico informado, região, cenário, período de aplicação, fator por item e composição. Alterar campos retira a confirmação da validação, exigindo nova confirmação. A validação é declarada pela cooperativa e não certificada pelo KATUÁ. Não foram inseridos fatores ambientais de produção.

O painel mostra **Sem estimativa** quando faltam identificação/peso conferidos ou fatores aplicáveis. Litros, unidades e m³ não são convertidos arbitrariamente para kg. A ABNT NBR 10004 orienta a classificação quanto à periculosidade e não fornece fatores de carbono, água ou energia.

Esta versão requer a migração e o backend correspondente de KatuApp. Atualizar também o componente ambiental do app antes de ativar o backend, pois o cliente anterior esperava números e não representava indicadores nulos. Sem acesso ou alteração da VPS.

Validação: build, lint direcionado, 5 testes de calendário/unidades e 12 verificações Playwright (desktop/celular, filtros, exportações e conferência). Backend: 33 verificações automatizadas e migração SQL em banco descartável. As exportações de teste não usam dados de produção.

# Abas do Analytics e uso estimado — 11/11/2026

O menu passa a distinguir **Relatórios da operação** de **Participação e atendimento**. As rotas dos relatórios existentes são preservadas. A página de Analytics oferece **Visão geral, Geradores, Catadores, Bairros e Uso do sistema**, com a aba e os filtros mantidos na URL.

Na visão geral, os pedidos de coleta agora mostram as categorias que fecham o total: recebidos, pendentes, cancelados sem recebimento, encerrados sem confirmação e registros a conferir. Ordens extras vinculadas já fazem parte dos pedidos e não são somadas novamente.

Geradores têm resumo, busca/lista paginada e histórico. Catadores têm participação operacional em recebimentos e acesso aos relatórios da produção. Datas de recebimento não são dias trabalhados nem tempo no aplicativo.

Bairros oferece mapa de calor e tabela acessível com todos os registros, incluindo os que não têm bairro/coordenadas. A intensidade pode mostrar todos os recebimentos, origens identificadas ou PEV. Os círculos usam a posição média dos pontos cadastrados e não representam limites oficiais de bairros. O mapa-base usa o mesmo OpenStreetMap já utilizado no sistema; se ele ficar indisponível, a tabela continua acessível. Não há inferência de adesão da população ou residência dos usuários de PEV.

Uso do sistema mostra tempo ativo aproximado por conta vinculada, dias com medição, último sinal e clientes observados. Apenas o período se aplica. Usuários sem dados ficam como **Sem medição no período**. Os clientes novos enviam somente segundos ativos e identificação da plataforma, com autenticação; tela em segundo plano/inatividade de 60 segundos interrompem a contagem. O servidor define identidade e escopo e agrega uma linha por usuário/dia, com deduplicação do mesmo intervalo.

## Cobertura e atualização

Não existe reconstrução de tempo anterior ao lançamento. A medição começa após atualizar o painel e os clientes Expo. Aplicativos Android/iOS instalados precisam receber uma versão com essa instrumentação; a atualização da VPS por si só não modifica um APK já instalado. A exportação web/PWA do app inclui a nova versão. Uso offline não é reenviado como tempo histórico. PF sem vínculo organizacional persistente não tem tempo global atribuído a cooperativas.

O assistente permanece oculto. Esta entrega exige a migração incremental de uso no backend; atualizar API com `prisma:deploy`, depois painel e app web. Sem dependência nova ou serviço pago. A validação local inclui build, ESLint, API/banco descartável, navegação das cinco abas, mapa/lista, detalhes, erros, celular e payload de uso controlado com relógio do navegador.

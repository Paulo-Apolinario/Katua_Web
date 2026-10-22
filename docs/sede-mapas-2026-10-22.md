# Localização da sede nos mapas do painel — 22/10/2026

## Diagnóstico

A sede já era retornada com coordenadas pelo resumo do painel e contexto dos relatórios. Esses mapas dependiam de latitude e longitude cadastradas; o endereço escrito, isoladamente, não criava um ponto. Não havia indicação clara dessa condição nem ação dedicada para localizar a sede. Um gerador coincidente podia encobrir o pino da cooperativa. O mapa de PEVs não carregava a sede.

A análise foi feita no código e em ambiente de teste, sem consultar ou alterar o cadastro real da VPS.

## Entrega

- Painel e relatórios com pino azul/casa para a sede, rótulo permanente “Sede da cooperativa” e prioridade visual sobre pontos coincidentes.
- Ação “Localizar sede”: centraliza o ponto e abre sua identificação. A sede permanece independente dos filtros de geradores/PEVs e do recorte de resultados.
- Mapa de consulta dos PEVs e ficha com mapa passam a incluir a sede, respeitando o enquadramento dos pontos. A sede não aumenta a contagem de PEVs e não interfere na seleção de coordenadas no formulário de cadastro/edição de PEV.
- Consulta da sede dos PEVs usa `GET /auth/me` atual, autenticado, sem reutilizar coordenadas antigas do snapshot do login. Falha na consulta recebe mensagem própria e não é confundida com ausência de coordenadas; os PEVs continuam disponíveis.
- Aviso “Sede sem coordenadas cadastradas” com acesso direto a Configurações → Endereço e sede. O link posiciona a tela na seção relevante após carregar os dados.
- Mapa das configurações utiliza o mesmo pino da sede e permite clique/arraste; coordenadas manuais continuam disponíveis. Cliques são bloqueados durante o salvamento e o aviso identifica se há ponto definido.
- São mantidas as regras existentes da API para salvar o par latitude/longitude da cooperativa. Endereço/cidade/GPS do aparelho não são inventados como posição da sede.

## Validação

Lint dos componentes alterados e build Vite aprovados. Persiste somente o aviso anterior de tamanho de bundle. Doze cenários de integração aprovados no runner `frontend/tests/dashboard-browser.mjs`, com API Fastify/Prisma real, PGlite descartável e Chromium:

- Nove cenários anteriores de painel e recuperação da localização dos geradores.
- Sede com marcador, identificação e centralização no painel, relatórios e PEVs.
- Sede sem coordenadas, acesso às configurações, gravação real pela API, recarga, sobreposição com gerador e layout móvel.
- Falha de consulta da sede sem interromper o mapa de PEVs e isolamento entre cooperativas.

Capturas desktop/celular inspecionadas. Tiles externos são bloqueados nos testes para conferir o comportamento sem mapa-base, com marcadores e identificação ainda disponíveis. Não houve teste na VPS nem alteração de dados reais.

Resultados: [validacao-sede-mapas-2026-10-22.json](validacao-sede-mapas-2026-10-22.json).

## Atualização

Entrega em `Katua_Web/main`. Atualizar e compilar somente o painel em `/var/www/katua/frontend/frontend`, preservando `.env.production`. Sem migração, nova configuração obrigatória, alteração de API ou export Expo nesta entrega.

Depois de publicar, conferir Configurações → Dados da cooperativa → Endereço e sede. Se ainda não houver latitude/longitude, marcar a sede correta e salvar. O mapa mostra o ponto cadastrado; um endereço preenchido sem coordenadas não é suficiente. Os mapas operacionais do aplicativo Expo permanecem fora desta alteração do painel.

## Backlog

- [x] Identificar quando falta coordenada da sede e oferecer acesso à correção.
- [x] Destacar a sede no painel e relatórios e incluir sua posição nos mapas de consulta dos PEVs.
- [x] Centralizar e identificar a sede por ação dedicada.
- [x] Evitar que um ponto coincidente encubra o pino da sede.
- [x] Padronizar o pino da sede nas configurações e permitir arraste.
- [x] Validar persistência, ausência de coordenadas, erro de consulta e isolamento.
- [ ] Responsável conferir e salvar a posição real da sede, caso ainda esteja ausente no cadastro da VPS.

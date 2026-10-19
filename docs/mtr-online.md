# MTR Online — página operacional de apoio à emissão

Data: 19/10/2026. Base: main fd35b84 do Katua_Web. Solicitação: analisar e reescrever a tela, retirar conteúdo ilustrativo e disponibilizar opções e links para geração do MTR. Autorização restrita a esta etapa; nenhuma mudança na API, banco, VPS ou App Web foi feita nesta entrega.

## Diagnóstico confirmado

A tela antiga não consultava a API. Usava duas rotas de 2024, empresas, placas e motoristas fictícios, contadores sem fonte e um formulário cujo Salvar apenas escrevia no console e mostrava sucesso mock. O formulário coletava senha externa sem integração. O calendário retornava para a própria página.

Não existe modelo, endpoint ou integração oficial de MTR no backend operacional examinado. Rotas, coletas, geradores, motorista, veículo, peso e materiais já podem ser consultados por GET /routes e GET /routes/:id. O contrato retorna .routes e .route.collections. As relações de motorista/veículo das coletas executadas devem ser preservadas ao montar a ficha.

## Decisões e resultado

- A página consulta rotas reais da cooperativa autenticada; filtros por texto, status operacional, motorista, veículo e data programada, atualização, paginação e estados distintos de carregamento, erro e vazio.
- Detalhes das coletas são consultados sob demanda. A ficha corresponde a uma coleta e um gerador; não agrupa cargas ou geradores por presunção.
- A equipe histórica da coleta executada nunca é substituída pela equipe atual da rota. Para coletas pendentes/em andamento sem vínculo próprio, é permitido mostrar o vínculo da rota; relação ausente com ID próprio não é substituída.
- A ficha mostra identificação da rota/coleta, cooperativa, gerador/endereço, equipe, peso e materiais registrados. Valor zero padrão ou dado ausente não vira peso aferido nem indicador oficial igual a zero. Quantidades e unidades são mantidas, sem conversão automática para toneladas ou inferência a partir da capacidade do veículo.
- Códigos de resíduos, documentos/cadastro das unidades, transportador, destinador, licenças, acondicionamento, estado físico, classificação e tecnologia ficam destacados para conferência no portal. A cooperativa não é automaticamente designada como gerador, transportador ou destinador.
- Ficha pode ser copiada ou baixada como texto; contém o aviso FICHA DE APOIO — NÃO É UM MTR OFICIAL. Exportação requer escolher um portal e uma coleta não cancelada em rota não cancelada. Operações canceladas continuam consultáveis.
- Atalhos externos abrem em nova aba com noopener/noreferrer e sem enviar dados da operação na URL. Não há coleta de login/senha externa ou armazenamento de credenciais.
- Removidos contadores fictícios de emitidos/pendentes, porcentagem artificial, exemplos e mensagem de salvamento falso. Não há marcação automática de emissão ao abrir o portal.
- Os dados consultados são descartados na atualização e não são mantidos entre contas. Respostas tardias de outro pedido de detalhes não substituem a seleção atual. Nenhum novo cache ou fila offline foi criado.

## Portais oficiais conferidos

A escolha é explícita, sem determinar obrigatoriedade ou estado aplicável por suposição. Sistemas estaduais e operações entre estados exigem conferência do responsável pela operação. Os links são portais de acesso e orientação; geração exige cadastro/autenticação no sistema oficial.

- Nacional: https://mtr.sinir.gov.br/ — orientação https://sinir.gov.br/sistemas/mtr/
- São Paulo, SIGOR/CETESB: https://mtr.cetesb.sp.gov.br/ — orientação https://cetesb.sp.gov.br/sigor-mtr/
- Minas Gerais: https://mtr.meioambiente.mg.gov.br/ — orientação https://semad.mg.gov.br/sistema-mtr-mg
- Rio de Janeiro: https://mtr.inea.rj.gov.br/ — orientação https://www.inea.rj.gov.br/inea-licenciamento-pos-licenca-e-fiscalizacao/sistema-de-autocontrole/manifesto-de-transporte-de-residuos-mtr/
- Santa Catarina: https://mtr.ima.sc.gov.br/
- Rio Grande do Sul: https://mtr.fepam.rs.gov.br/ — orientação https://fepam.rs.gov.br/manifesto-de-transporte-de-residuos-mtr
- Espírito Santo: https://iema.es.gov.br/mtr_es — página oficial com botão de acesso; manual https://iema.es.gov.br/mtres/manual
- Goiás: https://mtr.meioambiente.go.gov.br/

Fontes primárias consultadas em 19/10/2026: páginas oficiais acima, portal de serviços gov.br para emissão MTR e páginas dos respectivos órgãos. O SINIR informa acesso Nacional via Gov.br desde agosto/2026. Páginas de orientação CETESB/SEMAD retornaram 403 para a leitura direta automatizada; os sistemas de acesso e referências oficiais foram encontrados na pesquisa pública. Não se realizou login, emissão, preenchimento ou chamada de webservice nos portais; a disponibilidade operacional externa não está garantida pelos testes locais.

## Arquivos alterados

- frontend/src/pages/route-management/MtrOnlineStatus.jsx — reescrita da página.
- frontend/src/utils/mtrPreparation.js — catálogo de portais, formatação, preservação da equipe e montagem da ficha.
- frontend/tests/mtr-preparation.test.mjs — regressões da ficha.
- frontend/tests/mtr-browser.mjs — execução integrada descartável com API/banco locais.
- docs/mtr-online.md — decisões, backlog e continuidade.
- docs/validacao-mtr-2026-10-19.json — resultados sanitizados.

## Validação executada

- Build Vite e ESLint dos dois arquivos de código passaram. Permanece aviso anterior de tamanho de bundle.
- Oito testes passaram: quatro novos de MTR e quatro anteriores de contratos/equipe. Os novos cobrem histórico ausente ou divergente, unidade sem conversão, peso ausente e URLs oficiais fixas.
- Cinco grupos integrados passaram: filtros/recarga; ficha com equipe histórica, cópia e download real; cancelamento/dado ausente; erro sem dados antigos; isolamento de cooperativas, perfil DRIVER e navegação móvel.
- Ambiente integrado: backend Fastify/Prisma original com JWT e consultas reais, PGlite PostgreSQL WASM descartável, Chromium desktop 1440x1100 e viewport móvel 430x932. Gerador, materiais e equipe divergente criados somente no banco de teste. Nenhuma consulta à VPS.
- Outra cooperativa não visualiza as rotas e recebe 404 ao tentar consultar diretamente a rota; perfil DRIVER não acessa a página do painel. Nenhuma chamada de escrita à API foi realizada pelos controles da página.
- Falha de consulta HTTP controlada no transporte exibe erro e limpa lista e ficha; não mostra sucesso ou lista vazia como substituição de uma falha.
- Cópia verificada no clipboard e download lido para conferir conteúdo, unidade em litros e equipe histórica. Recarga repete a consulta do servidor; a seleção da ficha é temporária e não é apresentada como salvamento.
- Limites: viewport móvel não é aparelho nativo; banco WASM não valida concorrência nativa do PostgreSQL. Emissão oficial, recebimento, CDF/DMR, sincronização com órgão e persistência de referência de MTR não foram implementados ou validados.

Reprodução (dependências isoladas já utilizadas nos testes de KatuApp): definir KATUA_VALIDATION_TOOLS, KATUA_PLAYWRIGHT_MODULE e KATUA_CHROMIUM_PATH; executar node frontend/tests/mtr-browser.mjs na raiz de Katua_Web. KatuApp deve estar ao lado ou ser indicado por KATUA_APP_DIR. O executor cria seu próprio banco descartável, exige API local em 3339 e banco em 54329 e não deve ser adaptado para produção. Credenciais geradas de teste não constam no resultado sanitizado.

## Backlog

| Item | Prioridade | Estado | Evidência / próximo passo |
| --- | --- | --- | --- |
| Tela sem mocks e sem credenciais externas | P1 | validado | Código, lint e navegador |
| Consulta de rotas/coletas e ficha de apoio | P1 | validado | API/banco locais e testes de histórico/isolamento |
| Atalhos de emissão e orientação oficiais | P1 | validado | Fontes primárias e URLs no navegador; não equivale a emissão |
| Publicar nova página na VPS | P1 | pendente de publicação | Responsável atualizar main e build do painel |
| Emissão automática dentro do KATUÁ | P2 | a confirmar | Definir órgão/UF/perfil emissor; acesso e contrato de integração antes de implementar |
| Registrar número, PDF, origem e histórico do MTR por coleta/carga | P2 | confirmado | Não existe contrato no backend; definir modelo, permissões e armazenamento em etapa própria |
| Consultar status oficial, recebimento, CDF e DMR | P2 | a confirmar | Integração oficial e vínculo de rastreabilidade, sem derivar do status da coleta |
| Demais sistemas estaduais e regras interestaduais | P2 | a confirmar | Confirmar abrangência operacional com responsável e órgão competente |

## Continuidade

Página funcional para consulta real, preparação e acesso à emissão externa; não é integração automática de emissão ou um cadastro persistente de manifestos. Decisões, seis arquivos e testes estão acima. Nenhuma migração ou mudança de API foi necessária. Próximo passo: responsável publicar e validar seus dados reais; se quiser emissão/registro dentro do KATUÁ, definir o sistema e o modelo de rastreabilidade antes da próxima etapa. Não houve deploy por nós.

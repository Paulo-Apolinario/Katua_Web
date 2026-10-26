# Localização de PEVs por CEP e confirmação no mapa — 26/10/2026

## Problema e autorização

Paulo identificou que Consultar CEP preenchia o endereço do PEV, mas deixava latitude e longitude vazias e o mapa sem marcador. Autorizou a correção no cadastro e na edição. O cadastro é consultado pelo ID e pela cooperativa; coordenadas são necessárias para marcadores e cálculo rodoviário.

## Entregue

- [x] Consultar CEP continua preenchendo o endereço via ViaCEP e passa a solicitar automaticamente uma sugestão de localização.
- [x] Busca pelo endereço completo, incluindo número, pelo geocodificador Google Maps já existente quando configurado/disponível. Nenhuma chave foi criada ou publicada.
- [x] Alternativa BrasilAPI CEP V2 quando não houver geocodificador de endereço disponível ou a busca não encontrar resultado. A posição por CEP é identificada como aproximada; não representa precisão no número do imóvel.
- [x] Marcador no mapa, aproximação para o ponto e campos latitude/longitude preenchidos. Mapa de edição utiliza o marcador profissional compartilhado de PEV.
- [x] Alterar o número e sair do campo refaz a busca. As consultas não são executadas a cada tecla.
- [x] Botão Confirmar localização no mapa, ajuste por clique/arraste e entrada manual das coordenadas. Confirmar valida a posição na interface; Salvar PEV grava as coordenadas pelos endpoints existentes.
- [x] Alterações de CEP, rua, número, bairro, município, UF ou descrição da localização invalidam as coordenadas e a confirmação anteriores. Dados não relacionados, como nome e observações, são preservados.
- [x] Respostas atrasadas de CEP/geocodificação são descartadas após mudança do endereço, ajuste manual, limpeza ou saída da tela. Consulta antiga não pode substituir um ponto já confirmado.
- [x] Avisos claros de busca, posição sugerida, confirmação necessária, localização confirmada e falha de consulta, com mensagens em português e tentativa manual disponível.
- [x] Salvamento de coordenadas sugeridas exige confirmação; não se salva o centro inicial do mapa como localização. Durante consultas/salvamento, o envio é protegido; durante salvamento, o mapa não aceita nova seleção.
- [x] Sem coordenadas, é necessário escolher explicitamente Salvar com localização pendente. O cadastro fica com latitude/longitude nulas e aviso de indisponibilidade para mapa/cálculo por ruas, preservando o suporte a cadastros incompletos sem confirmação silenciosa.
- [x] Na edição, coordenadas válidas já salvas são preservadas, sem recálculo automático. Alterar endereço ou pino exige nova confirmação; não há criação retroativa de registro de auditoria de confirmação.
- [x] Ajuste de largura do menu lateral em telas pequenas, impedindo que a parte do menu fechado cubra o formulário/mapa. Abertura e fechamento conferidos no cenário móvel.
- [x] O PEV salvo continua disponível à seleção de pontos da rota com as coordenadas persistidas. O editor de rota mantém sua própria confirmação de posição.

## Dependências e limites

Não houve alteração da API, Prisma, aplicativo Expo ou estrutura do banco. Os campos de coordenadas já existem; **não há nova migração**. A confirmação descrita é uma etapa da interface, sem novo campo booleano ou data de confirmação persistido no banco.

O preenchimento automático depende da disponibilidade de coordenadas pelo serviço externo. Não há promessa de localizar todos os CEPs ou números de imóveis. Se Google Maps estiver configurado, usa a chave VITE_GOOGLE_MAPS_API_KEY já existente; sem essa chave, a alternativa por CEP funciona quando o provedor disponibiliza coordenadas. Coordenadas ausentes, fora da região brasileira ou incompatibilidade de CEP/município/UF são recusadas. Nome, telefone e resíduos não são enviados à consulta; o Google recebe o endereço completo, e a BrasilAPI recebe o CEP.

A alternativa por CEP utiliza cache de resultados válidos por cinco minutos, até cinquenta CEPs por sessão do módulo, reduzindo consultas repetidas. Erros e resultados sem coordenadas não são armazenados como sucesso. Há tempo limite e cancelamento de consultas HTTP, além da proteção contra resultados atrasados do geocodificador.

Referência: [documentação oficial BrasilAPI — CEP V2](https://brasilapi.com.br/docs). O provedor informa que a geolocalização pode conter erros; a confirmação manual permanece obrigatória para salvar uma posição sugerida. Não se presume precisão cadastral a partir de um CEP.

## Validação

- Dez testes Node: seis do serviço de geocodificação e quatro de regressão dos utilitários de PEV.
- Doze cenários Chromium na interface real Vite: preenchimento por CEP sem chave Google; marcador; bloqueio de posição não confirmada; gravação/reabertura; invalidação por endereço; seleção manual sem mapa-base; uso na rota; número no endereço completo; resultado atrasado; CEP sem coordenadas; salvamento pendente explícito; consulta de CEP obsoleta; layout móvel (algumas verificações agrupadas no mesmo cenário).
- Total: **22 verificações aprovadas**. [Resultados](validacao-localizacao-pevs-2026-10-26.json).
- Lint dos módulos afetados e build Vite aprovados. Permanece o aviso anterior de tamanho de bundle.
- As respostas de API, CEP e geocodificação foram controladas nos testes do navegador, inclusive reabertura e seleção na rota. Não houve alteração de dados na VPS nem teste de cobertura ao vivo dos provedores. As imagens de desktop e celular foram inspecionadas.

Scripts: frontend/tests/pev-geocoding.test.mjs, frontend/tests/pevs.test.mjs e frontend/tests/pev-location-browser.mjs.

## Atualização na VPS

Somente Katua_Web/painel, pelo responsável:

```bash
cd /var/www/katua/frontend && git pull --ff-only origin main && cd frontend && npm ci --include=dev && VITE_API_BASE_URL=https://vps.katua.com.br npm run build
```

Preservar .env e .env.production. Recarregar o painel com Ctrl + F5. Não é necessário reiniciar a API, exportar Expo ou aplicar migrações para esta correção.

Conferência sugerida: cadastrar PEV, consultar CEP, completar número, revisar/ajustar pino e confirmar; salvar/reabrir e conferir coordenadas. Depois selecionar o PEV no planejamento de rota. Para um cadastro antigo sem posição, usar Editar PEV e completar a localização.

## Backlog

- [x] Busca automática, confirmação, proteção contra resultados antigos e manutenção do cadastro/edição.
- [x] Falhas explícitas, marcação manual, proteção do salvamento e validação em celular.
- [ ] Avaliar persistência da origem da coordenada, usuário/data da confirmação e auditoria geográfica, caso a operação precise desse histórico formal.
- [ ] Validar cobertura dos serviços com os endereços reais das cooperativas e PEVs de Fortaleza e dos municípios atendidos, sem dispensar conferência no mapa.

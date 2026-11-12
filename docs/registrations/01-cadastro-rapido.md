# Cadastro rápido — etapa 1

As listas de geradores e catadores incluem Cadastro rápido, mantendo o formulário detalhado existente. /quick-registration/generator e /quick-registration/collector mostram nome, telefone opcional e referência/endereço opcional; geradores também selecionam tipo. A cooperativa é determinada pela sessão na API.

Cadastro rápido não abre mapa nem pede e-mail, CPF/CNPJ ou senha. Salva um registro real, disponível para seleção operacional, sem ativar acesso. A interface mantém os dados em caso de erro e impede envios simultâneos pelo botão. Em falhas de comunicação, confira a lista antes de repetir um cadastro que possa já ter sido gravado.

As listas mostram Cadastro a completar, os campos pendentes e Completar cadastro. O filtro Mostrar somente cadastros a completar combina com a busca existente. Dados básicos completos não significa conta ativada: as duas informações são apresentadas separadamente. A edição complementa o mesmo registro, sem recriar o colaborador ou perder histórico.

CPF/CNPJ, e-mail e localização também deixam de ser exigidos na criação detalhada de geradores. Seleções de localização só são salvas como confirmadas; registros com localização existente mantêm a conferência para substituí-la. Nos catadores, e-mail e CPF são opcionais; CPF fornecido deve ser válido. E-mail de gerador sem conta vinculada pode ser completado na edição.

A tela funciona no computador e no navegador do tablet/celular. Esta entrega não adiciona ainda cadastro rápido nativo no App do Catador nem login por celular/recuperação assistida; essas são etapas seguintes. Não habilita triagem ou novos perfis. O assistente segue oculto e o Analytics mantém a proteção de senha existente.

Validação UI: tests/registrations/quick.mjs usa build local e dados sintéticos da integração descartável da API. Cobre atalhos, campos mínimos, pendências/filtro, complementação, preservação após erro e layout de 390px. Não acessa dados de produção. Atualizar a API e sua migração antes do build deste painel.

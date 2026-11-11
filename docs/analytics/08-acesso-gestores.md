# Tela de acesso ao Analytics

O item de menu e links diretos do Analytics abrem uma tela pequena de acesso restrito aos gestores, com campo de senha e botão Liberar acesso. O conteúdo e suas consultas só montam depois da confirmação da API.

A senha não é incluída no código web nem armazenada. A autorização opaca é mantida apenas em memória e enviada no cabeçalho X-Analytics-Access das consultas do módulo. A proteção também é aplicada na API, inclusive à exportação executiva e aos detalhes.

A liberação dura no máximo trinta minutos. Sair do Analytics, atualizar a página ou clicar em Bloquear Analytics exige nova senha. Navegar entre subabas e registros mantém a liberação. Erros de senha não removem o login do painel. O restante do painel, os relatórios e a coleta de uso continuam com as regras existentes.

Publicação: atualizar primeiro a API e depois o build web. Não há migração ou dependência nova e não é necessária atualização do aplicativo do catador. O assistente permanece oculto.

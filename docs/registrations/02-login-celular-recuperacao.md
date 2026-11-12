# Acesso e recuperação — etapa 2

O login por senha recebe E-mail ou celular; o acesso por link continua recebendo e-mail pessoal. A recuperação oferece escolha entre e-mail de acesso, celular com DDD e CPF. A resposta pública é genérica e não revela cadastros, destinatários ou a existência de contas.

Os formulários de geradores e catadores, incluindo cadastro rápido, recebem E-mail de recuperação (opcional) e o atalho Usar e-mail da cooperativa. Esse contato pode ser igual em vários colaboradores e fica separado da identidade de login. A API verifica o escopo da cooperativa; nenhuma recuperação pública aceita alterar o destinatário.

Na edição, o botão Enviar link para definir acesso prepara a conta e solicita as instruções para criar a senha. Para contas já ativadas, o botão indica Enviar recuperação de acesso. Alterações em e-mail, celular e recuperação devem ser salvas antes do envio. O acesso preparado ainda aguarda confirmação por link e senha temporária. A interface distingue esse estado de uma conta ativada.

Os links de redefinição podem não conter e-mail pessoal. Nesse caso a tela mostra Conta identificada pelo link, exige token e senha temporária e não solicita um e-mail inventado. Os links anteriores permanecem compatíveis. Recuperação por CPF só funciona quando o documento consta de uma única conta habilitada. Celulares compartilhados não selecionam uma conta automaticamente.

O e-mail de recuperação da cooperativa é uma opção expressa de assistência: quem recebe o link pode auxiliar na definição de senha do colaborador. A interface orienta essa consequência antes de salvar o contato. Nenhum envio em produção foi feito durante a validação.

Atualizar a API e aplicar a migração 20261112180000_phone_login_recovery antes do painel. Atualizar também o build do App Web/PWA para as novas telas da cooperativa. SMTP de autenticação configurado é necessário; não há nova dependência ou variável de ambiente. Analytics permanece protegido e assistente oculto.

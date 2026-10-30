# Cadastros em PDF e localização por endereço — 30/10/2026

## Comportamento

As listas de Catadores, Geradores e Motoristas passam a oferecer o botão **Baixar cadastros em PDF**. O diálogo permite escolher um cadastro específico ou todos os cadastros da cooperativa. A consulta de exportação é independente dos filtros e da página exibida; é refeita ao baixar para obter dados atuais. O resultado é um único PDF A4 com fichas individuais ordenadas por nome. Os arquivos anexados aos cadastros não são incorporados.

As fichas incluem identificação da cooperativa e seu CNPJ quando disponível, emissor, data/hora do Ceará, campos cadastrais de cada perfil e paginação. Catadores incluem filiação, inscrição, categoria e perfil socioeconômico. Geradores incluem classificação por CPF/CNPJ, endereço, localização e acesso. Motoristas incluem CPF, CNH, categoria, situação e observações. Valores ausentes aparecem como “Não informado”. Datas civis de filiação e nascimento não sofrem deslocamento de fuso.

Somente campos explicitamente definidos são enviados ao PDF; objetos internos, credenciais e caminhos de anexos não são serializados. A API continua aplicando autorização e vínculo à cooperativa. O painel confere a sessão antes e depois das consultas e antes do download, verifica o vínculo retornado e bloqueia exportações em caso de erro, sessão alterada ou lista vazia. Não há nova rota pública de exportação. O módulo de composição é importado ao solicitar o download; jsPDF e AutoTable já existiam no projeto.

Na criação e edição de geradores, alterações do endereço invalidam a localização anterior. Com rua, número, cidade e UF preenchidos, uma pausa de 800 ms dispara a consulta por rua, número, bairro, cidade, UF e CEP. O ponto sugerido precisa ser confirmado antes de salvar. Respostas antigas são descartadas, inclusive depois de escolher manualmente o ponto. Alterações de nome ou outros campos não relacionados não disparam geocodificação. A edição preserva coordenadas já salvas enquanto o endereço não mudar. Coordenadas preenchidas manualmente continuam sujeitas à validação do par latitude/longitude.

A consulta de CEP preserva o número e outros campos que o usuário alterou durante a espera. Uma resposta não pode sobrescrever um endereço editado ou um ponto escolhido mais recentemente. A precisão da sugestão depende do provedor; a confirmação no mapa permanece necessária. A configuração Google Maps existente é utilizada.

## Arquivos principais

- `frontend/src/components/registrations/RegistrationPdfExport.jsx`: diálogo compartilhado e orquestração autenticada do download.
- `frontend/src/utils/registrationPdf.js`: campos permitidos, apresentação e construção dos PDFs.
- `frontend/src/components/generators/useAddressLocation.js`: debounce e descarte de respostas antigas.
- Páginas de criação/edição de geradores e listas dos três perfis: integração.
- `frontend/tests/registration`: testes de navegador e verificação dos PDFs.

## Validação

- ESLint dos oito arquivos alterados/criados de produção: sem erros e sem avisos.
- Build Vite de produção: aprovado; permanece o aviso de tamanho do pacote principal já existente.
- 22 verificações da API local com banco PGlite descartável, incluindo isolamento entre cooperativas.
- 10 grupos de verificações no navegador contra a API local real, com respostas de CEP e Google Maps controladas: seis downloads, filtros/paginação, falha HTTP, sessão alterada, lista vazia, busca automática com número, resposta antiga, escolha manual, edição e diálogo em 390 px; sem erros JavaScript.
- Os seis PDFs foram abertos e extraídos com PyMuPDF. Foram conferidos CPF/classificação, campos de filiação, data brasileira, ausência de credenciais, todos os registros esperados, conteúdo individual, textos longos até o último trecho e limites de página. Fichas renderizadas foram inspecionadas visualmente.
- Teste completo de motoristas: 13 fichas, inclusive as que não aparecem na página ou filtro atual.

Reprodução (ambiente local de validação):

```bash
cd frontend
KATUA_API_SERVER=/caminho/KatuApp/server KATUA_VALIDATION_TOOLS=/caminho/ferramentas node tests/registration/run.mjs
python tests/registration/verify_pdfs.py /caminho/ferramentas/registration-ui-evidence
```

A infraestrutura de teste reutiliza o runner descartável da API por uma cópia temporária removida ao terminar. Requer dependências da API instaladas e Prisma gerado; Playwright, Chromium, PGlite e PyMuPDF no ambiente de validação. Não usa serviços nem dados de produção. As chamadas externas de CEP e mapa são controladas nos testes; configuração, cota e precisão do Google Maps de produção devem ser conferidas no uso real.

## Publicação na VPS

Apenas o painel precisa ser atualizado; não há migração ou alteração de servidor nem do App nesta entrega.

```bash
cd /var/www/katua/frontend && git pull --ff-only origin main && cd frontend && npm ci --include=dev && VITE_API_BASE_URL=https://vps.katua.com.br npm run build
```

Após publicar, conferir em cada lista a seleção individual e completa. Na criação/edição de gerador, buscar CEP, preencher ou alterar o número, aguardar a sugestão e confirmar o ponto antes de salvar.

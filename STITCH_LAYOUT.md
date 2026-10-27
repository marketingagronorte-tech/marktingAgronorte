# Layout da Central de Marketing

Referência: projeto Stitch `projects/16772742510434581621`, consultado em 27/10/2026.

O layout foi reimplementado em React sobre as ações e os registros existentes da Central. Foram preservados a autenticação, os perfis de acesso, as APIs, o armazenamento Supabase, a identidade visual oficial e o diálogo nativo da agenda. As telas de referência não são executadas no Site e nenhum exemplo fictício foi importado.

- Visão geral: indicadores reais, gráfico por período, conteúdos, agenda, canais e atualizações.
- Agenda: mês, semana, lista, filtros por tipo e painel lateral do registro selecionado.
- Conteúdos: quadro por etapa, filtros por canal e busca por título ou pilar.
- Redes: cartões multicanal, histórico, comparações válidas, fontes e galeria de entregas.
- Solicitações: esteira, filtros, galeria e fluxo de serviços.
- Acervo: atalhos existentes do Drive, materiais autorizados e índice de permissões.

Os gráficos exibem apenas métricas registradas, sem metas, crescimento ou integrações simulados. A galeria usa representações gráficas de categorias quando não existe uma imagem de capa confirmada; os exemplos visuais do Stitch não são tratados como material da cooperativa.

As fontes Inter (400–700) e Plus Jakarta Sans (600–700) foram obtidas da folha oficial `fonts.googleapis.com` em 27/10/2026 e estão hospedadas em `public/fonts/`. As licenças SIL Open Font License correspondentes, provenientes de `github.com/google/fonts`, acompanham os arquivos.

A chave do Stitch permanece exclusivamente na configuração local do cliente. Nenhuma chave, resposta de autenticação ou configuração MCP faz parte deste Site.

## Ajuste da Central de Servicos

A tela de solicitacoes segue a referencia 74fbd7dd21b84ab293845b1e0e51c6b3: cinco indicadores, abas de triagem e pedidos proprios, filtros combinados, lista/quadro, cartoes com briefing e prazo, acervo em quatro colunas e fluxo de quatro etapas. O formulario existente abre em painel lateral com rolagem interna e acoes fixas. SLA medio e satisfacao ficam indisponiveis ate haver dados suficientes; numeros, filiais, fornecedores e imagens ficticias do modelo nao sao importados. Nenhum registro foi criado para preencher o layout.

# Central de Marketing Agronorte
Aplicação privada criada em 16/10/2026. Dados persistentes em D1. A ativação inicial deve ser feita pela proprietária enquanto o Site ainda é privado, antes de liberar acessos. Convites Sites e perfis internos são etapas separadas.
## Recursos
Solicitações com briefing, prazo desejado e confirmado; agenda; conteúdo; métricas manuais com fonte e período; aniversários com consentimento; links Drive; configuração de capacidade e prazos; exportação JSON.
## Integrações
Google Calendar: abrir agenda privada e preparar evento via link, salvando explicitamente no Google. Não há sincronização bidirecional ou eventos criados automaticamente pelo painel.
Drive: pastas reais e links de materiais; não há upload nem sincronização de arquivos no painel.
Redes: cadastro manual. Links oficiais não autorizam APIs. Automação de métricas depende de conexão futura e permissões específicas.
A ferramenta Sites de descoberta de elegibilidade de conectores não estava disponível nesta sessão; nenhuma declaração de conector foi inventada.
## Desenvolvimento
`node scripts/run-framework.mjs dev`
`node scripts/check-domain.mjs`
`node node_modules/drizzle-kit/bin.cjs generate`
Build: helper oficial Sites build-site.mjs. Não expor credenciais.

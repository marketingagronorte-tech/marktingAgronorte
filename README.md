# Central de Marketing Agronorte
Aplicação privada da Cooperativa Agronorte. A versão Vercel usa Next.js em Node.js 24 e os registros existentes no Supabase. O visual, a agenda e os fluxos de trabalho são preservados.
## Recursos
Solicitações com briefing, prazo desejado e confirmado; agenda; conteúdo; métricas manuais com fonte e período; aniversários com consentimento; links Drive; configuração de capacidade e prazos; exportação JSON.
## Integrações
Google Calendar: abrir agenda privada e preparar evento via link, salvando explicitamente no Google. Não há sincronização bidirecional ou eventos criados automaticamente pelo painel.
Drive: pastas reais e links de materiais; não há upload nem sincronização de arquivos no painel.
Redes: cadastro manual. Links oficiais não autorizam APIs. Automação de métricas depende de conexão futura e permissões específicas.
O login na Vercel usa links de e-mail do Supabase Auth, apenas para a administradora e os membros cadastrados. A conta administradora mantém a identidade original de propriedade, sem reescrever registros.

## Publicação Vercel
Projeto `agronorte-marketing`, equipe `markting2`. Use `.env.example` como referência; não versione `.env.local`, `.vercel/` ou tokens. A conexão de backend usa a identidade OIDC temporária da Vercel, sem chave privada fixa. A função `agronorte-vercel-store` verifica assinatura, emissor, audiência, equipe, projeto e ambiente de produção.

Configure no Supabase Auth o endereço de produção e `/auth/callback` em URL Configuration e valide o envio de e-mail. A proteção de implantação Vercel permanece ativa. Cadastrar um perfil na Central não concede acesso à equipe da hospedagem.

A função original `agronorte-store` e o banco anterior estão preservados. Não execute inicializações ou importações D1 para publicar esta versão. Os diretórios `legacy/`, `build/` e `db/` são referências da hospedagem anterior. A aplicação Vercel não importa `cloudflare:workers`.

A conexão de login GitHub da conta Vercel é necessária para publicações automáticas por push. A publicação inicial pode ser feita diretamente com os arquivos do código.
## Desenvolvimento
`pnpm install --frozen-lockfile`
`pnpm dev`
`pnpm check`
`pnpm test`
`node scripts/check-domain.mjs`
Build Vercel: `pnpm build`. Execução: `pnpm start`. `/api/health` informa somente o estado da conexão, sem expor registros ou contagens. Não exponha credenciais.

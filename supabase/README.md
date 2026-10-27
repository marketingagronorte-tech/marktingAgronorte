# Banco da Central de Marketing

Projeto Supabase: `khuislaiuorbrqgjnctf` (conta marketing@agronorte.coop.py).

O login continua sendo fornecido pelo Sites. A API da Central valida a identidade e os perfis antes de cada operação. O navegador não recebe chaves de administração do Supabase.

As chamadas entre o servidor do Sites e a função `agronorte-store` usam assinaturas ECDSA P-256, com validade de 90 segundos e nonce de uso único. A chave pública está na função; a chave privada fica exclusivamente nos secrets de produção do Sites. A função usa a credencial administrativa já fornecida pelo ambiente do Supabase, sem copiá-la para outro serviço.

Variáveis do Sites: `AGRONORTE_SUPABASE_BRIDGE_URL`, `AGRONORTE_SUPABASE_SIGNING_KEY` (secret) e `AGRONORTE_STORAGE_MIGRATION_TOKEN` (secret). Não colocar valores em Git, frontend, logs ou arquivos de hospedagem.

`schema.sql` registra o esquema aplicado pelo MCP e o RPC com operações fixas, sem SQL arbitrário. Todas as tabelas têm RLS; `anon` e `authenticated` não têm acesso. A função SQL é SECURITY INVOKER, com search_path vazio e EXECUTE apenas para service_role.

## Transferência inicial

O endpoint privado `/api/storage-migration` exige o token adicional de manutenção, além do acesso privado ao Site. A operação POST `migrate` reserva a transferência e pausa gravações no banco antigo. As gravações em trânsito têm verificação atômica no D1; passam ao Supabase se a ativação já ocorreu. Leituras continuam disponíveis.

Os registros, membros, identificadores, datas de versão e administrador são copiados em uma única transação do Postgres. A cópia inteira é lida de volta e comparada por SHA-256 de conteúdo canônico antes de ativar o Supabase. O D1 original é mantido como cópia de segurança e marcador de ativação, sem apagar dados.

Falhas antes da ativação mantêm o D1 em uso. Uma cópia previamente preparada com conteúdo diferente não é sobrescrita automaticamente. Reservas abandonadas podem ser retomadas após cinco minutos. Transferências acima de 4,5 MB param para exigir lotes, sem ativar uma cópia parcial.

Após a ativação não há retorno automático ao D1 em caso de falha do Supabase: isso evita registros divergentes. As interfaces de erro pedem nova tentativa e mantêm os dados anteriores.

O Supabase guarda o banco da Central. Essa conexão não ativa APIs de métricas sociais, sincronização do Google Calendar ou upload de arquivos do Drive.

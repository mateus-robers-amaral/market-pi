# Migração do Supabase para Neon DB

## O que foi alterado

- ✅ Removida dependência `@supabase/supabase-js`
- ✅ Cliente Supabase substituído por cliente Neon PostgreSQL
- ✅ Variáveis de ambiente atualizadas
- ✅ Schema SQL criado para Neon

## Passos para completar a migração

### 1. Criar conta no Neon
- Acesse [https://console.neon.tech](https://console.neon.tech)
- Crie uma nova conta ou faça login
- Crie um novo projeto

### 2. Copiar a connection string
- No console do Neon, vá para "Connection strings"
- Copie a connection string no formato: `postgresql://user:password@host/database`

### 3. Atualizar arquivo `.env`
```bash
# Substitua com sua connection string do Neon
VITE_DATABASE_URL="postgresql://user:password@your-neon-endpoint.neon.tech/database_name"
VITE_NEON_API_KEY="seu_api_key_opcional"
```

### 4. Executar o schema no Neon
Execute o arquivo `neon-schema.sql` no seu banco de dados Neon:

**Opção A: Via Console do Neon**
- Acesse SQL Editor no console
- Cole o conteúdo de `neon-schema.sql`
- Execute

**Opção B: Via psql CLI**
```bash
psql postgresql://user:password@your-neon-endpoint.neon.tech/database_name < neon-schema.sql
```

### 5. Instalar dependências
```bash
npm install
# ou
bun install
```

### 6. Testar a conexão
Execute o aplicativo e teste as funcionalidades de banco de dados.

## Importantes

### SSL/TLS
- Neon exige conexão SSL por padrão
- Isso já está configurado no cliente (`ssl: { rejectUnauthorized: false }`)
- Para produção, use: `ssl: true`

### Mudanças na API

O cliente Neon mantém compatibilidade com a interface Supabase anterior:

```typescript
// Queries continuam funcionando igual
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('id', productId);

// Insert
const { data, error } = await supabase
  .from('products')
  .insert([newProduct]);

// Update
const { data, error } = await supabase
  .from('products')
  .update({ name: 'Novo nome' })
  .eq('id', productId);

// Delete
const { data, error } = await supabase
  .from('products')
  .delete()
  .eq('id', productId);
```

## Migrando dados existentes (se vindo do Supabase)

Se você tem dados no Supabase e quer migrar:

1. **Exportar dados do Supabase**
   ```bash
   # Via interface do Supabase ou psql
   pg_dump -U postgres -h supabase-host -d database > backup.sql
   ```

2. **Importar no Neon**
   ```bash
   psql postgresql://user:password@neon-host/database < backup.sql
   ```

## Troubleshooting

### Erro: "connect ECONNREFUSED"
- Verifique se o DATABASE_URL está correto
- Verifique se sua máquina tem acesso à rede (alguns firewalls podem bloquear)

### Erro: "SSL: CERTIFICATE_VERIFY_FAILED"
- Use a opção `ssl: { rejectUnauthorized: false }` em desenvolvimento
- Para produção, configure certificados corretos

### Erro: "relation 'products' does not exist"
- Execute o arquivo `neon-schema.sql` para criar as tabelas

## Documentação

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg driver](https://node-postgres.com/)

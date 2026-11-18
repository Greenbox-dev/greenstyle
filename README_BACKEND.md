# Meu Financeiro — backend Flask + SQLite

## Arquitetura
- Frontend PWA servido pelo Flask no mesmo domínio.
- API REST em /api.
- Conta pessoal única, configurada por variáveis de ambiente.
- SQLite com valores monetários armazenados em centavos.
- Sessão segura em cookie HTTP-only; senha armazenada somente como hash.
- No Render, o banco fica em disco persistente montado em /var/data.

## Desenvolvimento local
1. Instale Python 3.11 ou superior.
2. Crie e ative um ambiente virtual.
3. Execute `pip install -r requirements.txt`.
4. Configure as variáveis de ambiente descritas em .env.example.
5. Gere o hash da senha:
   `python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('SUA_SENHA_FORTE'))"`
6. Inicie: `flask --app backend.app run`.

## Publicação no Render
1. Importe este repositório no Render como Web Service usando o render.yaml.
2. Configure ADMIN_EMAIL e ADMIN_PASSWORD_HASH nas Environment Variables.
3. O SECRET_KEY é gerado automaticamente pelo Render.
4. Mantenha o Persistent Disk montado em /var/data. Sem ele, SQLite pode ser perdido em reinicializações/redeploys.
5. Acesse /api/health para verificar a aplicação.

## Endpoints
- POST /api/login
- POST /api/logout
- GET /api/me
- GET/POST /api/transactions
- DELETE /api/transactions/<id>
- GET/POST /api/wishes
- PATCH/DELETE /api/wishes/<id>

## Observações importantes
O backend oferece API autenticada. Antes de substituir o armazenamento local no frontend, faça a migração dos registros existentes e teste login, criação, edição, exclusão e recuperação de sessão. Não publique arquivos .env, banco SQLite ou credenciais.

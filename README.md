# Arquivo SQL — Mistério SQL

Jogo educacional de SQL com login de estudantes, painel do professor, liberação progressiva de fases e acompanhamento de métricas.

## Arquitetura

O projeto foi preparado para a Vercel:

- Frontend estático: HTML, CSS e JavaScript.
- API serverless: funções Node.js em `api/`.
- Banco administrativo: PostgreSQL/Neon via `DATABASE_URL`.
- Banco dos desafios: `data/caso.sqlite`, carregado no navegador com sql.js e usado somente para consultas de leitura.

Não há PHP no deploy.

## Configuração na Vercel

### 1. PostgreSQL

No projeto da Vercel, adicione a integração **Neon** e crie/conecte um banco PostgreSQL. A integração disponibiliza a variável `DATABASE_URL`.

### 2. Chave de sessão

Crie uma variável de ambiente chamada `SESSION_SECRET` com uma chave aleatória de pelo menos 32 caracteres.

Exemplo para gerar localmente:

```bash
openssl rand -base64 32
```

Configure as variáveis para Production e, se usar, Preview/Development.

### 3. Deploy

Após as variáveis existirem, faça um novo deploy. As tabelas administrativas são criadas automaticamente no primeiro acesso.

## Professor

Usuário inicial:

```text
Login: professor
Senha: ihatefurry
```

A senha é transformada em hash antes de ser armazenada no PostgreSQL. Se o usuário `professor` já existir, a inicialização não sobrescreve sua senha.

## Fases

1. **O notebook desaparecido** — investigação já existente.
2. **Filtrando evidências** — exige `WHERE` combinado com `AND`, `OR`, `LIKE`, `IN`, `BETWEEN` ou `ORDER BY`.
3. **Conectando as evidências** — exige `JOIN ... ON`.
4. a 8. **Ainda não desenvolvido**.

O professor pode liberar ou bloquear as fases desenvolvidas pelo painel administrativo.

## Desenvolvimento local

Instale as dependências:

```bash
npm install
```

Crie `.env.local` com:

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=uma-chave-com-pelo-menos-32-caracteres
```

Para reproduzir o ambiente serverless da Vercel localmente, use a Vercel CLI:

```bash
vercel dev
```

## Dados administrativos

O PostgreSQL armazena:

- usuários;
- fases e liberação;
- progresso;
- consultas executadas;
- tentativas;
- solicitações de redefinição de senha.

O arquivo `data/caso.sqlite` contém somente os dados do mistério e permanece separado das informações de autenticação.

# Arquivo SQL — Mistério SQL

Jogo educacional de SQL com autenticação de estudantes, painel do professor, liberação progressiva de fases e métricas.

## Requisitos

- PHP 8.1+ com extensões PDO e pdo_sqlite.
- Servidor com permissão de escrita na pasta `data/`.

## Executar localmente

```bash
php -S localhost:8000
```

Acesse `http://localhost:8000`.

## Professor

- Login: `professor`
- Senha inicial: `ihatefurry`

A senha é armazenada somente como hash no banco administrativo.

## Fases

1. O notebook desaparecido — investigação existente.
2. Filtrando evidências — exige `WHERE` e filtros adicionais.
3. Conectando as evidências — exige `JOIN ... ON`.
4–8. Reservadas como "Ainda não desenvolvido".

O professor libera as fases desenvolvidas pelo painel administrativo.

## Dados

- `data/caso.sqlite`: banco somente leitura usado nas investigações.
- `data/app.sqlite`: criado automaticamente no primeiro acesso e armazena usuários, progresso, consultas, métricas e solicitações de redefinição de senha.

O arquivo `data/app.sqlite` não deve ser versionado.

## Segurança

As consultas do estudante são executadas no navegador contra uma cópia do banco do desafio e aceitam apenas leitura. Usuários e métricas ficam separados no banco administrativo. As rotas administrativas validam sessão, perfil e CSRF.

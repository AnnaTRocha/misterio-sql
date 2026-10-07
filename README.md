# Mistério SQL — O Arquivo 3301

Jogo educacional de SQL com login de estudantes, painel do professor, liberação progressiva das missões e acompanhamento de métricas.

> **A verdade não foi apagada. Foi organizada.**

## Arquitetura

- Frontend estático: HTML, CSS e JavaScript.
- API serverless: funções Node.js em `api/`.
- Banco administrativo: PostgreSQL/Neon via `DATABASE_URL`.
- Banco investigativo: `data/caso.sql`, carregado no navegador com sql.js e usado somente para consultas de leitura.

Não há PHP no deploy.

## Configuração

Na Vercel, conecte um banco PostgreSQL/Neon e configure `DATABASE_URL`. Também crie `SESSION_SECRET` com pelo menos 32 caracteres.

O usuário inicial do professor continua sendo:

```text
Login: professor
Senha: ihatefurry
```

## Fase 1 — O Primeiro Acesso

Um servidor antigo da UNIBAVE voltou a responder. O estudante explora `usuarios`, `mensagens`, `arquivos`, `pessoas` e `acessos` usando `SELECT`, `FROM` e seleção de colunas.

O usuário `id = 3` aparece como **desconhecido**. Ao consultar as mensagens enviadas por ele, o estudante encontra:

- “Você encontrou a porta.”
- “Agora procure por 1987.”

O código **1987** encerra a fase.

## Fase 2 — 1987

A segunda missão investiga um incidente ocorrido em **17/09/1987** e possui seis etapas:

1. **Testemunha** — filtrar pessoas de 20 a 30 anos com nome iniciado por A usando `WHERE`, `BETWEEN`, `LIKE` e `AND`.
2. **Registro ausente** — usar `IS NULL` e encontrar a pessoa 37 na sala B12, entrada às 23:41 e sem saída registrada.
3. **Cidades** — `SELECT DISTINCT cidade FROM pessoas;` retorna Orleans, Tubarão, Criciúma e Braço do Norte.
4. **Último acesso** — `ORDER BY data_hora DESC` revela o registro 193, usuário NULL, em 21/09/1987 às 03:31 no terminal LAB-04.
5. **Maior frequência** — `COUNT(*)`, `GROUP BY pessoa_id` e `ORDER BY` mostram a pessoa 37 com 18 acessos.
6. **Código** — entre 17 e 21/09, o usuário 37 possui 12 acessos. `SELECT * FROM usuarios WHERE id = 37;` revela **Augusto Vieira** e o código **ORION**.

O código **ORION** encerra a Fase 2.

## Liberação e progresso

A Fase 1 inicia liberada. A Fase 2 continua controlada pelo professor.

Como esta atualização substitui completamente a narrativa antiga, o primeiro acesso após o deploy reinicia uma única vez o progresso e o histórico de consultas dos estudantes. As contas permanecem preservadas e o estado de liberação da Fase 2 não é sobrescrito.

## Desenvolvimento local

```bash
npm install
vercel dev
```

Use um `.env.local` com:

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=uma-chave-com-pelo-menos-32-caracteres
```


## Fase 3 — O Aglomerado

A terceira missão trabalha relacionamentos entre tabelas com JOINs. O estudante investiga `evidencias`, `referencias` e `recursos`, relaciona os registros com `INNER JOIN`, usa `LEFT JOIN` para encontrar uma evidência sem correspondência e recupera um recurso externo.

O protocolo final pede a interpretação do símbolo recuperado. A resposta aceita é **Plêiades/Pleiades**, sem diferenciar maiúsculas, minúsculas ou acentuação. Respostas como **Subaru/Subaro** recebem a dica: “Resposta errada. O que a logo representa?”.

A Fase 3 é criada como desenvolvida, mas permanece bloqueada até a liberação pelo professor.

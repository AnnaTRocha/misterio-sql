# Mistério SQL — O Arquivo 3301

Jogo educacional de SQL com login de estudantes, painel do professor, liberação progressiva das missões e acompanhamento de métricas.

> **A verdade não foi apagada. Foi organizada.**

## Arquitetura

- Frontend estático: HTML, CSS e JavaScript.
- API serverless: funções Node.js em `api/`.
- Banco administrativo: PostgreSQL/Neon via `DATABASE_URL`.
- Banco investigativo: `server/caso.sql`, executado pela API em uma cópia isolada por consulta.

Não há PHP no deploy.

## Configuração

Na Vercel, conecte um banco PostgreSQL/Neon e configure `DATABASE_URL` e `SESSION_SECRET` com pelo menos 32 caracteres. As contas e senhas já existentes são preservadas. `TEACHER_INITIAL_PASSWORD` com pelo menos 12 caracteres só é necessário para criar a conta do professor em um banco novo.

O usuário inicial do professor é:

```text
Login: professor
Senha: valor definido em TEACHER_INITIAL_PASSWORD
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
TEACHER_INITIAL_PASSWORD=uma-senha-aleatoria-com-12-ou-mais-caracteres
```


## Exercícios alinhados aos slides

As Aulas 01 e 02 mantêm a investigação original e as respostas **1987** e **ORION**. Cada aula possui uma checagem conceitual curta, ligada aos slides, além da evidência SQL e do código. As alternativas aparecem como cartões acessíveis; a resposta correta é validada apenas no servidor. Atividades já concluídas permanecem concluídas.

| Aula | Conteúdo dos slides | Investigação |
| --- | --- | --- |
| 03 | DDL, `CREATE TABLE`, chaves e restrições | Reconstruir a estrutura do observatório |
| 04 | `ALTER` e normalização | Corrigir o catálogo redundante |
| 05 | DML e transações | Corrigir os símbolos em uma transação |
| 06 | DQL, filtros, `DISTINCT` e agregações | Separar sinais de 1987 do ruído |
| 07 | `JOIN` | Relacionar acessos e objetos e achar ausências |
| 08 | Subconsultas, CTE e funções de janela | Reunir padrões dos fragmentos |
| 09 | NoSQL/MongoDB | ARG SQL em equipe mais uma pergunta breve sobre `find` |

Os exercícios 03–09 executam SQL no servidor em uma cópia isolada de `server/curso.sql`. O servidor reexecuta as instruções registradas e valida o estado das tabelas ou o resultado das consultas. Uma instrução é executada por vez. A liberação pelo professor e a conclusão da fase anterior também são exigidas para avançar. Os títulos e as dicas permanecem narrativos; o SQL de referência só aparece para usuários de teste.

Nas Aulas 01 e 02, o checklist só reconhece consultas que retornem a evidência esperada: uma consulta vazia não valida uma etapa apenas por conter palavras-chave. O código final só é aceito após os requisitos SQL e a checagem conceitual. Nas Aulas 03–08, a checagem conceitual é adicional aos requisitos SQL; a Aula 09 mantém a pergunta breve sobre MongoDB.

Na Vercel, `npm run build` publica somente HTML, CSS e JavaScript minificado em `public/`; os bancos SQL e a validação permanecem nas funções da API. Não são gerados source maps. A API limita consultas a 12 por minuto e respostas a 5–8 por minuto por usuário. Para reforçar o bloqueio de automação, habilite Bot Protection e regras de rate limit no painel da Vercel; `robots.txt` e minificação não impedem um bot determinado.


## Arquitetura narrativa do curso

O curso passa a ser preparado para 9 fases distribuídas em quatro arcos:

- Fases 1–2: **ARQUIVO // 3301**.
- Fases 3–5: **OBSERVATÓRIO // 1987**.
- Fases 6–8: **INTERCEPTAÇÃO // NÓ**.
- Fase 9: **OPERAÇÃO // 3301**.

As Fases 1 e 2 preservam a investigação e as respostas já utilizadas pelos estudantes. A sequência posterior acompanha os conteúdos reais dos slides: o exercício de `JOIN` passou para a Fase 7.

As fases 03–09 são desenvolvidas, mas começam bloqueadas para liberação pelo professor.

### Avaliações

A nota é distribuída entre as nove atividades:

| Avaliação | Fase | Peso |
| --- | --- | ---: |
| Exercícios 01–08 | 1–8, respectivamente | 7,5% cada (60% no total) |
| Exercício 09 | 9 | 40% |

O painel calcula a pontuação a partir da conclusão de cada atividade. As oito primeiras totalizam 60%. A API exige esses 60% antes de permitir a Fase 9 e mantém um estado separado para a validação do protocolo final **3301**.

### Identidades do ARG

O backend mantém dois grupos investigativos e atribui a cada estudante uma identidade adicional no formato `usN`, sem substituir o login real. As três primeiras identidades pertencem ao Grupo 01, as três seguintes ao Grupo 02, e o padrão se repete em blocos de três. A identidade `us0` fica reservada e invisível na listagem normal dos estudantes.

A estrutura administrativa mantém grupos, dicas secretas e submissões separados do progresso individual. O ARG final usa três fragmentos relacionais por equipe e uma identidade oculta.

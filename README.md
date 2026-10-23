# Mistério SQL: O Arquivo 3301

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

## Fase 1: O Primeiro Acesso

Um servidor antigo da UNIBAVE voltou a responder. O estudante explora `usuarios`, `mensagens`, `arquivos`, `pessoas` e `acessos` usando `SELECT`, `FROM` e seleção de colunas.

O usuário `id = 3` aparece como **desconhecido**. Ao consultar as mensagens enviadas por ele, o estudante encontra:

- “Você encontrou a porta.”
- “Agora procure por 1987.”

O código **1987** encerra a fase.

## Fase 2: 1987

A segunda missão investiga um incidente ocorrido em **17/09/1987** e possui seis etapas:

1. **Testemunha:** filtrar pessoas de 20 a 30 anos com nome iniciado por A usando `WHERE`, `BETWEEN`, `LIKE` e `AND`.
2. **Registro ausente:** usar `IS NULL` e encontrar a pessoa 37 na sala B12, entrada às 23:41 e sem saída registrada.
3. **Cidades:** `SELECT DISTINCT cidade FROM pessoas;` retorna Orleans, Tubarão, Criciúma e Braço do Norte.
4. **Último acesso:** `ORDER BY data_hora DESC` revela o registro 193, usuário NULL, em 21/09/1987 às 03:31 no terminal LAB-04.
5. **Maior frequência:** `COUNT(*)`, `GROUP BY pessoa_id` e `ORDER BY` mostram a pessoa 37 com 18 acessos.
6. **Código:** entre 17 e 21/09, o usuário 37 possui 12 acessos. `SELECT * FROM usuarios WHERE id = 37;` revela **Augusto Vieira** e o código **ORION**.

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

As Aulas 01 e 02 mantêm a investigação original e as respostas **1987** e **ORION**. Cada aula possui uma checagem conceitual curta, ligada aos slides, além da evidência SQL e do código. As alternativas aparecem como cartões acessíveis. A resposta correta é validada apenas no servidor. Atividades já concluídas permanecem concluídas. O aluno também pode escolher refazer uma fase concluída; isso limpa as consultas e respostas de prática da fase, mantendo a conclusão, a nota e as liberações.

| Aula | Conteúdo dos slides | Investigação |
| --- | --- | --- |
| 03 | `JOIN` e `LEFT JOIN` | Relacionar evidências, referências e recursos para identificar a marca registrada |
| 04 | `ALTER` e normalização | Separar contatos de observações e preservar os objetos e vínculos existentes |
| 05 | DML e transações | Corrigir os símbolos em uma transação |
| 06 | DQL, filtros, `DISTINCT` e agregações | Separar sinais de 1987 do ruído |
| 07 | `JOIN` | Relacionar acessos e objetos, achar ausências e setor do aglomerado |
| 08 | Subconsultas, CTE e funções de janela | Reunir padrões dos fragmentos |
| 09 | NoSQL/MongoDB | ARG SQL em equipe mais uma pergunta breve sobre `find` |

As fases 03 a 09 executam SQL no servidor em uma cópia isolada de `server/curso.sql`. O servidor reexecuta as instruções registradas e valida o estado das tabelas ou o resultado das consultas. Uma instrução é executada por vez. A liberação pelo professor e a conclusão da fase anterior também são exigidas para avançar. O SQL de referência só aparece para usuários de teste. Na Fase 03, a resposta atual é **SUBARU** e a evidência está disponível no banco, sem depender do link externo. Conclusões anteriores permanecem válidas.

Usuários marcados como teste podem abrir qualquer fase desenvolvida para verificar o conteúdo antes da liberação. Em cada fase, o painel de validação mostra as consultas de referência, a resposta conceitual quando houver e o código final. Na Fase 9, mostra também o protocolo **3301** e as consultas dos dois grupos. A conta de teste valida a consulta do Grupo 01.

Nas Aulas 01 e 02, o checklist só reconhece consultas que retornem a evidência esperada: uma consulta vazia não valida uma etapa apenas por conter palavras-chave. O código final só é aceito após os requisitos SQL e a checagem conceitual. A Aula 03 preserva as cinco etapas originais. Nas Aulas 04 a 08, a checagem conceitual é adicional aos requisitos SQL. A Aula 09 mantém a pergunta breve sobre MongoDB.

Na Vercel, `npm run build` publica somente HTML, CSS e JavaScript minificado em `public/`. Os bancos SQL e a validação permanecem nas funções da API. Não são gerados source maps. A API limita consultas a 12 por minuto e respostas a 5 a 8 por minuto por usuário. Para reforçar o bloqueio de automação, habilite Bot Protection e regras de rate limit no painel da Vercel. O arquivo `robots.txt` e a minificação não impedem um bot determinado.


## Plano da turma conforme as nove aulas do Canva

A turma está avançando para a Fase 04. O [plano de atividades](plano-aulas-04-a-09.html) relaciona as fases aos conteúdos das nove apresentações do Canva. O painel do professor controla separadamente a publicação desse plano e a liberação das fases. Na área dos estudantes, cada cartão identifica apenas o arquivo e a fase; os agrupamentos de avaliação ficam no painel do professor. As Fases 07 e 08 podem ser feitas em outro momento, depois do conteúdo correspondente; a plataforma exige completar 05 e 06 antes. O progresso não deve ser reiniciado. A organização de atividades posteriores à Aula 09 permanece para definição.

## Arquitetura narrativa do curso

O curso tem nove fases distribuídas em quatro arcos:

- Fases 1 e 2: **ARQUIVO // 3301**.
- Fases 3 a 5: **OBSERVATÓRIO // 1987**.
- Fases 6 a 8: **INTERCEPTAÇÃO // NÓ**.
- Fase 9: **OPERAÇÃO // 3301**.

As Fases 1 e 2 preservam as respostas já utilizadas pelos estudantes. A Fase 3 passa a identificar a marca Subaru; a Fase 5 mantém Plêiades como evidência da correção DML; e a Fase 7 identifica o setor N-06. Conclusões existentes não são apagadas nem reavaliadas.

As fases 04 a 09 começam bloqueadas para liberação pelo professor. A Fase 03 preserva o estado de liberação já definido pelo professor.

### Avaliações

As nove fases formam cinco exercícios avaliativos:

| Avaliação | Fases | Peso |
| --- | --- | ---: |
| Exercício 01 | 1–2 | 15% |
| Exercício 02 | 3–4 | 15% |
| Exercício 03 | 5–6 | 15% |
| Exercício 04 | 7–8 | 15% |
| Exercício 05 | 9 | 40% |

Cada fase concluída nos quatro primeiros exercícios vale 7,5 pontos; a Fase 09 vale 40 pontos quando concluída. A API e os painéis usam os mesmos agrupamentos. Para acessar a Fase 09, o aluno precisa completar as Fases 01–08, atingir 60 pontos e validar o protocolo final **3301**.

### Identidades do ARG

O backend mantém dois grupos investigativos e atribui a cada estudante uma identidade adicional no formato `usN`, sem substituir o login real. As três primeiras identidades pertencem ao Grupo 01, as três seguintes ao Grupo 02, e o padrão se repete em blocos de três. A identidade `us0` fica reservada e invisível na listagem normal dos estudantes.

A estrutura administrativa mantém grupos, dicas secretas e submissões separados do progresso individual. O ARG final usa três fragmentos relacionais por equipe e uma identidade oculta.

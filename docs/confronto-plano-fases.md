# Confronto do plano de fases com a intenção original e o aplicativo

**Estado:** revisão curricular e implementação local dos ajustes aprovados, em 16/10/2026.
**Base examinada:** working tree em 16/10/2026, incluindo alterações locais não commitadas em CSS, curso, validadores, dados e testes; texto extraído pelo plugin Canva nas nove apresentações.
**Escopo:** comparação do prompt original, de `docs/plano-fases.md`, das aulas 01–09 no Canva e do comportamento/código presente. A implementação local preserva os IDs das fases e os registros de progresso; nenhuma apresentação Canva ou liberação do ambiente online foi alterada.

### Atualização após retorno do usuário — 16/10/2026

- **Implementado:** cinco exercícios avaliativos agrupam as fases 1–2, 3–4, 5–6, 7–8 e 9, com pesos 15/15/15/15/40. Cada fase nos quatro primeiros pares vale 7,5 pontos; a fase 9 vale 40. O gate de 60% e o protocolo 3301 permanecem no servidor.
- **Implementado:** as respostas futuras são únicas nas fases antes repetidas: 03 = `SUBARU`, 05 = `PLEIADES`, 07 = `N-06`. A fase 03 inclui evidência local para não depender do link externo; conclusões antigas continuam válidas.
- **Implementado:** o painel do estudante mostra os cinco exercícios e sua pontuação parcial; o painel do professor mostra a fase atual e a composição dos grupos avaliativos.
- **Plano alinhado às nove aulas:** o guia relaciona as fases aos conteúdos Canva, mantém o progresso e orienta que 05–06 sejam concluídas antes de 07–08. Estas podem ser feitas em outro momento após o conteúdo correspondente. A organização após a Aula 09 permanece para definição; nenhuma liberação do banco online foi alterada.
- **Leitura curricular concluída:** o plugin Canva permitiu extrair o texto das nove apresentações. A matriz abaixo compara os conteúdos extraídos com as fases existentes.
- **Limite visual:** o plugin lista URLs de miniatura, mas não retornou as páginas como imagens nesta revisão; abrir a apresentação no navegador redirecionou para a tela de login do Canva. A leitura curricular foi feita pelo texto extraído e não atribuo cores, layouts ou consistência gráfica dos slides como fatos verificados. A ferramenta de notas não retornou texto de notas do apresentador.
- **Granularidade de nota adotada:** 7,5 pontos por fase concluída em cada par. Portanto, o corte de 60% requer as fases 01–08 concluídas.
- **Implementado visualmente:** preservam-se 01–02 e a base do terminal; fases 03–09 recebem paletas próprias relacionadas aos assuntos das aulas. A inspeção visual dos slides continua pendente porque as miniaturas não abriram nesta sessão; a proposta se baseia na matriz textual do Canva.

## Como ler este documento

- **Fato observado** descreve conteúdo diretamente localizado no repositório ou resultado de uma execução.
- **Inferência** interpreta intenção ou impacto pedagógico sem atribuí-los ao autor como fato.
- **Ambiguidade** identifica mais de uma leitura possível do prompt.
- **Recomendação** é uma decisão proposta para revisão; não equivale a requisito aprovado.

Impacto: **alto** afeta avaliação, acesso, correção pedagógica ou uma resposta canônica; **médio** afeta coerência entre fases, narrativa, validação ou experiência docente; **baixo** afeta acabamento ou documentação. Prioridade **P0** precede decisões de arquitetura e conteúdo; **P1** deve ser resolvida antes de reescrever fases; **P2** cabe na implementação e revisão final.

## Síntese executiva

1. **[Alto/P0] Avaliação agrupada implementada.** `server/arg.js` e as telas usam cinco exercícios, pesos 15/15/15/15/40 e 7,5 pontos por fase dentro dos quatro pares. A elegibilidade de 60% e o protocolo final permanecem validados no servidor.
2. **[Alto/P0] A lacuna curricular continua aberta para próximas turmas.** Aula 02 ensina normalização enquanto a Fase 02 cobra consultas e agregação; Aula 03 ensina DDL enquanto a Fase 03 cobra JOINs. Para a turma atual, preservar a sequência e liberar as fases conforme o conteúdo já apresentado. Para a próxima oferta, liberar 02–03 somente após as Aulas 06–07 ou revisar os materiais de aula.
3. **[Alto/P1] Respostas repetidas corrigidas.** A fase 03 pede a marca Subaru com fallback em evidência local, a fase 05 mantém Plêiades como resultado da tarefa DML, e a fase 07 pede o setor N-06, incluído no resultado de referência do JOIN.
4. **[Médio/P1] Identidade visual por aula aplicada desde a 03.** Cada fase ganhou tema próprio, mantendo o terminal comum. A paleta foi inferida dos tópicos textuais do Canva; layout, imagens e contraste dos slides não puderam ser confirmados visualmente nesta sessão.
5. **[Médio/P1] A arquitetura sugerida pelo plano é maior que a narrativa atualmente implementada.** Já existem identidades `us1`–`us6`, grupos, dados de fragmentos, `us0` e JOIN de três fontes na fase 9. A nova leitura das aulas confirma que 06–08 ensinam filtro/agregação, JOINs celestes e SQL avançado, não um percurso gradual de logs de usuários. Reutilizar o modelo existente antes de acrescentar entidades reais, novos progressos de grupo ou outro sistema de avaliação.
6. **Canva:** texto de todas as nove apresentações foi consultado; a ferramenta não retornou notas textuais do apresentador. O conteúdo não textual e a consistência gráfica não foram verificados. A contagem de páginas e tópicos extraídos aparece na matriz.
7. **Testes:** `npm test` foi executado em uma revisão anterior, mas não completou. Um arquivo passou; três falharam na inicialização por pacotes ausentes (`sql.js` e `@neondatabase/serverless`). Nenhum teste foi executado nesta implementação, conforme o escopo solicitado.

## Matriz de alinhamento: intenção × plano × implementação × decisão

| Intenção original | Proposta em `docs/plano-fases.md` | Estado implementado observado | Decisão recomendada |
|---|---|---|---|
| Manter cards e tema da área do aluno. | Preservar a experiência de área do aluno enquanto muda identidade visual das fases. | Os cards foram mantidos; fases 03–09 receberam acentos próprios e as páginas definem as paletas por `body.dataset.theme`. A inspeção visual dos slides continua limitada pelas miniaturas bloqueadas. | **Manter** os cards e revisar visualmente quando Canva/miniaturas estiverem acessíveis. |
| Aulas 01 e 02 mantêm tema; desde 02 em diante manter terminal SQL, variando cores, tema e pistas; aulas 03–05 devem ter outra temática. | Preserva 01–02 e cria arcos narrativos comuns para 03–09. | 01–02 permanecem no tema ARQUIVO; 03–09 agora têm identidade individual no terminal e nos cards. | **Implementado:** preservar a base do terminal e distinguir cada aula com cor, textura e acentos relacionados ao conteúdo; o QA de legibilidade dos slides ainda está pendente. |
| Aula 02: Ford Orion abre caminho para constelações, Subaru e Plêiades; resposta aprendida: `ORION`. | Faz `ORION` virar pista retroativa e cria uma cadeia até Subaru/Plêiades. | Fase 2 mantém `ORION`; fase 3 identifica `SUBARU` com evidência local; fase 5 conclui `PLEIADES`. | **Preservar `ORION`** e distinguir as respostas por fase. A fase 03 não exige abrir a imagem externa. |
| Slides de cada aula podem conter pistas para o desafio final; PDFs são liberados após exercício correspondente. | Endossa pistas ambientais nos slides e propõe liberar PDF aula a aula após minidesafio. | Não foi localizado fluxo de PDF/slides nem URLs Canva no código examinado; a fase final não consome uma pista de slide. O progresso rastreia fases e avaliações, não liberação de PDF. | **Manter como ideia a validar** com o professor e com os slides. Definir pista, função, acessibilidade sem slide e mecanismo de liberação antes de construir. |
| Dois grupos cruzam registros de três integrantes cada e encontram usuário secreto/perdido (exemplo `us0`). | Desenvolve grupo 1 (`us1`–`us3`) e grupo 2 (`us4`–`us6`), pistas paralelas, conta secreta e código `US0`. | `server/curso.sql` contém duas linhas de sessão, duas de dispositivo e duas de identidade, relacionadas por grupo e com `codigo=0`; dados de `investigacoes` têm fragmentos por `us1`–`us6`. `server/arg.js` cria grupos e identidade `us0` secreta/oculta e distribui alunos reais. Fase 9 exige JOIN das três tabelas e valida que os aliases do grupo da sessão aparecem. | **Reutilizar e auditar os dados existentes** antes de adicionar tabelas/contas. Distinguir usuário ficcional `us0` da identidade real de aluno, preservar privacidade e explicar a regra de equipes. |
| Informar o código no campo `PROTOCOLO FINAL/IDENTIFICAÇÃO` libera dicas extras. | Usa `US0` para liberar dica adicional e `3301` para acessar aula 09. | Na UI de todas as fases, “PROTOCOLO FINAL / IDENTIFICAÇÃO” é a forma geral do código de conclusão. Em fase 9, `3301` desbloqueia o protocolo antes da fase; a resposta de fase é `US0`. O plano aproxima esses dois campos, mas são ações separadas no aplicativo. Não foi observado fluxo de dica extra após `US0`. | **Definir um contrato de interface**: qual campo recebe 3301, qual recebe US0, quando aparece cada um e qual dica se libera. Evitar rótulo compartilhado para códigos de ações diferentes. |
| Exercícios 01–04 valem 15% cada; exercício 05 vale 40%; mínimo 60% antes do final. | Propõe avaliações 01 (fases 1–2), 02 (3–4), 03 (5–6), 04 (7–8), 05 (9), com pesos 15/15/15/15/40. | `server/arg.js` e as telas usam cinco blocos; cada fase concluída nos quatro pares vale 7,5, e fase 9 vale 40. | **Implementado:** pesos, pontuação parcial, exibição por bloco e corte de 60% no backend; 3301 continua obrigatório para a fase final. |
| Código de liberação da última aula é 3301; final relaciona-se à Cicada 3301. | 3301 libera operação final e fica como motivo narrativo recorrente. | 3301 aparece em `ARQUIVO // 3301`, dados/fragmentos e protocolo final. `unlockFinalProtocol` aceita somente `3301` após pontuação elegível; fase 9 tem narrativa de identidade ausente. | **Manter 3301** como código, mas definir se exige 60 pontos exatamente ou qualquer combinação de avaliações; preservar conexão explícita com Cicada 3301 no capítulo final. |
| Todos os exercícios aplicam conceitos das aulas 01–09. | Recomenda progressão cumulativa e que a fase final combine conteúdos 01–09; inclui SQL como ferramenta central. | Fases 1–8 têm objetivos de SQL específicos; não há evidência de que cada fase cubra conteúdo futuro. A fase 9 usa JOIN de três tabelas e uma pergunta NoSQL, não demonstra aplicação de todos os conceitos anteriores. | **Separar regra de curso da regra de exercício:** cada exercício pratica a aula atual e revisita conceitos prévios; o final integra conceitos 01–09. Mapear evidência observável para cada conceito antes de alegar cobertura integral. |
| Links Canva 01–09 fornecidos como fonte do conteúdo das aulas. | Reconhece que os slides podem exigir autenticação e deixa o encaixe de conteúdo para implementação. | O plugin Canva retornou texto e contagem de páginas das nove apresentações; as notas vieram vazias e as miniaturas foram bloqueadas no navegador. | **Leitura curricular concluída pelo texto extraído.** Usar a matriz para organizar o calendário atual e das próximas turmas; manter como pendente a revisão de imagens, layout e pistas não textuais. |

## Leitura por fase

Os títulos, objetivos, missões, pistas e respostas abaixo vêm de `server/challenges.js`, `server/phase3.js`, `server/concepts.js`, `server/curso.sql`, `server/caso.sql` e `server/test-tools.js`. A coluna de confronto agora também considera o texto extraído pelo Canva, detalhado na matriz curricular após esta tabela. A avaliação de sobreposição é uma **inferência** editorial; recursos visuais e conteúdo incorporado em imagens ainda não foram verificados.

| Fase | Objetivo SQL e resposta/código | Narrativa e aparência atual | Confronto e recomendação |
|---|---|---|---|
| **01** | SELECT básico: explorar usuários, projetar colunas, filtrar mensagens por remetente; checagem conceitual de chave estrangeira. Código de arquivo vem da recompensa arquivada, não de `LESSONS`. | Mistério de arquivo, usuário desconhecido e mensagens 1987; tema atual deve ser mantido. | Aula 01 (21 páginas) é introdução a dados, banco, DBMS, tabelas, chaves, relações/ER e instalação PostgreSQL; o texto extraído não mostrou ensino explícito de SELECT. Preservar card e tema, mas garantir demonstração de SELECT/FROM/projeção antes de avaliar. Validador exige projeção, porém não todas as formas equivalentes. |
| **02** | `BETWEEN`/`LIKE`, `IS NULL`, `DISTINCT`, ordenação, `COUNT/GROUP BY`, intervalo temporal, JOIN e identificação de `ORION`; sem checagem conceitual própria na fase 2. | Arquivo investigativo; Orion é tanto modelo de carro no prompt quanto constelação no arco proposto. | É a transição narrativa central, não uma fase de identidade nova. **Desalinhamento curricular:** Aula 02 ensina normalização e anomalias; não cobre esses recursos de consulta. Preservar `ORION` e esclarecer a ponte narrativa, mas incluir os pré-requisitos de SQL na aula antes da avaliação ou reformular a fase para avaliar o conteúdo ensinado. |
| **03** | Examinar `evidencias`; JOIN evidências/referências e referências/recursos; localizar URL recuperada; `LEFT JOIN` para órfão. Resposta atual `SUBARU`. | `O Aglomerado`, tema visual próprio de blueprint; evidência local de Subaru e referência opcional à imagem externa. | **Desalinhamento curricular permanece:** Aula 03 ensina DDL (`CREATE DATABASE/SCHEMA/TABLE/INDEX/COMMENT`); a fase avalia SELECT/JOIN. A turma atual já recebeu conteúdos de consulta nas Aulas 06–07, então a resposta revisada pode ser usada sem antecipar matéria a esta turma. Para uma próxima turma, alinhar o calendário manual de liberação aos pré-requisitos ensinados antes de abrir a fase. |
| **04** | ALTER; DDL de duas tabelas, PK/FK, UNIQUE/índice; migrar contatos deduplicados e três observações, protegendo origem. Resposta `NORMALIZACAO`. | `O Padrão Quebrado`, tema de catálogo em grafite e âmbar; dados de observadores e catálogo. | **Bom alinhamento parcial:** Aula 04 continua DDL com ALTER/DROP/TRUNCATE/RENAME e discute normalização/denormalização; a fase usa ALTER, schema e migração. O diff local amplia de 3 para 6 objetivos e adiciona índice, PRAGMA, INSERT limitado e validação de cópia. O validador exige convenções de PK/FK/UNIQUE/índice definidas na skill. |
| **05** | INSERT, UPDATE, DELETE seletivos, transação BEGIN/COMMIT; limpar falsa marca e confirmar Subaru/entrada `PLEIADES`. Resposta `PLEIADES`. | `A Sexta Estrela`, tema próprio de transação em azul-marinho, ciano e âmbar; tabela `simbolos`. | **Bom alinhamento parcial:** Aula 05 ensina INSERT/UPDATE/DELETE, ACID e BEGIN/COMMIT/ROLLBACK; a fase cobre DML e transação. A resposta agora é diferente da fase 03. A validação de ROLLBACK/SAVEPOINT segue fora do escopo atual; a tela exige transação com alteração e COMMIT. |
| **06** | WHERE composto por ano/setor, `DISTINCT`, COUNT por ano e ordenação; resposta `N-04`. Conceito sobre WHERE antes do agrupamento. | `Eco no Setor Norte`, tema próprio de scanner verde para consultas e agregações. | **Bom alinhamento parcial:** Aula 06 ensina SELECT/FROM/WHERE, operadores lógicos, LIKE, DISTINCT, aliases, ORDER/GROUP e agregações. A fase pratica filtro, DISTINCT, contagem e ordem; adicionar AND/OR/LIKE e aliases se fizerem parte do objetivo da aula. Validador procura padrões textuais e células; avaliar equivalência semântica. |
| **07** | JOIN válido entre acessos e objetos; LEFT JOIN para ausência; contagem por objeto. Resposta atual `N-06`. Conceito pergunta quando usar LEFT JOIN. | `Linhas Cruzadas`, tema próprio azul/violeta; cruza nomes e setores de corpos celestes com acessos. | **Bom alinhamento parcial:** Aula 07 ensina tipos de JOIN e exercícios. A fase trabalha INNER/LEFT e agrupamento, mas não RIGHT/FULL/CROSS/SELF. O resultado de referência agora inclui o setor `N-06`, que dá resposta exclusiva sem repetir a identificação da fase 03 ou 05. |
| **08** | Subconsulta, CTE com contagem por equipe, `ROW_NUMBER() OVER (PARTITION BY...)`; resposta `FRAGMENTOS`. Conceito de janela. | `O Sétimo Rastro`, tema próprio de análise em violeta/ciano; investigações por `us1`–`us6`, `3301`, NORTE/SUL e PLEIADES. | **Bom alinhamento parcial:** Aula 08 ensina subconsultas IN/EXISTS/ANY/ALL, subconsulta em FROM/SELECT, CTE, `ROW_NUMBER`, `RANK` e `PARTITION BY`. A fase cobre subconsulta, CTE e row number/partition, mas não ANY/ALL, RANK e os outros locais de subconsulta. Os requisitos atuais são demonstrações isoladas; esclarecer como `FRAGMENTOS` prepara a fase 9 e validar resultado e ordenação de janela. |
| **09** | JOIN de três fontes do grupo; identifica `codigo=0`/`US0`; responde questionário NoSQL `find`. Protocolo anterior `3301`. | `Última Transmissão`, tema próprio preto/cobre/verde-azulado, voltado a NoSQL; duas equipes com pares de valores paralelos. | **Alinhamento parcial:** Aula 09 apresenta NoSQL e comandos MongoDB (`use`, coleções, insert, find, update e delete); a fase avalia um JOIN relacional e só pergunta o comando `find`. Integrar uma pequena tarefa MongoDB com dados/resultado verificáveis em uma revisão futura; manter a fase 09 para depois da aula e do gate 60% + `3301`. |

### Matriz curricular Canva × fases do aplicativo

Os resumos abaixo refletem texto recuperado pelo plugin Canva, não uma interpretação de imagens ou diagramas. Os títulos das apresentações vieram do Canva; “aderência” compara esse texto com o objetivo da fase atual.

| Aula / apresentação | Conteúdo textual extraído | Fase atual | Aderência e ação recomendada |
|---|---|---|---|
| [Aula 01 — Curso SQL 2026/01](https://canva.link/sl5jdnqxovb10cg) · 21 páginas | Dados estruturados; informação e conhecimento; banco e SGBD; tabelas, colunas e linhas; PK/FK; ER e cardinalidades; instalação PostgreSQL. | Fase 01: SELECT básico e chave estrangeira conceitual. | **Parcial.** Os conceitos de banco e chave combinam; acrescentar ensino explícito de SELECT/FROM/projeção antes de exigir a consulta. |
| [Aula 02 — Curso SQL 2026/01](https://canva.link/nk0rx390pwyi7nx) · 13 páginas | Modelagem e normalização; anomalias de inserção/atualização/exclusão; 1FN, 2FN, 3FN; desnormalização e exercício de ER. | Fase 02: filtros, LIKE, NULL, DISTINCT, ORDER, COUNT/GROUP BY e JOIN. | **Desalinhamento alto.** A aula e a avaliação ensinam objetivos diferentes. Incluir os pré-requisitos de consulta na aula antes do exercício ou adequar a fase ao conteúdo de normalização/modelagem. |
| [Aula 03 — Curso SQL 2026/01](https://canva.link/niliaf6pazlvybn) · 27 páginas | DDL: criação de banco/schema/tabelas/índices/comentários; exemplos com estados, cidades, clientes, telefones, categorias, produtos, pedidos e itens. | Fase 03: SELECT/JOIN/LEFT JOIN em evidências, referências e recursos. | **Desalinhamento alto para próximas turmas.** A turma atual já passou pelas Aulas 06–07 quando chega aqui; a fase exige JOINs e identifica a marca com fallback local. Para próximas turmas, não liberar antes que os JOINs estejam ensinados. A extração sugere sinais de pontuação suspeitos em alguns exemplos; a imagem do slide ainda precisa de inspeção visual antes de concluir que há erro. |
| [Aula 04 — Curso SQL 2026/01](https://canva.link/3wdo666longjl4h) · 12 páginas | DDL: ALTER, DROP, TRUNCATE, RENAME; normalização/desnormalização e revisão do modelo. | Fase 04: ALTER, criação de tabelas/restrições/índice e migração de dados. | **Boa aderência parcial.** A fase pratica ALTER/migração e estende para criação e integridade. Explicitar quais operações da aula são alvo da avaliação e aplicar as convenções de nomes do repositório/skill. |
| [Aula 05 — Curso SQL 2026/01](https://canva.link/8lw88rtil4v4e5r) · 13 páginas | DML; INSERT/UPDATE/DELETE; ACID; BEGIN/COMMIT/ROLLBACK; SAVEPOINT e ROLLBACK TO; introdução a SELECT. | Fase 05: DML seletivo e transação. | **Boa aderência parcial.** Incluir rollback/savepoint no roteiro ou deixar claro que não serão cobrados. Separar a descoberta e resposta narrativa da fase 03. |
| [Aula 06 — Curso SQL 2026/01](https://canva.link/gchcroauua5khbj) · 14 páginas | SELECT/FROM/WHERE; AND/OR/LIKE; ORDER/GROUP; aliases; DISTINCT; agregações. | Fase 06: filtros, DISTINCT, contagem e ordenação. | **Boa aderência parcial.** A fase contempla núcleo de filtro/agregação. Definir se AND/OR/LIKE/aliases são obrigatórios e refletir na missão, guia e validação. |
| [Aula 07 — Curso SQL 2026/01](https://canva.link/3flphj27i4hx5xk) · 13 páginas | JOIN; INNER/LEFT/RIGHT/FULL/CROSS/SELF; exemplos e exercícios de relações entre tabelas. | Fase 07: INNER/LEFT JOIN e agregação de acessos/objetos; resposta `N-06`. | **Boa aderência parcial.** A atividade avalia INNER/LEFT e agregação, não todos os tipos de JOIN. O setor retornado pelo resultado de referência sustenta a resposta exclusiva `N-06`. |
| [Aula 08 — Curso SQL 2026/01](https://canva.link/d49prz1spoqdclt) · 28 páginas | Subconsultas IN/EXISTS/ANY/ALL, em FROM/SELECT; CTE; funções de janela; `ROW_NUMBER`, `RANK`, `PARTITION BY`; exercícios. | Fase 08: subconsulta, CTE e `ROW_NUMBER` por grupo. | **Boa aderência parcial.** A atividade cobre três elementos centrais, mas não ANY/ALL, RANK e as posições FROM/SELECT. Decidir se devem ser ensinados para a prova final ou explicitamente fora do escopo. |
| [Aula 09 — Curso SQL 2026/01](https://canva.link/2ou8q7flgh8nac5) · 15 páginas | NoSQL; MongoDB, HBase, Redis, Elasticsearch; MongoDB `use`, coleções, insertOne/Many, find, updateOne/Many e deleteOne/Many. | Fase 09: JOIN de três tabelas para `US0` e questão conceitual sobre `find`. | **Desalinhamento parcial alto.** A fase dá peso de 40%, mas a evidência curricular de NoSQL é pequena. Acrescentar uma consulta/alteração Mongo verificável ou reduzir a promessa de cobertura da aula 09; manter também o JOIN ARG como objetivo integrador relacional. |

**Síntese de sequência:** Aula 01 introduz estrutura/ER e instala PostgreSQL; Aula 02 normaliza; Aulas 03–04 ensinam DDL; Aula 05 ensina DML/transações; Aula 06 consulta/agrega; Aula 07 JOINs; Aula 08 SQL avançado; Aula 09 NoSQL. A sequência do aplicativo começa com SELECT, passa a JOIN antes de DDL, e fecha com JOIN mais uma pergunta de NoSQL. Para preservar a organização aprovada dos cinco exercícios, minha recomendação é alinhar cada par àquilo que suas duas aulas ensinam e garantir pré-requisitos explícitos, sem introduzir sintaxe futura antes da aula correspondente.

### Recomendação de identidade visual por aula

Essa proposta é derivada dos assuntos extraídos dos slides e dos temas já presentes no app. Não afirma que tais cores já existam nas apresentações. Manter o terminal e a navegação reconhecíveis, usar contraste acessível e combinar cor com título, ícone e padrão gráfico.

| Aula/fase | Conceito visual recomendado | Acentos sugeridos | Elemento que distingue a aula |
|---|---|---|---|
| 01 | Arquivo e introdução a dados — preservar tema atual | Manter identidade existente | Cartão de arquivo, tabela e relações básicas. |
| 02 | Modelagem e normalização — preservar tema atual | Manter identidade existente | Diagrama entidade-relacionamento, linhas e decomposição de tabelas. |
| 03 | Construção de banco e schema | Índigo e ciano | Grade de blueprint, estrutura de tabelas e chaves. |
| 04 | Alteração e migração de schema | Grafite, papel claro e âmbar | Fichas de catálogo, antes/depois e trilha de migração. |
| 05 | Transação e integridade | Azul-marinho, ciano e âmbar | Estados BEGIN/COMMIT/ROLLBACK como sinais de controle. |
| 06 | Consulta, filtragem e agregação | Verde-esmeralda e carvão | Scanner, filtros e contadores visíveis. |
| 07 | JOIN e relações | Azul e violeta | Nós e ligações entre tabelas, com legendas para cada tipo de JOIN. |
| 08 | Subconsulta e janela analítica | Violeta e ciano | Camadas, painéis sobrepostos e faixas por partição. |
| 09 | MongoDB/NoSQL e operação final | Preto, cobre e verde-petróleo | Documentos JSON e coleções, preservando 3301 como selo da operação final. |

As identidades individuais foram aplicadas às telas do aplicativo. A revisão visual do Canva continua pendente: comparar legibilidade, repetição de componentes, contraste e distinção dos títulos quando as miniaturas puderem ser abertas.

### Interpretação pedagógica transversal

- **Sequência ensinada nos slides:** fundamentos/ER/instalação (01), normalização (02), DDL (03–04), DML e transações (05), consulta/agregação (06), JOINs (07), subconsulta/CTE/janela (08), NoSQL/MongoDB (09).
- **Sequência cobrada pelo aplicativo:** SELECT e relações desde 01, filtros/agregação/JOIN em 02, JOINs em 03, DDL em 04, DML/transação em 05, filtros/agregação em 06, JOIN em 07, SQL avançado em 08 e JOIN mais uma questão MongoDB em 09. As aulas 02–03 são os maiores desalinhamentos; 04–09 têm aderência parcial crescente, com diferença específica na cobertura de NoSQL.
- A promessa “todos os exercícios aplicam conceitos 01–09” deve significar **progressão cumulativa**: cada atividade pratica o conteúdo já ensinado e revisita o que veio antes; o exercício final integra SQL, ARG e conteúdo NoSQL. Não se deve exigir sintaxe de uma aula futura sem ensiná-la antes.
- Respostas atuais: `1987` (01), `ORION` (02), `SUBARU` (03), `NORMALIZACAO` (04), `PLEIADES` (05), `N-04` (06), `N-06` (07), `FRAGMENTOS` (08), `US0` (09). Fases 03 e 07 agora têm evidência local/resultado próprio e não reutilizam a resposta `PLEIADES`.
- Pistas: fase 3 explicita ORION, Subaru, seis estrelas, recurso externo opcional e ausência; 4–5 falam de repetição/ruído; 6–8 usam consultas como parte das pistas; 9 relaciona registros. Pistas visuais dos slides não foram verificadas; uma avaliação não deve exigir conteúdo não textual inacessível.

## Comparação especial: fases 03 e 05

| Dimensão | Fase 03 | Fase 05 | Avaliação |
|---|---|---|---|
| Tema/tela | Observatório // 1987, blueprint indigo/ciano | Observatório // 1987, transação azul-marinho/ciano/âmbar | O arco mantém continuidade e as aulas agora têm acentos próprios. A miniatura do Canva não pôde ser visualizada nesta sessão. |
| Alvo narrativo | Identificar a marca Subaru no registro ligado a seis estrelas | Corrigir dados da cópia e confirmar o aglomerado correto | A pergunta 03 pede a marca; a tarefa DML 05 confirma o aglomerado. A evidência textual local de Subaru permite resolver 03 sem abrir a imagem externa. |
| Resposta | `SUBARU` | `PLEIADES` | Respostas agora distintas; `PLEIADES` continua sustentada pelo INSERT confirmado da fase 05. |
| SQL | SELECT/JOIN/LEFT JOIN | INSERT/UPDATE/DELETE/transação | Distinção pedagógica substantiva. Uma fase não substitui a outra na cobertura de habilidades. |
| Dados | Evidências, recursos, referências | Tabela de símbolos pendentes/falsos | Fluxo temático coerente, mas conexão causal entre recurso da fase 03 e cópia corrigida da fase 05 é implícita. |
| Validador | Heurísticas de consulta/resultados; cobre vários equivalentes em testes | Checa estados finais dos dados e sinal de transação no avaliador | Fase 05 é mais semântica quanto ao estado final, mas a regra de `transaction` observa sequência textual e mudanças, não necessariamente a transação persistida em caso de erro/rollback. |

**Decisão do usuário aplicada:** as respostas repetidas são tratadas como defeito. As fases 03, 05 e 07 mantêm seus objetivos SQL e agora terminam em respostas próprias: `SUBARU`, `PLEIADES` e `N-06`. Conclusões anteriores são preservadas. A divergência Aula 03/fase 03 não foi reescrita para esta turma; o guia orienta liberar fases conforme pré-requisitos ensinados e anotar a lacuna para a próxima oferta.

## Validadores, respostas equivalentes e experiência do professor

### O que os testes atuais cobrem

- `tests/challenges.test.js` define consultas de referência para as fases 1–9 e confere marcos objetivos, consulta vazia, segurança e certos casos negativos.
- **Gap provável identificado por leitura estática:** o teste genérico de `solutions` passa `groupId = id`; para a fase 9 isso passa `9`, enquanto `checkMilestones` trata qualquer grupo diferente de 1 como grupo 2 e também exige que o resultado inclua o número do `groupId` (9). A consulta de referência dessa lista é do grupo 1. Como `sql.js` não carregou, a falha não foi executada neste ambiente; ajustar o teste genérico para fornecer grupo 1 à fase 9 ou excluir a fase 9 desse loop e manter o teste específico que exercita os grupos 1 e 2.
- Para 03, há testes explícitos de aliases, ordem invertida, projeção/filtro, sem aliases, comma join, relação incorreta, resultado vazio e órfãos.
- Para 04 (mudança local recente), há teste de variação de schema com constraint inline, nomes de constraints diferentes, ordem distinta de colunas, relações e migração; teste de PK/FK errada, idempotência, migração incompleta e proteção da fonte; teste de correspondência do guia com seis objetivos.
- Para 1–2, há testes de evidência real e de compatibilidade da consulta combinada da etapa 2.6.
- `tests/validation-guide.test.js` verifica guia e consultas de referência por fase; para fase 9 verifica dois grupos, protocolo 3301 e resposta NoSQL.
- `tests/auth.test.js` e `tests/sql-selection.test.js` têm foco de autenticação e seleção/extração SQL, não alinhamento de objetivos pedagógicos.

### Gaps prioritários de teste

| Prioridade | Fases | Critérios propostos para aceite |
|---|---|---|
| P0 | Avaliação/desbloqueio (todas) | Testar limites de 59,99/60, ausência de pontuação, soma das atividades e idempotência do código 3301; a decisão de pesos deve ser uma única tabela/configuração usada pelo painel e API. Testar que falha no 3301 não desbloqueia e que acesso não muda com submissão duplicada. |
| P1 | 01–02 | Variações de capitalização, espaços, aliases, projeção equivalente e igualdade/intervalo equivalente devem receber marco somente quando retornam linhas corretas; `WHERE 1=0`, coluna errada e filtro de saída vazio não devem conceder marcos. |
| P1 | 03 | Resultado equivalente a URL recuperada sem exigir coluna de URL em posição fixa; LEFT JOIN sem correspondência real; aliases, parênteses, `USING` quando aplicável e inversão de relações; rejeitar consulta com resultado correto por coincidência sem a relação exigida, se a relação é o objetivo. |
| P1 | 04 | Cobrir PK e FK inline/constraint sem deixar de validar a estrutura e exigir os nomes da skill: `pk_<tabela>`, `fk_<tabela_filha>_<coluna>`, `uq_<tabela>_<finalidade>` e `ux_`/`ix_` com tabela/colunas. Casos com nome incompatível, valores duplicados, FK quebrada, dado perdido/adicional, coluna errada, fonte alterada e migração parcial devem falhar. |
| P1 | 05 | Estado correto com sequência DML equivalente; `ROLLBACK`, erro entre BEGIN/COMMIT, falta de COMMIT, remoção de mais de uma evidência, UPDATE amplo e tentativa de alteração proibida; explicar se uma correção transacional ou todas precisam ser agrupadas. |
| P1 | 06–08 | Validar resultado semântico antes dos padrões SQL. Aceitar condições equivalentes (`BETWEEN`/limites), alias, `COUNT(*)`/contagem de chave não nula quando igual no conjunto, CTE/subconsulta equivalentes quando o objetivo é resultado; se o objetivo é ensinar sintaxe específica (CTE, ROW_NUMBER), exigir sintaxe-alvo, mas confirmar resultado e particionamento. |
| P1 | 09 | Consultas semanticamente equivalentes para cada grupo; assegurar que `codigo=0` vem do JOIN correto e que grupo não vê fragmentos rivais; rejeitar SELECT direto da tabela-alvo quando aprender a relação é requisito. Testar tentativa de `US0` antes dos objetivos, sem 3301 e sem elegibilidade. |
| P2 | Testes de guia/professor | Validar que passos, objetivos, respostas, código, conceito e peso exibidos aos professores/usuários refletem configuração única; reset de teste remove as submissões/progresso apropriados sem afetar dados de outros estudantes. |

**Princípio de equivalência recomendado:** distinguir três classes por objetivo, por fase. (1) Semântica do resultado: aceitar forma sintática equivalente quando retorna o mesmo conjunto/estado e demonstra o conceito-alvo. (2) Sintaxe ensinada: exigir construção específica somente quando ela é o próprio objetivo (por exemplo, `LEFT JOIN`, `WITH`, `ROW_NUMBER`), ainda conferindo resultado e relação. (3) Contrato de esquema: conferir tipos, nulabilidade, PK/FK/UNIQUE, nomes exigidos pela skill e preservação/migração; aceitar definição inline ou declarativa equivalente quando ambas mantêm a estrutura e os nomes convencionados. Restrições de acesso (somente leitura ou DML limitado) são uma camada separada e não devem ser confundidas com rubrica pedagógica.

### Experiência docente observada

O painel (`teacher.html`, `js/teacher.js`) mostra conclusão, pontuação, fase atual/próxima, consultas, tentativas, identidade/grupo e usuários de teste; permite liberar fases, redefinir senha, reorganizar grupos e configurar usuário de teste. Também identifica os cinco exercícios nos cartões de liberação e liga ao plano das aulas 04–11. O diff local acrescenta rótulos acessíveis à tabela e ao campo de senha, torna o campo de senha `password` com validação e pede confirmação antes de reorganizar grupos. Permanecem sem implementação o status de PDF, dicas extras e a cronologia/prêmio de uma competição final.

## Fontes externas e limites de verificação

- A associação Subaru–Plêiades é confirmada pela [página oficial de atendimento da Subaru sobre o significado do logo](https://contactus.subaru.com/knowledgebase/article/1000017/en-us) (inclui a explicação de cluster de seis estrelas) e pela [NASA/JPL sobre as Plêiades](https://www.jpl.nasa.gov/images/pia13121-seven-sisters-get-wise/), que identifica Subaru como nome japonês do aglomerado e o logo da montadora. Isso sustenta a ponte simbólica usada no plano.
- Para Órion e o automóvel, o plano usa [Ford Orion na Wikipedia](https://en.wikipedia.org/wiki/Ford_Orion). Nesta revisão não foi localizada uma fonte primária da Ford para a etimologia do nome; tratar a alegação específica sobre origem do nome como dependente dessa fonte secundária até verificação documental adicional. A inferência narrativa continua possível, mas não deve ser descrita como confirmação primária.
- Para Cicada 3301, o [arquivo colaborativo CicadaSolvers](https://www.cicadasolvers.com/timelines/) documenta a sequência dos puzzles de 2012–2014 e tipos de desafio. É arquivo comunitário, não uma fonte oficial dos autores anônimos. A relação de 3301 como referência cultural é coerente; não usar detalhes históricos como fato oficial sem indicar o caráter de arquivo/documentação comunitária.
- As apresentações Canva 01–09 foram consultadas pelo plugin, conforme matriz acima. O navegador bloqueou a abertura das miniaturas e o retorno da ferramenta de notas não trouxe notas de apresentador; por isso, a revisão cobre o texto extraído, não layout, imagens, diagramas ou pistas incorporadas como imagem.
- Os demais links fornecidos para vídeos, quadrinhos, anime, Elgoog, imagem e referências adicionais não foram analisados individualmente. A disponibilidade, o licenciamento e o conteúdo atual desses recursos permanecem sem verificação. O banco contém uma URL externa para o logo Subaru, mas isso não confirma a estabilidade nem o conteúdo atual do destino.

## Decisões aplicadas e pendências

1. **Identidade visual:** temas individuais aplicados desde a fase 03; comparar com os layouts reais das apresentações quando as miniaturas Canva estiverem acessíveis.
2. **Avaliação:** cinco exercícios agrupados em (1–2), (3–4), (5–6), (7–8) e (9), pesos 15/15/15/15/40; 7,5 pontos por fase em cada par. O gate de 60% e o protocolo `3301` continuam no servidor.
3. **Respostas repetidas:** corrigidas nas fases 03 (`SUBARU`), 05 (`PLEIADES`) e 07 (`N-06`). Conclusões antigas são preservadas.
4. **Organização da turma atual:** plano criado para as nove apresentações; preservar o progresso e concluir 05–06 antes de 07–08. A organização de atividades posteriores à Aula 09 permanece para definição.
5. **PDFs:** não foram fornecidos nem encontrados no repositório, e não existe mecanismo de distribuição/liberação. A implementação de PDF fica fora deste ajuste até haver os arquivos e a regra de acesso.
6. **Regras do ARG em grupo:** as identidades e grupos existentes foram preservados. Continuam em aberto critérios de competição/prêmio, distribuição de pontos por equipe, ausências e colaboração cruzada; o painel atual não cronometra uma disputa.
7. **Pistas não textuais:** Canva retornou texto, mas as miniaturas foram bloqueadas e as notas vieram vazias. Não usar informação somente visual como requisito de nota até essa revisão.
8. **Alinhamento para próximas turmas:** Fases 02–03 cobram conteúdos das Aulas 06–07 antes de a sequência dos slides os apresentar. Para a turma atual, a recuperação começa em 04; na próxima, liberar 02–03 apenas após os pré-requisitos ou revisar o material didático.

## Princípios recomendados para uma especificação oficial

1. Separar **conteúdo didático**, **objetivo SQL**, **pergunta conceitual**, **resposta avaliativa**, **código de acesso** e **pista narrativa** em campos e rótulos inequívocos.
2. Manter terminal SQL reconhecível, os cards existentes e as respostas já consolidadas da fase 2; documentar explicitamente qualquer nova interpretação sem invalidar a correção anterior.
3. Para cada fase, publicar uma ficha curta: conteúdo prévio, um objetivo pedagógico principal, pré-requisitos, tabelas/colunas, pista SQL, pista narrativa, resposta, código, critério semântico de validação, casos negativos, guia do professor e contribuição ao ARG.
4. Uma fase recebe marco somente por evidência do banco/resultado/estrutura apropriada, não por palavra-chave isolada; validar equivalência de formas sintáticas sem perder o conceito que se quer ensinar.
5. Usar nomenclatura do esquema de modo consistente (tabelas plurais `snake_case`, `id_<entidade>` e FK com o mesmo nome da PK referenciada, conforme `skills/phase-quality/SKILL.md`). Se a rubrica exige nome de coluna específico, dizer isso ao estudante; senão, decidir se equivalência é aceitável.
6. O material narrativo não pode exigir URL externa, vídeo autenticado, slide oculto ou recurso instável como única via para obter nota. Prover fallback acessível dentro do banco/atividade.
7. Reutilizar grupos e `us0` que já existem antes de propor outro modelo de identidade. Dados do curso devem ser fictícios e separados de autenticação e progresso real.
8. Pesos, liberação de fase, liberação de PDF e protocolo ARG devem ter fonte de verdade única, regra descrita ao estudante e testes de limites.
9. Para uma narrativa de competição, definir simultaneamente regra de avaliação individual, condição de vitória, contingência de indisponibilidade e mediação do professor; não implicar que o sistema atual cronometra ou premia automaticamente.

## Roteiro recomendado com dependências e aceite

| Etapa | Dependência | Trabalho proposto | Critério de aceite |
|---|---|---|---|
| **0. Decisões de produto** | Revisão de contexto | **Parcialmente aplicada:** avaliação, peso, corte, identidade visual e respostas estão definidos. Regras de prêmio/competição e PDFs seguem pendentes. | A nota totaliza 100%; 3301 e US0 têm funções separadas; decisão de PDFs documentada. |
| **1. Conferir currículo** | Acesso Canva | **Concluída por texto:** matriz das aulas 01–09 e lacunas comparadas ao app. | Nove apresentações identificadas por título, conteúdo extraído e página; inspeção de imagens ainda pendente. |
| **2. Desenhar narrativa e respostas** | Revisão curricular | **Implementada para a turma atual:** 03/05/07 têm respostas distintas; evidência de Subaru é local e o setor N-06 sai do JOIN. | Cada resposta está ligada a uma evidência SQL; as conclusões anteriores permanecem válidas. |
| **3. Fixar avaliação e desbloqueios** | Decisão de produto | **Implementada:** cinco grupos e pontuação parcial nos pares; 60% e 3301 no servidor. | A interface informa peso, fases incluídas e pontos obtidos. |
| **4. Especificar conteúdo por fase** | Matriz Canva | **Implementado no escopo:** atualização das respostas, do guia de referência da fase 07 e dos temas individuais 03–09. | A fase mantém seu objetivo SQL; as fases 02–03 permanecem registradas como desalinhamento para futuras turmas. |
| **5. Implementar em fatias** | Especificação | **Aplicado localmente:** backend, painel do estudante, painel do professor e plano de atividades alinhado às nove apresentações. Nenhuma liberação do banco online foi alterada. | Migração é aditiva; IDs e progresso permanecem; professor libera fases conforme o conteúdo e a sequência do sistema. |
| **6. Validação complementar** | Implantação local | **Pendente:** testes automatizados não foram executados neste pedido; inspeção visual do Canva segue limitada. | Executar `npm test` quando solicitado, abrir os slides para revisão visual e confirmar PDFs/regras de grupo antes de ampliar o escopo. |

## Resultado de `npm test`

Comando executado em 16/10/2026: `npm test` (`node --test tests/*.test.js`). Resultado observado:

- **1 arquivo de teste passou:** `tests/sql-selection.test.js`.
- **3 arquivos não iniciaram:** `tests/auth.test.js` falhou ao resolver `@neondatabase/serverless`; `tests/challenges.test.js` e `tests/validation-guide.test.js` falharam ao resolver `sql.js`.
- Saída final: 4 subtests de arquivo; 1 passou, 3 falharam. As falhas ocorreram durante o carregamento de módulos, antes da execução das asserções correspondentes. Portanto, isso não é evidência de falhas funcionais nessas três áreas, mas também não confirma que os testes delas passam.
- A leitura estática também apontou o provável defeito no teste genérico da fase 9 descrito acima; não foi possível confirmar por execução sem `sql.js`.

## Conclusão e status

`docs/plano-fases.md` registra a proposta narrativa inicial; a matriz Canva confirma os desalinhamentos de Aula 02/Fase 02 e Aula 03/Fase 03. A implementação atual preserva o progresso, mantém os cinco exercícios aprovados, usa respostas próprias em 03/05/07 e alinha o plano às nove apresentações. A organização posterior à Aula 09, a inspeção visual das apresentações, as regras de prêmio e o acesso a PDFs continuam pendentes.

**Estado do escopo:** código e plano alinhado às nove aulas alterados localmente; nenhuma alteração foi publicada no Canva ou no banco online. Testes não foram executados.

## Atualização da revisão: issues #1 e #6 (2026-10-23)

O repositório foi atualizado de `origin/main` antes desta alteração. As duas issues abertas foram tratadas no código local:

- **Issue #1 — resultados das Aulas 06–08:** os marcos das Fases 06–08 agora exigem o conjunto completo esperado. A Fase 06 também confere que a contagem esteja em ordem decrescente; a Fase 07 passou a conferir todas as relações e contagens; a Fase 08 confere os usuários, os totais por equipe e a numeração de cada registro. Testes cobrem resultados incompletos/extras, ordenação errada e formas equivalentes com aliases, `EXISTS`, `USING` e projeções reordenadas.
- **Issue #6 — ponte para DDL:** a Fase 04 ganhou um exemplo opcional, em quatro etapas, sobre sensores e medições. Ele mostra leitura da origem, criação de entidade, restrições/chave estrangeira e migração com `DISTINCT` e `JOIN`. As tabelas e os valores do exemplo são diferentes dos dados avaliados e não concedem objetivos.

### Coesão, enunciados e esquema

- A sequência narrativa continua legível: `ORION` abre o arco astronômico, `SUBARU` e `PLEIADES` são respostas distintas, e a Fase 07 termina em `N-06`. Os nove códigos finais continuam únicos: `1987`, `ORION`, `SUBARU`, `NORMALIZACAO`, `PLEIADES`, `N-04`, `N-06`, `FRAGMENTOS` e `US0`.
- O enunciado conceitual da Fase 06 agora trata de filtrar linhas antes do agrupamento, sem mencionar contagem de acessos válidos que não fazia parte do objetivo SQL daquela fase. A resposta final da Fase 08 foi ligada aos registros parciais, e o objetivo de janela explicita a ordem crescente do identificador para que o resultado de `ROW_NUMBER` não dependa de uma escolha implícita.
- As tabelas SQL visíveis ao estudante usam nomes plurais em `snake_case`; as chaves primárias seguem `id_<singular>` e as FKs usam o papel/entidade com `_id`. Isso inclui os nomes antigos `simbolos.id`, `evidencias.evidencia_id`, `recursos.recurso_id` e `referencias.referencia_id`, agora padronizados. As tabelas de fragmentos do ARG continuam sem uma chave primária declarada, pois esse esquema ensina a recompor os registros por `JOIN` e não usa uma coluna genérica `id`.
- As checagens conceituais não repetem a mesma pergunta. A Fase 03 continua sem questão conceitual, enquanto a Fase 09 testa apenas o método MongoDB `find`; essas diferenças permanecem visíveis para o planejamento.

### Cobertura curricular e pendências

Esta avaliação usa a matriz textual das apresentações Canva registrada acima. Ela não confirma imagens, diagramas, notas do apresentador ou materiais inseridos somente como imagem.

| Aula | Cobertura atual | Ponto pendente |
|---|---|---|
| 01 | Fase 01 usa SELECT e apresenta chaves na questão conceitual. | O texto da aula enfatiza dados, ER e instalação; confirmar que SELECT/FROM/projeção sejam ensinados antes de cobrar. |
| 02 | Fase 02 cobra filtros, `NULL`, `DISTINCT`, ordenação, agregação e JOIN. | Desalinhamento alto: a apresentação é de normalização e anomalias. |
| 03 | Fase 03 avalia SELECT/JOIN/LEFT JOIN. | Desalinhamento alto: a apresentação ensina DDL. Rever pré-requisito ou objetivo para próximas turmas. |
| 04 | Fase 04 pratica ALTER, criação e integridade de tabelas, além de migração. | DROP, TRUNCATE e RENAME da apresentação não são objetivos desta fase; esclarecer se ficam fora da avaliação. |
| 05 | Fase 05 pratica INSERT, UPDATE, DELETE e BEGIN/COMMIT. | SAVEPOINT e ROLLBACK não são avaliados. |
| 06 | Fase 06 pratica filtros, `DISTINCT`, COUNT, GROUP BY e ordenação. | LIKE e aliases não aparecem como objetivos; decidir se são pré-requisitos ou apenas conteúdo complementar. |
| 07 | Fase 07 pratica INNER JOIN, LEFT JOIN e contagem após o JOIN. | RIGHT, FULL, CROSS e SELF JOIN não são cobrados. |
| 08 | Fase 08 pratica subconsulta, CTE e ROW_NUMBER por partição. | ANY/ALL, RANK e subconsultas em FROM/SELECT não estão cobertos. |
| 09 | Fase 09 combina JOIN relacional e a questão conceitual `find`. | Cobertura de MongoDB é pequena para uma atividade de 40%; falta uma tarefa verificável com dados ou comandos MongoDB. |

**Resultado dos testes locais:** `npm test` passou (4 arquivos de teste) e `npm run build` concluiu. A validação da versão publicada será feita após o push; fases online continuam sujeitas às liberações da conta utilizada.

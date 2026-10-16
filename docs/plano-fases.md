> **Atualização de implementação — 16/10/2026:** este documento registra uma proposta narrativa inicial. Algumas ideias abaixo foram substituídas após a leitura das nove apresentações no Canva e a correção do usuário sobre respostas repetidas. A especificação curricular atual está em [confronto-plano-fases.md](confronto-plano-fases.md) e o plano alinhado às nove aulas está em [plano-aulas-04-a-09.html](../plano-aulas-04-a-09.html). Para a turma em andamento, preservar o progresso, manter a resposta 03 como `SUBARU`, manter `PLEIADES` exclusiva da fase 05 e usar `N-06` na fase 07. Os agrupamentos avaliativos 01–02, 03–04, 05–06, 07–08 e 09 usam pesos 15/15/15/15/40, com 7,5 pontos por fase nos quatro primeiros pares.

O direcionamento fica mais consistente com uma separação entre **conteúdo didático**, **narrativa do ARG** e **avaliação**. O ponto mais importante é preservar totalmente as Aulas 01 e 02: o aluno já aprendeu que a resposta da Aula 02 é **ORION**, portanto isso passa a ser um elemento canônico da história.

As associações que você encontrou permitem construir uma linha narrativa muito boa:

**ORION → constelação → Subaru → Plêiades → registros fragmentados → usuário secreto → 3301 → ARG final**

O Ford Orion realmente deriva seu nome da constelação de Órion, e 1987 cai no período do Orion Mark II, produzido entre 1986 e 1990. ([Wikipedia][1]) Já a própria Subaru informa que seu nome se refere ao aglomerado das Plêiades e que seu primeiro logotipo foi inspirado nesse conjunto de estrelas. ([Subaru Contact Us][2]) Isso torna a transição de **ORION → Subaru → Plêiades** uma pista legítima dentro da narrativa, e não uma conexão arbitrária.

# 1. Estrutura geral do curso

Eu dividiria as 9 aulas em **quatro atos narrativos**.

| Aulas | Tema                     | Identidade visual | Papel na história                                   |
| ----- | ------------------------ | ----------------- | --------------------------------------------------- |
| 01–02 | **ARQUIVO // 3301**      | atual             | Origem do mistério                                  |
| 03–05 | **OBSERVATÓRIO // 1987** | astronômico       | Órion, estrelas, Subaru e Plêiades                  |
| 06–08 | **INTERCEPTAÇÃO // NÓ**  | comunicação/sinal | usuários, registros, logs e identidade desconhecida |
| 09    | **OPERAÇÃO // 3301**     | ARG final         | competição entre os dois grupos                     |

Isso também resolve o problema visual que você apontou.

A página continua sendo reconhecidamente um **terminal SQL**, mas deixa de parecer que todas as aulas são simplesmente a mesma tela com uma cor diferente.

---

# 2. Aulas 01 e 02 — manter exatamente como estão

Não mexeria na identidade visual atual.

O aluno já conhece:

```text
SQL
ARQUIVO // 3301
```

e a Aula 02 termina com:

```text
ORION
```

Isso passa a ser um fato definitivo da investigação.

### O que muda é a interpretação

Na Aula 02, o aluno pensa:

> “ORION é a resposta.”

Mais tarde ele descobre:

> “ORION não era somente a resposta. Era uma pista.”

Essa é uma ótima técnica de ARG: uma resposta correta de uma fase anterior ganha **novo significado** posteriormente.

Não alteraria nada que possa invalidar o que os alunos já resolveram.

---

# 3. Aulas 03–05 — OBSERVATÓRIO // 1987

Aqui eu faria a primeira grande mudança visual.

## Identidade visual

Em vez do verde/amarelo do arquivo atual:

```text
OBSERVATÓRIO // 1987
```

Visualmente:

* fundo quase preto com azul muito escuro;
* estrelas/pontos discretos;
* azul profundo;
* branco frio;
* pequenos elementos âmbar;
* linhas de coordenadas;
* aparência de terminal científico;
* mapas celestes;
* numeração de objetos;
* referências como `RA`, `DEC`, `CATALOG`, `OBJECT`, `RECORD`.

A interface continuaria sendo:

```text
┌─────────────────────────────────────┐
│ SQL                                 │
│ OBSERVATÓRIO // 1987                │
└─────────────────────────────────────┘
```

mas a sensação seria completamente diferente.

---

# 4. O papel do ORION

O objetivo não é simplesmente contar para o aluno que Órion é uma constelação.

Precisamos fazer o SQL conduzir até essa conclusão.

Por exemplo, um banco com registros:

```text
objetos_celestes
----------------
id
designacao
tipo
catalogo
ano_registro
observacao
```

O aluno começa com consultas simples e, conforme progride, encontra:

```text
ORION
```

junto de registros como:

```text
CAT-1987
OBJECT-04
SECTOR-06
```

Uma observação poderia dizer:

```text
"Nome utilizado em um registro de origem não automobilística."
```

Isso faz o aluno perceber que o **ORION da Aula 02 tem outra camada de significado**.

---

# 5. A ponte ORION → Subaru

Aqui entra uma das suas melhores ideias.

A progressão poderia ser:

```text
ORION
   ↓
CONSTELAÇÃO
   ↓
ESTRELAS
   ↓
6 ESTRELAS
   ↓
SÍMBOLO AUTOMOTIVO
   ↓
SUBARU
   ↓
PLÊIADES
```

O interessante é que o aluno já conhece **um nome de carro**: Orion.

Depois encontra outro nome relacionado a estrelas.

A Subaru confirma oficialmente a relação do nome com as Plêiades e o uso do aglomerado de seis estrelas no emblema. ([Subaru Contact Us][2])

---

# 6. A imagem da Subaru deve ser uma recompensa

Eu não colocaria a imagem no banco nem no HTML logo de início.

O SQL deve devolver algo como:

```text
RECURSO EXTERNO RECUPERADO

TIPO: IMAGE
ORIGEM: EXTERNAL
STATUS: VALID

[ ABRIR RECURSO ]
```

Depois abre a imagem que você indicou:

```text
https://1000logos.net/wp-content/uploads/2018/03/Subaru-Logo-1999.jpg
```

O aluno deve identificar a marca registrada no banco:

```text
SUBARU
```

Na proposta inicial, o sistema pedia primeiro a marca e depois o nome do aglomerado. O usuário confirmou que reutilizar a mesma resposta em fases diferentes é erro; por isso, a implementação atual encerra a fase 03 com **SUBARU** e reserva **PLEIADES** para a fase 05, onde a resposta emerge da tarefa de DML.

---

# 7. As Aulas 03–05 podem contar uma única história

Eu evitaria que cada aula parecesse uma história isolada.

### Aula 03

**OBSERVATÓRIO // 1987**

Tema:

> Órion

Conteúdo SQL da aula é aplicado ao catálogo astronômico.

Final:

```text
ORION ≠ DESTINO
```

O aluno descobre que precisa continuar.

---

### Aula 04

**CATÁLOGO // SEIS**

Tema:

> registros relacionados / objetos / referências

A investigação chega à imagem.

Resultado:

```text
SUBARU
```

Mas não é a resposta.

Mensagem:

```text
RESPOSTA ERRADA.

O que a logo representa?
```

---

### Aula 05

**ARQUIVO // PLÊIADES**

Aqui pode ocorrer a consolidação da primeira grande descoberta:

```text
PLÊIADES
```

Ao completar:

```text
✓ FRAGMENTO RECUPERADO
✓ CONSTELAÇÃO IDENTIFICADA
✓ REFERÊNCIA EXTERNA CONFIRMADA
```

a interface revela:

```text
ARQUIVO 1987 // ENCERRADO

Um novo registro foi encontrado.

USUÁRIO: ______
```

Isso prepara o próximo arco.

---

# 8. Aulas 06–08 — INTERCEPTAÇÃO // NÓ

Aqui eu mudaria novamente a identidade.

Sai o observatório.

Entra:

```text
INTERCEPTAÇÃO // NÓ 04
```

Visual:

* preto;
* cinza;
* verde/azul elétrico;
* indicadores de conexão;
* timestamps;
* pacotes;
* logs;
* sessões;
* terminais;
* mensagens interrompidas.

A sensação passa a ser:

> “Estamos entrando no sistema.”

Isso também prepara naturalmente os **usuários reais** do jogo.

---

# 9. Os usuários devem ser contas reais

Essa parte da sua ideia é muito melhor do que simplesmente colocar `us1`, `us2`, `us3` como registros.

Eu criaria uma tabela real:

```text
usuarios
```

com:

```text
id
username
password_hash
nome
grupo_id
status
criado_em
```

Por exemplo:

```text
ID   LOGIN   GRUPO
1    us1     1
2    us2     1
3    us3     1

4    us4     2
5    us5     2
6    us6     2

0    us0     NULL
```

O `us0` existe de verdade, mas é:

```text
SECRET = TRUE
VISIBLE = FALSE
```

Ou equivalente.

A senha deve ser armazenada como hash, mesmo sendo uma aplicação acadêmica.

---

# 10. Cada aluno tem sua própria identidade

O sistema passa a saber:

```text
ALUNO
↓
LOGIN
↓
USUÁRIO
↓
GRUPO
↓
PROGRESSO INDIVIDUAL
```

Assim você consegue separar duas coisas que são importantes:

**pontuação individual**

e

**competição de grupo**.

Exemplo:

```text
Abner
login: us2
grupo: 1
progresso: 68%
```

Enquanto:

```text
grupo 1
us1
us2
us3
```

é a equipe.

---

# 11. Os logs são o coração do ARG

Eu criaria uma estrutura mais ou menos assim:

```text
logs
----
id
usuario_id
data_hora
tipo
origem
destino
referencia
mensagem
```

Mas o segredo é:

**cada usuário possui apenas uma parte da informação.**

Por exemplo:

### US1

```text
22:14:03
SESSION-81
DESTINO: NODE-04
```

### US2

```text
22:16:27
DEVICE-17
SESSION: SESSION-81
```

### US3

```text
22:20:11
DEVICE-17
OWNER: UNKNOWN
```

Nenhum usuário possui a resposta.

Mas cruzando os três:

```text
SESSION-81
     ↓
DEVICE-17
     ↓
UNKNOWN
```

O aluno começa a perceber que existe alguém escondido atrás dos registros.

---

# 12. Grupo 1 e grupo 2 precisam ter investigações paralelas

Isso é importante para evitar que um grupo simplesmente copie o outro.

### Grupo 1

```text
us1
us2
us3
```

possui:

```text
SESSION-81
DEVICE-17
NODE-04
```

### Grupo 2

```text
us4
us5
us6
```

possui:

```text
SESSION-42
DEVICE-09
NODE-07
```

A estrutura lógica é a mesma.

Os valores são diferentes.

Assim:

```text
Grupo 1 → precisa cruzar 3 usuários
Grupo 2 → precisa cruzar 3 usuários
```

Mas ambos chegam à mesma entidade escondida:

```text
US0
```

Isso torna a competição justa.

---

# 13. O usuário secreto US0

O `us0` deve ser uma conta real, mas **não deve aparecer na listagem normal de usuários**.

O grupo só descobre a existência dele através dos logs.

Por exemplo:

```text
USER_ID: 00
STATUS: UNKNOWN
```

Depois:

```text
USER_ID: 0
```

Finalmente:

```text
us0
```

Nesse momento o sistema começa a fazer sentido.

O aluno informa:

```text
US0
```

em:

```text
PROTOCOLO FINAL
// IDENTIFICAÇÃO
```

e recebe:

> **Identidade reconhecida. Um registro adicional foi liberado.**

---

# 14. A dica do US0 não deve entregar a resposta

Eu criaria uma tabela de dicas:

```text
dicas_secretas
---------------
id
grupo_id
codigo
mensagem
```

Para um grupo:

> **Nem todos os registros precisam ser lidos na ordem em que foram encontrados.**

Para o outro:

> **A última informação pode não estar no banco. Procure onde os registros apontam.**

As dicas devem **diminuir o espaço de busca**, mas não resolver o mistério.

---

# 15. Pistas escondidas nos slides

Essa parte tem bastante potencial.

Cada PDF/aula pode conter **uma pista pequena que não é necessária para acompanhar a aula**, mas que passa a fazer sentido no ARG.

Por exemplo, no canto de um slide:

```text
03 / 06 / 01
```

Ou:

```text
NODE-07
```

Ou até uma pequena sequência:

```text
4F 52 49 4F 4E
```

Durante a aula parece decoração.

No exercício final, torna-se importante.

Isso cria a sensação de:

> “Eu deveria ter prestado atenção nisso.”

E isso é exatamente o tipo de recompensa que funciona bem em ARG.

---

# 16. Como fazer o desbloqueio das aulas

Eu recomendo separar **desafio de aprendizagem** de **avaliação**.

Cada aula terá um pequeno desafio obrigatório.

Exemplo:

```text
AULA 03
↓
MINIDESAFIO 03
↓
✓ concluído
↓
PDF AULA 04 liberado
```

Por outro lado, existem apenas cinco **marcos avaliativos**:

```text
EXERCÍCIO 01 = 15%
EXERCÍCIO 02 = 15%
EXERCÍCIO 03 = 15%
EXERCÍCIO 04 = 15%
EXERCÍCIO 05 = 40%
```

Total:

```text
100%
```

Isso resolve a diferença entre **9 aulas** e **5 atividades avaliativas**.

---

# 17. Distribuição que eu sugiro

| Avaliação    | Aulas envolvidas | Peso | Narrativa                  |
| ------------ | ---------------: | ---: | -------------------------- |
| Exercício 01 |            01–02 |  15% | Arquivo / ORION            |
| Exercício 02 |            03–04 |  15% | Observatório               |
| Exercício 03 |            05–06 |  15% | Plêiades → novos registros |
| Exercício 04 |            07–08 |  15% | Usuários / logs / US0      |
| Exercício 05 |               09 |  40% | ARG final / 3301           |

Assim você mantém exatamente os pesos que definiu.

E o **Exercício 05 exige 60% acumulados**.

Como os quatro exercícios anteriores somam exatamente 60%, na prática o aluno precisa concluir os quatro marcos anteriores integralmente para entrar na avaliação final.

---

# 18. Código de desbloqueio da Aula 09

Aqui o `3301` entra perfeitamente.

Ele já aparece em vários lugares da aplicação desde o começo.

Porém, até esse momento, os alunos podem achar que é apenas:

```text
ARQUIVO // 3301
```

Na Aula 09:

```text
ACESSO RESTRITO

NÍVEL: FINAL
PONTUAÇÃO MÍNIMA: 60%

PROTOCOLO:
> _
```

Entrada:

```text
3301
```

Então:

```text
ACCESS GRANTED

OPERAÇÃO 3301
```

A escolha é coerente com a história, porque Cicada 3301 é conhecida pelos conjuntos de puzzles publicados online entre 2012 e 2014, envolvendo criptografia, esteganografia e anonimato na internet. ([Wikipedia][3])

---

# 19. Aula 09 — OPERAÇÃO 3301

Essa deve ser visualmente completamente diferente.

Não seria mais:

```text
ARQUIVO
```

nem:

```text
OBSERVATÓRIO
```

Seria:

```text
OPERAÇÃO // 3301
```

A tela poderia possuir:

```text
┌─────────────────────────────────────────┐
│       OPERAÇÃO // 3301                  │
│                                         │
│  GRUPO 01              GRUPO 02         │
│  ● ● ●                 ● ● ●            │
│                                         │
│  STATUS: INVESTIGAÇÃO ATIVA             │
│                                         │
│  TEMPO: --:--:--                        │
└─────────────────────────────────────────┘
```

A aparência pode remeter a uma central de investigação, não necessariamente a um “hacker terminal”.

---

# 20. Estrutura do ARG final

Eu faria o exercício final ter aproximadamente esta cadeia:

```text
LOGIN INDIVIDUAL
       ↓
LIBERAÇÃO DA AULA 09
       ↓
CÓDIGO 3301
       ↓
ENTRADA NA OPERAÇÃO
       ↓
GRUPO 1 / GRUPO 2
       ↓
CADA GRUPO RECEBE 3 USUÁRIOS
       ↓
CADA USUÁRIO POSSUI FRAGMENTOS
       ↓
JOIN DOS REGISTROS
       ↓
IDENTIFICAÇÃO DO US0
       ↓
CÓDIGO US0
       ↓
DICA EXTRA
       ↓
PISTA ESCONDIDA NOS SLIDES
       ↓
CRUZAMENTO FINAL
       ↓
RESPOSTA
```

Isso faz o SQL permanecer essencial até o final.

Não vira simplesmente um caça ao tesouro externo.

---

# 21. O SQL continua sendo a ferramenta principal

Isso é crucial para o objetivo pedagógico.

O aluno pode descobrir uma pista externamente, mas **a informação que leva até ela deve vir do banco**.

Por exemplo:

```sql
SELECT ...
FROM logs l
JOIN usuarios u
    ON ...
JOIN dispositivos d
    ON ...
WHERE ...
```

O objetivo não é:

> “descubra alguma coisa na internet.”

O objetivo é:

> **“Use SQL para descobrir onde está a próxima informação.”**

Isso mantém o jogo alinhado com a disciplina.

---

# 22. Sobre os exercícios

Uma regra que eu colocaria no projeto:

> **Nenhuma etapa narrativa pode ser resolvida corretamente sem utilizar o conteúdo da aula vigente.**

Assim:

### Aula 03

O desafio usa os comandos ensinados na Aula 03.

### Aula 04

O desafio aumenta a complexidade e utiliza os conceitos da Aula 04.

### Aula 05

Integra os conteúdos anteriores.

E assim sucessivamente.

Na avaliação final, os conceitos das **Aulas 01–09** aparecem combinados.

Isso é muito melhor pedagogicamente do que colocar nove exercícios completamente independentes.

---

# 23. O papel das referências que você coletou

Eu não usaria todas as referências diretamente.

Algumas devem ser **pistas visíveis**.

Outras devem funcionar como **pistas de ambientação**.

E algumas podem ser reservadas para o ARG final.

Eu separaria assim:

### Camada 1 — explícita

```text
Ford Orion
1987
```

O aluno já conhece.

### Camada 2 — investigativa

```text
Órion
Subaru
Plêiades
```

O aluno precisa descobrir a ligação.

### Camada 3 — ambiental

```text
mapas celestes
vídeos
imagens
datas
terminais
```

Servem para enriquecer o universo.

### Camada 4 — ARG

```text
Cicada 3301
3301
usuário secreto
logs
mensagens
pistas dos slides
```

Essa camada só deve ficar realmente evidente perto da Aula 09.

---

# 24. O que eu evitaria

Eu evitaria que o aluno precisasse simplesmente pesquisar:

> “Subaru logo significa o quê?”

Isso mataria a investigação.

A informação precisa aparecer porque o SQL entregou a imagem.

Da mesma forma, eu evitaria colocar:

```text
US0
```

explicitamente em algum lugar.

O aluno deve chegar a:

```text
0
```

por meio dos registros e deduzir que existe um usuário oculto.

E também não colocaria:

```text
CICADA 3301
```

em destaque antes da hora.

O `3301` pode continuar espalhado pela aplicação, mas **sem explicar por que ele está lá**.

---

# 25. O fio narrativo completo

A história poderia ficar assim:

```text
1987
 │
 ├── Ford Orion
 │       │
 │       └── ORION
 │
 └── Órion
         │
         └── estrelas
                │
                └── seis estrelas
                       │
                       └── Subaru
                              │
                              └── Plêiades
                                     │
                                     └── novo arquivo
                                            │
                                            └── usuários
                                                   │
                                                   └── logs
                                                          │
                                                          └── US0
                                                                 │
                                                                 └── pista
                                                                       │
                                                                       └── 3301
                                                                             │
                                                                             └── ARG FINAL
```

E isso permite que uma resposta já descoberta pelo aluno seja reutilizada depois.

**ORION não muda.**

Ele apenas ganha significado novo.

**PLÊIADES** agora é resposta exclusiva da fase 05. A fase 03 pede **SUBARU**, e a fase 07 identifica o setor **N-06**; os códigos são sustentados por evidências diferentes.

---

# 26. Estado final que eu recomendaria para o sistema

O backend deveria passar a ter essencialmente estes conceitos:

```text
alunos
usuarios
grupos
aulas
exercicios
progresso
logs
pistas
recursos_externos
submissoes
```

E o progresso separado em:

```text
PROGRESSO INDIVIDUAL
        +
PROGRESSO DO GRUPO
        +
ESTADO DO ARG
```

Isso deixa o sistema preparado para a Aula 09 sem precisar criar uma solução improvisada especificamente para a competição.

---

## A visão que considero mais forte

A grande mudança que eu faria daqui para frente é esta:

> **As fases deixam de ser apenas “níveis de SQL” e passam a ser capítulos de uma investigação.**

O SQL continua sendo o mecanismo obrigatório para avançar, mas a narrativa fornece um motivo para executar cada consulta.

E a sequência:

**ORION → Subaru → Plêiades → usuários → US0 → 3301**

é suficientemente coerente para servir como a espinha dorsal do curso.

A ferramenta Canva permitiu consultar o texto das nove apresentações. A matriz de alinhamento registra o que foi extraído e as lacunas curriculares. Como as miniaturas foram bloqueadas no navegador e as notas do apresentador vieram vazias, imagens, layout e pistas visuais ainda precisam de inspeção. O plano da turma preserva o progresso e relaciona a liberação das Fases 05–09 aos conteúdos das apresentações; atividades posteriores à Aula 09 permanecem para definição.

[1]: https://en.wikipedia.org/wiki/Ford_Orion?utm_source=chatgpt.com "Ford Orion"
[2]: https://contactus.subaru.com/knowledgebase/article/1000017/en-us?utm_source=chatgpt.com "What does your logo mean?  · Customer Self-Service"
[3]: https://en.wikipedia.org/wiki/Cicada_3301?utm_source=chatgpt.com "Cicada 3301"

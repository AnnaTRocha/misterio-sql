# Arquivo SQL — O Notebook Desaparecido

Projeto de investigação SQL para iniciantes.

## Estrutura

```text
misterio-sql/
├── index.html
├── assets/
│   └── style.css
├── js/
│   └── app.js
└── data/
    └── caso.sqlite
```

## Como executar

O banco é carregado via `fetch()`, então a página deve ser aberta por um servidor HTTP local.

### Opção 1 — VS Code

Instale a extensão **Live Server** e abra `index.html` com **Open with Live Server**.

### Opção 2 — Python

Abra um terminal na pasta do projeto e execute:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

## Segurança da resposta

A resposta correta não é armazenada como texto no HTML ou JavaScript.

A tela de acusação compara o SHA-256 do nome digitado com um hash previamente armazenado.

O banco também fica em um arquivo SQLite binário separado, em vez de aparecer como comandos `INSERT` dentro do HTML.

### Limitação importante

Como este é um projeto 100% client-side, não existe segredo absolutamente inacessível ao usuário.
Uma pessoa com conhecimento técnico ainda pode baixar o arquivo SQLite e analisar seus dados — o que, neste exercício, equivale a consultar o próprio banco.

Se a resposta precisar ser realmente protegida, a validação deve ser movida para um backend/API.

import { readFileSync } from 'node:fs';
import initSqlJs from 'sql.js/dist/sql-asm.js';

const seed = readFileSync(new URL('./marketplace.sql', import.meta.url), 'utf8');
const engine = initSqlJs();
// A ordem das colunas é parte do enunciado; aliases não são exigidos.
export const QUESTIONS = [
  ['Liste o nome e a cidade de todos os clientes.', 'SELECT nome, cidade FROM clientes'],
  ['Retorne as categorias distintas dos produtos.', 'SELECT DISTINCT categoria FROM produtos'],
  ['Retorne nome e preço dos produtos da categoria Eletrônicos com preço entre 80 e 150, inclusive.', "SELECT nome, preco FROM produtos WHERE categoria='Eletrônicos' AND preco BETWEEN 80 AND 150"],
  ['Retorne nome e cidade dos clientes cujo nome começa com A.', "SELECT nome, cidade FROM clientes WHERE nome LIKE 'A%'"],
  ['Retorne nome e preço dos produtos, do maior para o menor preço.', 'SELECT nome, preco FROM produtos ORDER BY preco DESC', true],
  ['Quantos pedidos estão com status entregue? Retorne apenas a quantidade.', "SELECT COUNT(*) FROM pedidos WHERE status='entregue'"],
  ['Retorne a cidade e a quantidade de clientes de cada cidade.', 'SELECT cidade, COUNT(*) FROM clientes GROUP BY cidade'],
  ['Retorne o número do pedido e o nome do cliente para todos os pedidos.', 'SELECT p.id_pedido, c.nome FROM pedidos p JOIN clientes c ON c.id_cliente=p.id_cliente'],
  ['Retorne o nome dos clientes que não possuem pedidos.', 'SELECT c.nome FROM clientes c LEFT JOIN pedidos p ON p.id_cliente=c.id_cliente WHERE p.id_pedido IS NULL'],
  ['Para cada pedido entregue, retorne seu número e o valor total dos itens, calculado pela quantidade multiplicada pelo preço unitário.', "SELECT p.id_pedido, SUM(i.quantidade*i.preco_unitario) FROM pedidos p JOIN itens_pedido i ON i.id_pedido=p.id_pedido WHERE p.status='entregue' GROUP BY p.id_pedido"],
  ['Retorne nome e preço dos produtos com preço acima da média de todos os produtos.', 'SELECT nome, preco FROM produtos WHERE preco > (SELECT AVG(preco) FROM produtos)'],
  ['Retorne o nome do vendedor e a quantidade de produtos cadastrados por ele, apenas para vendedores com mais de um produto.', 'SELECT v.nome, COUNT(*) FROM vendedores v JOIN produtos p ON p.id_vendedor=v.id_vendedor GROUP BY v.id_vendedor, v.nome HAVING COUNT(*) > 1']
];
export const SCHEMA = [
  'clientes(id_cliente, nome, cidade)', 'vendedores(id_vendedor, nome)',
  'produtos(id_produto, nome, categoria, preco, id_vendedor)',
  'pedidos(id_pedido, id_cliente, data_pedido, status)',
  'itens_pedido(id_item_pedido, id_pedido, id_produto, quantidade, preco_unitario)'
];
function readQuery(query) {
  const cleaned = String(query || '').trim().replace(/;\s*$/, '');
  if (cleaned.length > 5000 || !/^(SELECT|WITH)\b/i.test(cleaned) || /;|--|\/\*|\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM)\b/i.test(cleaned)) throw new Error('Use uma única consulta SELECT ou WITH de até 5000 caracteres.');
  return cleaned;
}
export async function previewMarketplace(query) {
  const cleaned = readQuery(query);
  const SQL = await engine;
  const db = new SQL.Database();
  try {
    db.run(seed);
    const result = db.exec(cleaned);
    return result.map(set => ({ columns: set.columns, values: set.values.slice(0, 100) }));
  } finally { db.close(); }
}
export async function gradeAssessment(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length || answers.some(a => typeof a !== 'string' || a.length > 5000)) throw new Error('Envie uma consulta de até 5000 caracteres para cada questão.');
  const SQL = await engine;
  const db = new SQL.Database();
  try {
    db.run(seed);
    const correct = QUESTIONS.map(([, reference, ordered], index) => {
      try {
        const query = readQuery(answers[index]);
        const actual = db.exec(query);
        const expected = db.exec(reference);
        if (actual.length !== 1 || actual[0].columns.length !== expected[0].columns.length) return false;
        const normalize = rows => rows.map(row => JSON.stringify(row));
        const a = normalize(actual[0].values), b = normalize(expected[0].values);
        if (!ordered) { a.sort(); b.sort(); }
        return JSON.stringify(a) === JSON.stringify(b);
      } catch { return false; }
    });
    return { correct, score: Math.round(correct.filter(Boolean).length / QUESTIONS.length * 10000) / 100 };
  } finally { db.close(); }
}

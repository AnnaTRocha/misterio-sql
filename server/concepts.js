export const CONCEPTS = {
  1: {
    prompt: 'Em mensagens, remetente_id aponta para usuarios.id. Que papel ele cumpre?',
    options: [
      ['indice', 'Um índice que ordena os remetentes.'],
      ['chave_estrangeira', 'Uma chave estrangeira que relaciona as tabelas.'],
      ['chave_primaria', 'Uma segunda chave primária da tabela usuarios.']
    ],
    answer: 'chave_estrangeira',
    feedback: 'Revise a relação entre a chave da tabela de origem e a referência em outra tabela.'
  },
  2: {
    prompt: 'O telefone de uma pessoa se repete em cada observação feita por ela. Qual mudança evita essa dependência na 3ª forma normal?',
    options: [
      ['listas', 'Guardar todos os telefones numa lista dentro da observação.'],
      ['ordenacao', 'Ordenar as observações pelo telefone antes de consultar.'],
      ['sem_dependencia_transitiva', 'Separar os dados da pessoa e referenciá-la nas observações.']
    ],
    answer: 'sem_dependencia_transitiva',
    feedback: 'Pense no que acontece ao corrigir um telefone armazenado em várias linhas.'
  },
  3: {
    prompt: 'Uma observação deve sempre apontar para um setor existente. Qual restrição expressa essa regra na criação da tabela?',
    options: [
      ['not_null', 'Apenas NOT NULL em setor_id.'],
      ['foreign_key', 'FOREIGN KEY em setor_id referenciando setores(id).'],
      ['unique', 'UNIQUE em setor_id.']
    ],
    answer: 'foreign_key',
    feedback: 'A restrição precisa verificar a existência do registro em outra tabela.'
  },
  4: {
    prompt: 'É preciso adicionar uma coluna sem perder as linhas do catálogo. Qual comando atende a isso?',
    options: [
      ['drop', 'DROP TABLE seguido da criação de outra tabela.'],
      ['truncate', 'TRUNCATE TABLE no catálogo.'],
      ['alter', 'ALTER TABLE com ADD COLUMN.']
    ],
    answer: 'alter',
    feedback: 'Compare alterar a estrutura com apagar dados ou apagar a tabela.'
  },
  5: {
    prompt: 'Uma correção foi feita dentro de uma transação, mas está errada e ainda não recebeu COMMIT. O que desfaz a alteração?',
    options: [
      ['rollback', 'ROLLBACK.'],
      ['commit', 'COMMIT.'],
      ['delete', 'DELETE sem condição.']
    ],
    answer: 'rollback',
    feedback: 'Procure o comando que volta ao estado anterior à transação.'
  },
  6: {
    prompt: 'Você quer contar acessos por ano, mas considerar apenas registros válidos. Onde filtra as linhas antes do GROUP BY?',
    options: [
      ['order', 'ORDER BY status.'],
      ['where', 'WHERE status = ...'],
      ['having', 'HAVING status = ... após o agrupamento.']
    ],
    answer: 'where',
    feedback: 'Uma cláusula filtra linhas de entrada; outra filtra grupos já formados.'
  },
  7: {
    prompt: 'Qual junção mantém também os objetos que nunca tiveram acesso registrado?',
    options: [
      ['inner', 'INNER JOIN a partir de objetos.'],
      ['cross', 'CROSS JOIN entre objetos e acessos.'],
      ['left', 'LEFT JOIN a partir de objetos.']
    ],
    answer: 'left',
    feedback: 'A tabela que precisa aparecer por completo deve ficar do lado preservado da junção.'
  },
  8: {
    prompt: 'Você precisa numerar registros reiniciando a contagem para cada equipe, sem resumir as linhas. Qual recurso usa?',
    options: [
      ['group', 'GROUP BY equipe com COUNT(*).'],
      ['window', 'ROW_NUMBER() OVER (PARTITION BY equipe ...).'],
      ['distinct', 'SELECT DISTINCT equipe.']
    ],
    answer: 'window',
    feedback: 'A resposta mantém cada linha e calcula uma posição dentro da equipe.'
  },
  9: {
    prompt: 'No MongoDB, qual método consulta documentos de uma coleção?',
    options: [
      ['insertOne', 'insertOne'],
      ['find', 'find'],
      ['updateOne', 'updateOne']
    ],
    answer: 'find',
    feedback: 'Pense no método usado para buscar, sem alterar documentos.'
  }
};

export function publicConcept(phaseId) {
  const { prompt, options } = CONCEPTS[phaseId] || {};
  return prompt ? { prompt, options } : null;
}

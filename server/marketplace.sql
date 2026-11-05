PRAGMA foreign_keys=ON;
CREATE TABLE clientes (id_cliente INTEGER CONSTRAINT pk_clientes PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT NOT NULL);
CREATE TABLE vendedores (id_vendedor INTEGER CONSTRAINT pk_vendedores PRIMARY KEY, nome TEXT NOT NULL);
CREATE TABLE produtos (id_produto INTEGER CONSTRAINT pk_produtos PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, preco REAL NOT NULL, vendedor_id INTEGER NOT NULL CONSTRAINT fk_produtos_vendedor_id REFERENCES vendedores(id_vendedor));
CREATE TABLE pedidos (id_pedido INTEGER CONSTRAINT pk_pedidos PRIMARY KEY, cliente_id INTEGER NOT NULL CONSTRAINT fk_pedidos_cliente_id REFERENCES clientes(id_cliente), data_pedido TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE itens_pedido (id_item_pedido INTEGER CONSTRAINT pk_itens_pedido PRIMARY KEY, pedido_id INTEGER NOT NULL CONSTRAINT fk_itens_pedido_pedido_id REFERENCES pedidos(id_pedido), produto_id INTEGER NOT NULL CONSTRAINT fk_itens_pedido_produto_id REFERENCES produtos(id_produto), quantidade INTEGER NOT NULL, preco_unitario REAL NOT NULL);
INSERT INTO clientes VALUES (1,'Ana','Orleans'),(2,'Bruno','Tubarão'),(3,'Carla','Orleans'),(4,'Daniel','Criciúma'),(5,'Eva','Tubarão');
INSERT INTO vendedores VALUES (1,'Loja Norte'),(2,'Casa Digital'),(3,'Papelaria Sul');
INSERT INTO produtos VALUES (1,'Mouse','Eletrônicos',80,2),(2,'Teclado','Eletrônicos',150,2),(3,'Caderno','Papelaria',25,3),(4,'Caneta','Papelaria',5,3),(5,'Mochila','Acessórios',120,1),(6,'Fone','Eletrônicos',200,1);
INSERT INTO pedidos VALUES (1,1,'2025-03-01','entregue'),(2,2,'2025-03-02','entregue'),(3,1,'2025-03-05','cancelado'),(4,3,'2025-03-10','entregue'),(5,4,'2025-04-01','pendente'),(6,2,'2025-04-02','entregue');
INSERT INTO itens_pedido VALUES (1,1,1,2,80),(2,1,3,1,25),(3,2,2,1,150),(4,3,5,1,120),(5,4,4,4,5),(6,4,3,2,25),(7,5,6,1,200),(8,6,1,1,80),(9,6,5,1,120);

-- Atributos adicionais fornecem contexto sem alterar os dados das questões.
ALTER TABLE clientes ADD COLUMN email TEXT;
ALTER TABLE clientes ADD COLUMN telefone TEXT;
ALTER TABLE clientes ADD COLUMN data_cadastro TEXT;
UPDATE clientes SET email = CASE id_cliente WHEN 1 THEN 'ana@example.com' WHEN 2 THEN 'bruno@example.com' WHEN 3 THEN 'carla@example.com' WHEN 4 THEN 'daniel@example.com' ELSE 'eva@example.com' END,
  telefone = CASE id_cliente WHEN 1 THEN '48911110001' WHEN 2 THEN '48911110002' WHEN 3 THEN '48911110003' WHEN 4 THEN '48911110004' ELSE '48911110005' END,
  data_cadastro = CASE id_cliente WHEN 1 THEN '2024-01-12' WHEN 2 THEN '2024-03-08' WHEN 3 THEN '2024-06-20' WHEN 4 THEN '2025-01-15' ELSE '2025-02-01' END;
ALTER TABLE vendedores ADD COLUMN email TEXT;
ALTER TABLE vendedores ADD COLUMN cidade TEXT;
ALTER TABLE vendedores ADD COLUMN data_cadastro TEXT;
UPDATE vendedores SET email = CASE id_vendedor WHEN 1 THEN 'contato@norte.example' WHEN 2 THEN 'contato@digital.example' ELSE 'contato@sul.example' END,
  cidade = CASE id_vendedor WHEN 1 THEN 'Orleans' WHEN 2 THEN 'Tubarão' ELSE 'Criciúma' END,
  data_cadastro = CASE id_vendedor WHEN 1 THEN '2023-05-10' WHEN 2 THEN '2023-07-20' ELSE '2024-02-12' END;
ALTER TABLE produtos ADD COLUMN descricao TEXT;
ALTER TABLE produtos ADD COLUMN estoque INTEGER;
ALTER TABLE produtos ADD COLUMN ativo INTEGER;
UPDATE produtos SET descricao = CASE id_produto WHEN 1 THEN 'Mouse sem fio' WHEN 2 THEN 'Teclado USB' WHEN 3 THEN 'Caderno de 100 folhas' WHEN 4 THEN 'Caneta azul' WHEN 5 THEN 'Mochila escolar' ELSE 'Fone com microfone' END,
  estoque = CASE id_produto WHEN 1 THEN 15 WHEN 2 THEN 8 WHEN 3 THEN 40 WHEN 4 THEN 100 WHEN 5 THEN 12 ELSE 0 END,
  ativo = CASE WHEN id_produto = 6 THEN 0 ELSE 1 END;
ALTER TABLE pedidos ADD COLUMN forma_pagamento TEXT;
ALTER TABLE pedidos ADD COLUMN valor_frete REAL;
UPDATE pedidos SET forma_pagamento = CASE id_pedido WHEN 1 THEN 'pix' WHEN 2 THEN 'cartao' WHEN 3 THEN 'pix' WHEN 4 THEN 'boleto' WHEN 5 THEN 'cartao' ELSE 'pix' END,
  valor_frete = CASE id_pedido WHEN 1 THEN 12.50 WHEN 2 THEN 15 WHEN 3 THEN 10 WHEN 4 THEN 8 ELSE 20 END;
ALTER TABLE itens_pedido ADD COLUMN desconto REAL;
UPDATE itens_pedido SET desconto = CASE id_item_pedido WHEN 1 THEN 5 WHEN 3 THEN 10 ELSE 0 END;

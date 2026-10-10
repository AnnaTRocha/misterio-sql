PRAGMA foreign_keys=ON;

CREATE TABLE objetos_celestes (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  ano INTEGER NOT NULL,
  setor TEXT NOT NULL
);
INSERT INTO objetos_celestes VALUES
  (1,'ORION','constelacao',1987,'N-04'),
  (2,'ALDEBARAN','estrela',1986,'N-04'),
  (3,'PLEIADES','aglomerado',1987,'N-06'),
  (4,'SIRIUS','estrela',1988,'S-02'),
  (5,'ORION-B','constelacao',1987,'N-04');

CREATE TABLE catalogo_bruto (
  id INTEGER PRIMARY KEY,
  objeto TEXT NOT NULL,
  observador TEXT NOT NULL,
  telefone TEXT NOT NULL,
  observatorio TEXT NOT NULL
);
INSERT INTO catalogo_bruto VALUES
  (1,'ORION','LIA','4801','NORTE'),
  (2,'PLEIADES','LIA','4801','NORTE'),
  (3,'SIRIUS','NOAH','4802','SUL');

CREATE TABLE simbolos (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  estrelas INTEGER NOT NULL,
  status TEXT NOT NULL
);
INSERT INTO simbolos VALUES
  (1,'MARCA FALSA',5,'ativo'),
  (2,'SUBARU',6,'pendente');

CREATE TABLE acessos_celestes (
  id INTEGER PRIMARY KEY,
  usuario TEXT NOT NULL,
  objeto_id INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY(objeto_id) REFERENCES objetos_celestes(id)
);
INSERT INTO acessos_celestes VALUES
  (1,'us1',1,1987,'valido'),
  (2,'us2',3,1987,'valido'),
  (3,'us3',2,1986,'ruido'),
  (4,'us4',1,1987,'valido'),
  (5,'us5',3,1987,'valido'),
  (6,'us6',4,1988,'ruido'),
  (7,'us1',3,1987,'valido'),
  (8,'us4',3,1987,'valido');

CREATE TABLE investigacoes (
  id INTEGER PRIMARY KEY,
  equipe INTEGER NOT NULL,
  apelido TEXT NOT NULL,
  sessao TEXT NOT NULL,
  dispositivo TEXT,
  dono_codigo INTEGER,
  fragmento TEXT NOT NULL
);
INSERT INTO investigacoes VALUES
  (1,1,'us1','S-81',NULL,NULL,'3301'),
  (2,1,'us2','S-81','D-17',NULL,'NORTE'),
  (3,1,'us3','S-81','D-17',0,'PLEIADES'),
  (4,2,'us4','S-42',NULL,NULL,'3301'),
  (5,2,'us5','S-42','D-09',NULL,'SUL'),
  (6,2,'us6','S-42','D-09',0,'PLEIADES');

CREATE TABLE sessoes_arg (grupo INTEGER, usuario TEXT, sessao TEXT);
CREATE TABLE dispositivos_arg (grupo INTEGER, usuario TEXT, sessao TEXT, dispositivo TEXT);
CREATE TABLE identidades_arg (grupo INTEGER, usuario TEXT, dispositivo TEXT, codigo INTEGER);
INSERT INTO sessoes_arg VALUES (1,'us1','S-81'),(2,'us4','S-42');
INSERT INTO dispositivos_arg VALUES (1,'us2','S-81','D-17'),(2,'us5','S-42','D-09');
INSERT INTO identidades_arg VALUES (1,'us3','D-17',0),(2,'us6','D-09',0);

-- Fase 3: evidências preservadas da investigação O Aglomerado.
CREATE TABLE evidencias (id INTEGER PRIMARY KEY, codigo TEXT NOT NULL, descricao TEXT NOT NULL);
CREATE TABLE recursos (id INTEGER PRIMARY KEY, tipo TEXT NOT NULL, endereco TEXT, status TEXT NOT NULL);
CREATE TABLE referencias (
  id INTEGER PRIMARY KEY,
  evidencia_id INTEGER NOT NULL REFERENCES evidencias(id),
  recurso_id INTEGER REFERENCES recursos(id)
);
INSERT INTO evidencias VALUES
  (1,'ORION-1987','A resposta anterior não era um destino. Classificação associada: constelação.'),
  (2,'SEIS-ESTRELAS','Símbolo externo identificado em um registro relacionado a seis estrelas.'),
  (3,'FRAGMENTO-C','Arquivo sem relevância'),
  (4,'FRAGMENTO-D','Evidência sem referência registrada');
INSERT INTO recursos VALUES
  (2,'texto','/arquivo/desconhecido.txt','corrompido'),
  (3,'imagem','/arquivo/fragmento.png','invalido'),
  (7,'imagem','https://1000logos.net/wp-content/uploads/2018/03/Subaru-Logo-1999.jpg','recuperado');
INSERT INTO referencias VALUES (11,1,3),(12,2,7),(13,3,2);

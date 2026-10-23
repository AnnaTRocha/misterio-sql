PRAGMA foreign_keys=ON;

CREATE TABLE objetos_celestes (
  id_objeto_celeste INTEGER CONSTRAINT pk_objetos_celestes PRIMARY KEY,
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

CREATE TABLE registros_catalogo_bruto (
  id_registro_catalogo INTEGER CONSTRAINT pk_registros_catalogo_bruto PRIMARY KEY,
  nome_objeto_celeste TEXT NOT NULL,
  nome_observador TEXT NOT NULL,
  telefone_observador TEXT NOT NULL,
  nome_observatorio TEXT NOT NULL
);
INSERT INTO registros_catalogo_bruto VALUES
  (1,'ORION','LIA','4801','NORTE'),
  (2,'PLEIADES','LIA','4801','NORTE'),
  (3,'SIRIUS','NOAH','4802','SUL');

CREATE TABLE simbolos (
  id_simbolo INTEGER CONSTRAINT pk_simbolos PRIMARY KEY,
  nome TEXT NOT NULL,
  estrelas INTEGER NOT NULL,
  status TEXT NOT NULL
);
INSERT INTO simbolos VALUES
  (1,'MARCA FALSA',5,'ativo'),
  (2,'SUBARU',6,'pendente');

CREATE TABLE fontes_externas (
  id_fonte_externa INTEGER CONSTRAINT pk_fontes_externas PRIMARY KEY,
  codigo_catalogo TEXT NOT NULL,
  endereco TEXT NOT NULL
);
INSERT INTO fontes_externas VALUES
  (1,'M45','https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-45/');

CREATE TABLE acessos_celestes (
  id_acesso_celeste INTEGER CONSTRAINT pk_acessos_celestes PRIMARY KEY,
  usuario TEXT NOT NULL,
  id_objeto_celeste INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  status TEXT NOT NULL,
  CONSTRAINT fk_acessos_celestes_id_objeto_celeste
    FOREIGN KEY(id_objeto_celeste) REFERENCES objetos_celestes(id_objeto_celeste)
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
  id_investigacao INTEGER CONSTRAINT pk_investigacoes PRIMARY KEY,
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
CREATE TABLE evidencias (id_evidencia INTEGER CONSTRAINT pk_evidencias PRIMARY KEY, codigo TEXT NOT NULL, descricao TEXT NOT NULL);
CREATE TABLE recursos (id_recurso INTEGER CONSTRAINT pk_recursos PRIMARY KEY, tipo TEXT NOT NULL, endereco TEXT, status TEXT NOT NULL);
CREATE TABLE referencias (
  id_referencia INTEGER CONSTRAINT pk_referencias PRIMARY KEY,
  evidencia_id INTEGER NOT NULL CONSTRAINT fk_referencias_evidencia_id REFERENCES evidencias(id_evidencia),
  recurso_id INTEGER CONSTRAINT fk_referencias_recurso_id REFERENCES recursos(id_recurso)
);
INSERT INTO evidencias VALUES
  (1,'ORION-1987','A resposta anterior não era um destino. Classificação associada: constelação.'),
  (2,'SEIS-ESTRELAS','Registro local da marca Subaru, representada por seis estrelas; o recurso gráfico externo é opcional.'),
  (3,'FRAGMENTO-C','Arquivo sem relevância'),
  (4,'FRAGMENTO-D','Evidência sem referência registrada');
INSERT INTO recursos VALUES
  (2,'texto','/arquivo/desconhecido.txt','corrompido'),
  (3,'imagem','/arquivo/fragmento.png','invalido'),
  (7,'imagem','https://1000logos.net/wp-content/uploads/2018/03/Subaru-Logo-1999.jpg','recuperado');
INSERT INTO referencias VALUES (11,1,3),(12,2,7),(13,3,2);

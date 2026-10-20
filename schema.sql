-- KODIE — MVP de doações, estoque e entregas
-- Banco relacional SQLite. O saldo NÃO é armazenado: ele é derivado de movimento_recurso.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuario (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT    NOT NULL,
  papel       TEXT    NOT NULL CHECK (papel IN ('coordenacao', 'voluntario')),
  ativo       INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurso (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nome             TEXT    NOT NULL,
  tipo             TEXT    NOT NULL CHECK (tipo IN ('bem', 'servico')),
  unidade          TEXT    NOT NULL CHECK (unidade IN ('kg', 'un', 'L', 'h', 'sessao')),
  categoria        TEXT,
  controla_estoque INTEGER NOT NULL DEFAULT 1 CHECK (controla_estoque IN (0, 1)),
  estoque_minimo   INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  ativo            INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  observacoes      TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS doador (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT    NOT NULL,
  tipo        TEXT    CHECK (tipo IS NULL OR tipo IN ('PF', 'PJ')),
  contato     TEXT,
  observacoes TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS familia (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo      TEXT    NOT NULL UNIQUE CHECK (codigo GLOB 'F-[0-9][0-9][0-9]'),
  observacoes TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS doacao (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  doador_id      INTEGER NOT NULL REFERENCES doador(id),
  data           TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'Recebida'
                         CHECK (status IN ('Recebida', 'Disponivel', 'Cancelada')),
  responsavel_id INTEGER NOT NULL REFERENCES usuario(id),
  observacoes    TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS doacao_item (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  doacao_id   INTEGER NOT NULL REFERENCES doacao(id) ON DELETE CASCADE,
  recurso_id  INTEGER NOT NULL REFERENCES recurso(id),
  quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
  validade    TEXT,
  observacoes TEXT,
  UNIQUE (doacao_id, recurso_id)
);

CREATE TABLE IF NOT EXISTS entrega (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  familia_id     INTEGER NOT NULL REFERENCES familia(id),
  data           TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'Registrada'
                         CHECK (status IN ('Registrada', 'Entregue', 'Cancelada')),
  responsavel_id INTEGER NOT NULL REFERENCES usuario(id),
  solicitacao_id INTEGER,
  observacoes    TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS entrega_item (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entrega_id  INTEGER NOT NULL REFERENCES entrega(id) ON DELETE CASCADE,
  recurso_id  INTEGER NOT NULL REFERENCES recurso(id),
  quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
  observacoes TEXT,
  UNIQUE (entrega_id, recurso_id)
);

CREATE TABLE IF NOT EXISTS movimento_recurso (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  recurso_id     INTEGER NOT NULL REFERENCES recurso(id),
  tipo_movimento TEXT    NOT NULL
                         CHECK (tipo_movimento IN ('entrada', 'saida', 'ajuste_entrada', 'ajuste_saida')),
  quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
  data           TEXT    NOT NULL,
  doacao_id      INTEGER REFERENCES doacao(id),
  entrega_id     INTEGER REFERENCES entrega(id),
  validade       TEXT,
  responsavel_id INTEGER NOT NULL REFERENCES usuario(id),
  motivo         TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (NOT (doacao_id IS NOT NULL AND entrega_id IS NOT NULL)),
  CHECK (
    (tipo_movimento IN ('entrada', 'saida') AND (doacao_id IS NOT NULL OR entrega_id IS NOT NULL))
    OR
    (tipo_movimento IN ('ajuste_entrada', 'ajuste_saida')
      AND motivo IS NOT NULL AND length(trim(motivo)) > 0
      AND doacao_id IS NULL AND entrega_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS historico_evento (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entidade        TEXT    NOT NULL,
  entidade_id     INTEGER NOT NULL,
  evento          TEXT    NOT NULL,
  status_anterior TEXT,
  status_novo     TEXT,
  ator_id         INTEGER NOT NULL REFERENCES usuario(id),
  data            TEXT    NOT NULL,
  detalhe         TEXT
);

CREATE INDEX IF NOT EXISTS idx_doacao_status ON doacao(status);
CREATE INDEX IF NOT EXISTS idx_doacao_data ON doacao(data);
CREATE INDEX IF NOT EXISTS idx_entrega_status ON entrega(status);
CREATE INDEX IF NOT EXISTS idx_entrega_data ON entrega(data);
CREATE INDEX IF NOT EXISTS idx_movimento_recurso ON movimento_recurso(recurso_id);
CREATE INDEX IF NOT EXISTS idx_movimento_doacao ON movimento_recurso(doacao_id);
CREATE INDEX IF NOT EXISTS idx_movimento_entrega ON movimento_recurso(entrega_id);
CREATE INDEX IF NOT EXISTS idx_historico_entidade ON historico_evento(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_doacao_item_doacao ON doacao_item(doacao_id);
CREATE INDEX IF NOT EXISTS idx_entrega_item_entrega ON entrega_item(entrega_id);

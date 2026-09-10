-- ============================================================
-- LA RIFA GANADORA - Esquema de base de datos (SQLite)
-- Preparado para migrar a PostgreSQL/MySQL sin romper la logica
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Configuracion general de la plataforma (clave/valor, editable sin tocar codigo)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS raffles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'number', -- number | name | code
  number_range_min INTEGER,
  number_range_max INTEGER,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, open, in_progress, finished, cancelled
  start_date TEXT,
  end_date TEXT,
  draw_datetime TEXT,
  winner_message_template TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  value_estimate TEXT,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  assigned_number INTEGER, -- usado en modalidad "number"
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(raffle_id, assigned_number)
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  UNIQUE(raffle_id, code)
);

CREATE TABLE IF NOT EXISTS draws (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  result_value TEXT, -- numero, nombre o codigo generado en esa ronda
  matched_participant_id INTEGER REFERENCES participants(id),
  is_winning_round INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  prize_id INTEGER REFERENCES prizes(id),
  mode TEXT NOT NULL,
  winning_value TEXT, -- numero/nombre/codigo ganador
  draw_datetime TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raffle_id INTEGER REFERENCES raffles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Configuracion inicial por defecto (el admin la puede cambiar despues)
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('platform_name', 'La Rifa Ganadora'),
  ('welcome_title', 'BIENVENIDO A LA RIFA GANADORA'),
  ('welcome_subtitle', '¡Prepárate para ganar!'),
  ('welcome_button_text', 'IR A RIFAR'),
  ('color_primary', '#00c853'),
  ('color_secondary', '#7c3aed'),
  ('color_accent', '#ffd700'),
  ('voice_enabled', 'true'),
  ('voice_rate', '0.85'),
  ('voice_volume', '1'),
  ('countdown_pace_seconds', '1.6'),
  ('sound_enabled', 'true'),
  ('winner_message_template', '¡Felicitaciones {NOMBRE}! Has ganado {PREMIO}. Por favor acércate a reclamar tu premio. Muchas gracias por participar.'),
  ('raffle_prize_name', ''),
  ('raffle_start_date', ''),
  ('raffle_end_date', ''),
  ('raffle_conditions', ''),
  ('raffle_info_visible', 'false');
X  

<?php
declare(strict_types=1);

const APP_DB = __DIR__ . '/data/app.sqlite';
const PROFESSOR_HASH = '$2y$12$lzXEFPngmaLdUe7EpIJ/B.JVbN1pEaRX4yB2UyWwFB0rCmebAWn0u';

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    if (!is_dir(__DIR__ . '/data')) mkdir(__DIR__ . '/data', 0775, true);
    $pdo = new PDO('sqlite:' . APP_DB, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');
    migrate($pdo);
    return $pdo;
}

function migrate(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('teacher','student')),
        must_change_password INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TEXT
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS phases (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        developed INTEGER NOT NULL DEFAULT 0,
        released INTEGER NOT NULL DEFAULT 0,
        reward TEXT
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        phase_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'not_started',
        started_at TEXT,
        completed_at TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        queries_count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, phase_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(phase_id) REFERENCES phases(id) ON DELETE CASCADE
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS student_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        phase_id INTEGER NOT NULL,
        query TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS password_reset_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        UNIQUE(user_id, status),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    $stmt=$pdo->prepare("INSERT OR IGNORE INTO users(username,password,role) VALUES('professor',?,'teacher')");
    $stmt->execute([PROFESSOR_HASH]);

    $phases=[
      [1,'O notebook desaparecido','Investigue o caso atual usando consultas SQL.',1,1,'ARQUIVO-18'],
      [2,'Filtrando evidências','Use WHERE e filtros para reduzir os registros até encontrar evidências úteis.',1,0,'FILTRO-26'],
      [3,'Conectando as evidências','Relacione tabelas usando JOIN e ON para cruzar pessoas, acessos e veículos.',1,0,'CHAVE-JOIN'],
      [4,'Fase 4','Ainda não desenvolvido.',0,0,null],
      [5,'Fase 5','Ainda não desenvolvido.',0,0,null],
      [6,'Fase 6','Ainda não desenvolvido.',0,0,null],
      [7,'Fase 7','Ainda não desenvolvido.',0,0,null],
      [8,'Fase 8','Ainda não desenvolvido.',0,0,null],
    ];
    $stmt=$pdo->prepare('INSERT OR IGNORE INTO phases(id,title,description,developed,released,reward) VALUES(?,?,?,?,?,?)');
    foreach($phases as $p) $stmt->execute($p);
}

function start_session(): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_set_cookie_params(['httponly'=>true,'samesite'=>'Lax','secure'=>!empty($_SERVER['HTTPS'])]);
        session_start();
    }
    if (empty($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(24));
}
function user(): ?array {
    start_session();
    if (empty($_SESSION['user_id'])) return null;
    $s=db()->prepare('SELECT id,username,role,must_change_password FROM users WHERE id=?');
    $s->execute([$_SESSION['user_id']]);
    return $s->fetch() ?: null;
}
function require_user(?string $role=null): array {
    $u=user();
    if (!$u) { header('Location: index.php'); exit; }
    if ($role && $u['role']!==$role) { http_response_code(403); exit('Acesso negado'); }
    return $u;
}
function csrf(): string { start_session(); return $_SESSION['csrf']; }
function verify_csrf(): void {
    start_session();
    $token=$_POST['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
        http_response_code(419); exit('Sessão expirada. Atualize a página.');
    }
}
function h(string $v): string { return htmlspecialchars($v, ENT_QUOTES, 'UTF-8'); }
function ensure_progress(int $userId,int $phaseId): void {
    $s=db()->prepare("INSERT OR IGNORE INTO progress(user_id,phase_id,status) VALUES(?,?,'not_started')");
    $s->execute([$userId,$phaseId]);
}

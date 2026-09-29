<?php
require __DIR__.'/lib.php';
start_session();
if (user()) { header('Location: dashboard.php'); exit; }
$pdo=db(); $error=''; $notice='';
if ($_SERVER['REQUEST_METHOD']==='POST') {
  verify_csrf();
  $action=$_POST['action'] ?? '';
  $username=trim((string)($_POST['username'] ?? ''));
  if ($action==='login') {
    $s=$pdo->prepare('SELECT * FROM users WHERE username=?'); $s->execute([$username]); $u=$s->fetch();
    if ($u && password_verify((string)($_POST['password'] ?? ''),$u['password'])) {
      session_regenerate_id(true); $_SESSION['user_id']=$u['id'];
      $pdo->prepare('UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$u['id']]);
      header('Location: dashboard.php'); exit;
    }
    $error='Login ou senha inválidos.';
  } elseif ($action==='register') {
    $password=(string)($_POST['password'] ?? ''); $confirm=(string)($_POST['confirm'] ?? '');
    if (!preg_match('/^[A-Za-z0-9._-]{3,30}$/',$username)) $error='Use um login de 3 a 30 caracteres (letras, números, ponto, hífen ou _).';
    elseif (strcasecmp($username,'professor')===0) $error='Este login é reservado.';
    elseif (strlen($password)<6) $error='A senha deve ter pelo menos 6 caracteres.';
    elseif ($password!==$confirm) $error='As senhas não conferem.';
    else {
      try {
        $s=$pdo->prepare("INSERT INTO users(username,password,role) VALUES(?,?,'student')");
        $s->execute([$username,password_hash($password,PASSWORD_DEFAULT)]);
        $_SESSION['user_id']=(int)$pdo->lastInsertId(); session_regenerate_id(true);
        header('Location: dashboard.php'); exit;
      } catch(PDOException $e) { $error='Esse login já está em uso.'; }
    }
  } elseif ($action==='reset') {
    $s=$pdo->prepare("SELECT id FROM users WHERE username=? AND role='student'"); $s->execute([$username]); $id=$s->fetchColumn();
    if ($id) {
      $pdo->prepare("DELETE FROM password_reset_requests WHERE user_id=? AND status='pending'")->execute([$id]);
      $pdo->prepare("INSERT INTO password_reset_requests(user_id,status) VALUES(?,'pending')")->execute([$id]);
    }
    $notice='Se o aluno existir, a solicitação foi enviada ao professor.';
  }
}
?>
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arquivo SQL — Acesso</title><link rel="stylesheet" href="assets/style.css"></head>
<body class="auth-page"><div class="noise"></div><main class="auth-shell">
<section class="auth-brand"><span class="brand-mark">18</span><div><span class="eyebrow light">MISTÉRIO SQL</span><h1>Investigue.<br><em>Consulte.</em><br>Descubra.</h1><p>Entre para continuar sua investigação ou crie uma conta de estudante.</p></div></section>
<section class="auth-card">
<h2>Acessar o arquivo</h2>
<?php if($error): ?><div class="form-message error"><?=h($error)?></div><?php endif ?>
<?php if($notice): ?><div class="form-message success"><?=h($notice)?></div><?php endif ?>
<form method="post"><input type="hidden" name="csrf" value="<?=h(csrf())?>"><input type="hidden" name="action" value="login"><label>Login<input name="username" required autocomplete="username"></label><label>Senha<input name="password" type="password" required autocomplete="current-password"></label><button class="primary-btn">Entrar</button></form>
<details><summary>Criar conta de estudante</summary><form method="post"><input type="hidden" name="csrf" value="<?=h(csrf())?>"><input type="hidden" name="action" value="register"><label>Login<input name="username" required></label><label>Senha<input name="password" type="password" required minlength="6"></label><label>Confirmar senha<input name="confirm" type="password" required minlength="6"></label><button class="secondary-btn">Cadastrar</button></form></details>
<details><summary>Esqueci minha senha</summary><form method="post"><input type="hidden" name="csrf" value="<?=h(csrf())?>"><input type="hidden" name="action" value="reset"><label>Seu login<input name="username" required></label><button class="secondary-btn">Solicitar nova senha</button></form></details>
</section></main></body></html>

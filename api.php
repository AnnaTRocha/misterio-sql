<?php
require __DIR__.'/lib.php'; $u=require_user(); verify_csrf(); header('Content-Type: application/json; charset=utf-8');
$pdo=db(); $action=$_POST['action']??'';
function out(array $data,int $code=200): never { http_response_code($code); echo json_encode($data); exit; }
if($u['role']==='student' && $action==='query'){
  $phase=(int)($_POST['phase_id']??0); $sql=trim((string)($_POST['query']??'')); $success=(int)($_POST['success']??0);
  if($phase<1||$phase>3||strlen($sql)>5000) out(['error'=>'Dados inválidos'],422);
  ensure_progress((int)$u['id'],$phase);
  $pdo->prepare('INSERT INTO student_queries(user_id,phase_id,query,success) VALUES(?,?,?,?)')->execute([$u['id'],$phase,$sql,$success]);
  $pdo->prepare("UPDATE progress SET queries_count=queries_count+1, attempts=attempts+CASE WHEN ?=0 THEN 1 ELSE 0 END WHERE user_id=? AND phase_id=?")->execute([$success,$u['id'],$phase]);
  out(['ok'=>true]);
}
if($u['role']==='student' && $action==='complete'){
  $phase=(int)($_POST['phase_id']??0); if($phase<1||$phase>3) out(['error'=>'Fase inválida'],422);
  $pdo->prepare("UPDATE progress SET status='completed',completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP) WHERE user_id=? AND phase_id=?")->execute([$u['id'],$phase]);
  $s=$pdo->prepare('SELECT reward FROM phases WHERE id=?');$s->execute([$phase]); out(['ok'=>true,'reward'=>$s->fetchColumn()]);
}
if($u['role']==='teacher' && $action==='release'){
  $phase=(int)($_POST['phase_id']??0); $released=(int)($_POST['released']??0);
  $pdo->prepare('UPDATE phases SET released=? WHERE id=? AND developed=1')->execute([$released,$phase]); out(['ok'=>true]);
}
if($u['role']==='teacher' && $action==='reset_password'){
  $userId=(int)($_POST['user_id']??0); $password=(string)($_POST['password']??'');
  if(strlen($password)<6) out(['error'=>'A senha temporária precisa ter 6 caracteres.'],422);
  $pdo->prepare("UPDATE users SET password=?,must_change_password=1 WHERE id=? AND role='student'")->execute([password_hash($password,PASSWORD_DEFAULT),$userId]);
  $pdo->prepare("UPDATE password_reset_requests SET status='resolved',resolved_at=CURRENT_TIMESTAMP WHERE user_id=? AND status='pending'")->execute([$userId]);
  out(['ok'=>true]);
}
out(['error'=>'Ação inválida'],400);

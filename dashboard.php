<?php
require __DIR__.'/lib.php'; $u=require_user(); $pdo=db();
if ($u['must_change_password']) { header('Location: change-password.php'); exit; }
if ($u['role']==='teacher') { header('Location: teacher.php'); exit; }
$phases=$pdo->query('SELECT * FROM phases ORDER BY id')->fetchAll();
$s=$pdo->prepare('SELECT * FROM progress WHERE user_id=?'); $s->execute([$u['id']]); $progress=[];
foreach($s as $p) $progress[$p['phase_id']]=$p;
$done=count(array_filter($progress,fn($p)=>$p['status']==='completed'));
?>
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Minhas fases — Mistério SQL</title><link rel="stylesheet" href="assets/style.css"></head><body><div class="noise"></div>
<header class="app-nav"><a class="brand" href="dashboard.php"><span class="brand-mark">18</span><span>ARQUIVO SQL</span></a><div class="nav-user"><span><?=h($u['username'])?></span><a href="logout.php">Sair</a></div></header>
<main class="shell dashboard"><span class="eyebrow">SEU PROGRESSO</span><h1>Casos disponíveis</h1><div class="progress-summary"><strong><?=$done?> / 8</strong><span>fases concluídas</span><div><i style="width:<?=($done/8)*100?>%"></i></div></div>
<div class="phase-grid">
<?php foreach($phases as $p): $pr=$progress[$p['id']]??null; $completed=$pr&&$pr['status']==='completed'; ?>
<article class="phase-card <?=!$p['released']||!$p['developed']?'locked':''?>">
<span class="phase-number">FASE <?=str_pad((string)$p['id'],2,'0',STR_PAD_LEFT)?></span><h2><?=h($p['title'])?></h2><p><?=h($p['description'])?></p>
<?php if(!$p['developed']): ?><span class="phase-state">Ainda não desenvolvido</span>
<?php elseif(!$p['released']): ?><span class="phase-state">🔒 Aguardando liberação do professor</span>
<?php elseif($completed): ?><a class="phase-link" href="phase.php?id=<?=$p['id']?>">✓ Concluída · revisar</a>
<?php else: ?><a class="phase-link" href="phase.php?id=<?=$p['id']?>">Iniciar investigação →</a><?php endif ?>
<?php if($completed && $p['reward']): ?><div class="reward">Evidência: <strong><?=h($p['reward'])?></strong></div><?php endif ?>
</article><?php endforeach ?>
</div></main></body></html>

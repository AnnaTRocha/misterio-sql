import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTeamEvidenceInput } from '../server/arg.js';

test('observações do quadro da equipe são texto normalizado e de tamanho limitado', () => {
  assert.deepEqual(normalizeTeamEvidenceInput(' A equipe encontrou\ntrês registros. '), {
    note: 'A equipe encontrou três registros.'
  });
  assert.equal(normalizeTeamEvidenceInput('ok'), null);
  assert.equal(normalizeTeamEvidenceInput({ text: 'observação válida' }), null);
  assert.equal(normalizeTeamEvidenceInput('x'.repeat(361)), null);
});

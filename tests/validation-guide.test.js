import test from 'node:test';
import assert from 'node:assert/strict';
import { validationGuideForPhase } from '../server/test-tools.js';
import { CONCEPTS } from '../server/concepts.js';
import { LESSONS, evaluateChallenge, executeArchiveQuery } from '../server/challenges.js';
import { renderValidationGuide } from '../js/validation-guide.js';

test('guia do usuário teste contém consultas, respostas e código em todas as fases', async () => {
  for (let phase = 1; phase <= 9; phase++) {
    const guide = validationGuideForPhase(phase, phase === 1 ? '1987' : 'ORION');
    assert.ok(guide.expected_sql.length > 0);
    assert.equal(guide.access_code, phase <= 2 ? (phase === 1 ? '1987' : 'ORION') : LESSONS[phase].answer);
    if (phase === 3) assert.equal(guide.concept_answer, null);
    else {
      assert.equal(guide.concept_answer.question, CONCEPTS[phase].prompt);
      assert.equal(guide.concept_answer.value, CONCEPTS[phase].answer);
      assert.ok(guide.concept_answer.label);
    }
    const html = renderValidationGuide(guide, 'resetTest');
    assert.match(html, /Ferramentas de validação/);
    assert.ok(html.includes(guide.access_code));
    if (phase <= 2) {
      for (const { sql } of guide.expected_sql) assert.ok((await executeArchiveQuery(sql)).length > 0);
    } else if (phase < 9) {
      const result = await evaluateChallenge(phase, guide.expected_sql.map(item => item.sql), 1);
      assert.deepEqual(new Set(result.milestones), new Set(LESSONS[phase].objectives.map(([key]) => key)));
    }
  }
});

test('fase final mostra os dois grupos, protocolo e resposta NoSQL', async () => {
  const guide = validationGuideForPhase(9);
  assert.equal(guide.expected_sql.length, 2);
  assert.equal(guide.final_protocol, '3301');
  assert.equal(guide.concept_answer.value, 'find');
  for (const [index, item] of guide.expected_sql.entries()) {
    const group = index + 1;
    const result = await evaluateChallenge(9, [item.sql], group, true);
    assert.deepEqual(new Set(result.milestones), new Set(LESSONS[9].objectives.map(([key]) => key)));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrchestratorState, toggleAgent, getActiveAgents, runOrchestration } from '../src/app.js';

test('toggleAgent disables an agent and removes it from the active workflow', () => {
  const state = createOrchestratorState();

  toggleAgent(state, 'inspector');

  assert.equal(state.agents.find((agent) => agent.id === 'inspector').enabled, false);
  assert.equal(getActiveAgents(state).some((agent) => agent.id === 'inspector'), false);
});

test('all agents off produces an empty workflow trace', () => {
  const state = createOrchestratorState();

  toggleAgent(state, 'inspector');
  toggleAgent(state, 'forensic');
  toggleAgent(state, 'researcher');

  assert.deepEqual(getActiveAgents(state), []);
  assert.equal(state.workflowTrace.length, 0);
});

test('runOrchestration builds fresh outputs from the enabled agents only', () => {
  const state = createOrchestratorState();

  toggleAgent(state, 'forensic');

  const result = runOrchestration(state, 'Analyze a suspicious package');

  assert.equal(result.outputs.length, 2);
  assert.deepEqual(result.trace.map((step) => step.agentId), ['inspector', 'researcher']);
  assert.match(result.outputs[0].content, /Inspector/);
});

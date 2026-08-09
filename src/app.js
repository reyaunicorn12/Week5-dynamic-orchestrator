export function createOrchestratorState() {
  return {
    agents: [
      { id: 'inspector', name: 'Inspector', enabled: true, color: '#1d4ed8' },
      { id: 'forensic', name: 'Forensic Expert', enabled: true, color: '#65a30d' },
      { id: 'researcher', name: 'Researcher', enabled: true, color: '#d97706' }
    ],
    workflowTrace: [
      { step: 'Evidence Scan', agentId: 'inspector' },
      { step: 'DNA Match', agentId: 'forensic' },
      { step: 'Database Query', agentId: 'researcher' }
    ]
  };
}

export function toggleAgent(state, agentId) {
  const agent = state.agents.find((item) => item.id === agentId);
  if (!agent) return state;

  agent.enabled = !agent.enabled;

  if (!agent.enabled) {
    state.workflowTrace = state.workflowTrace.filter((step) => step.agentId !== agentId);
  }

  return state;
}

export function getActiveAgents(state) {
  return state.agents.filter((agent) => agent.enabled);
}

export function runOrchestration(state, prompt) {
  const activeAgents = getActiveAgents(state);

  const outputs = activeAgents.map((agent) => ({
    agentId: agent.id,
    content: `${agent.name}: ${buildAgentResponse(agent.id, prompt)}`
  }));

  const trace = activeAgents.map((agent) => ({
    step: `${agent.name} processed`,
    agentId: agent.id
  }));

  return {
    prompt,
    outputs,
    trace
  };
}

function buildAgentResponse(agentId, prompt) {
  const templates = {
    inspector: `reviewed the request and prepared a structured assessment for "${prompt}".`,
    forensic: `analyzed evidence patterns and surfaced forensic insights for "${prompt}".`,
    researcher: `gathered supporting context and proposed next steps for "${prompt}".`
  };

  return templates[agentId] || `responded to "${prompt}".`;
}

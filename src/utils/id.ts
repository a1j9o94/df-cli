import { ulid } from "ulid";

export function newRunId(): string {
  return `run_${ulid()}`;
}

export function newAgentId(): string {
  return `agt_${ulid()}`;
}

export function newSpecId(): string {
  return `spec_${ulid()}`;
}

export function newPlanId(): string {
  return `plan_${ulid()}`;
}

export function newContractId(): string {
  return `ctr_${ulid()}`;
}

export function newMsgId(): string {
  return `msg_${ulid()}`;
}

export function newEventId(): string {
  return `evt_${ulid()}`;
}

export function newBindingId(): string {
  return `bind_${ulid()}`;
}

export function newDepId(): string {
  return `dep_${ulid()}`;
}

export function newResourceId(): string {
  return `res_${ulid()}`;
}

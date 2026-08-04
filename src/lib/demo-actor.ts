export type DemoActorRole =
  | "research_coordinator"
  | "clinician"
  | "supervisor"
  | "safety_reviewer"
  | "research_analyst";

export interface DemoActor {
  id: string;
  role: DemoActorRole;
  name: string;
  initials: string;
}

export const DEMO_ACTORS: DemoActor[] = [
  { id: "RC-1", role: "research_coordinator", name: "Demo Research Coordinator", initials: "RC" },
  { id: "CLIN-A", role: "clinician", name: "Demo Clinician A", initials: "DA" },
  { id: "SUP-1", role: "supervisor", name: "Demo Supervisor", initials: "SV" },
  { id: "SAFE-R", role: "safety_reviewer", name: "Demo Safety Reviewer", initials: "SR" },
  { id: "RA-1", role: "research_analyst", name: "Demo Research Analyst", initials: "RA" },
];

const STORAGE_KEY = "tbct-demo-actor";

export function getDefaultDemoActor() {
  return DEMO_ACTORS[0];
}

export function getDemoActorById(actorId: string) {
  return DEMO_ACTORS.find((actor) => actor.id === actorId) ?? null;
}

export function getCurrentDemoActor() {
  if (typeof window === "undefined") return getDefaultDemoActor();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return getDefaultDemoActor();
  try {
    const parsed = JSON.parse(raw) as Partial<DemoActor>;
    if (!parsed.id) return getDefaultDemoActor();
    return getDemoActorById(parsed.id) ?? getDefaultDemoActor();
  } catch {
    return getDefaultDemoActor();
  }
}

export function setCurrentDemoActor(actorId: string) {
  if (typeof window === "undefined") return;
  const actor = getDemoActorById(actorId) ?? getDefaultDemoActor();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(actor));
}

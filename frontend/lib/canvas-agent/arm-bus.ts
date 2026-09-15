export type ArmedProject = {
  tabId: string;
  projectId: string;
  projectName: string;
};

export type ClaimResult =
  | { ok: true }
  | { ok: false; holder: ArmedProject };

export type ArmBus = {
  readonly tabId: string;
  listArmed(): ArmedProject[];
  hasClaim(): boolean;
  claim(project: { id: string; name: string }): ClaimResult;
  takeOver(project: { id: string; name: string }): void;
  release(): void;
  sync(): Promise<void>;
  subscribe(listener: () => void): () => void;
};

type ArmStore = {
  claims: Map<string, ArmedProject>;
  listeners: Set<() => void>;
};

export type MemoryArmNetwork = {
  attach(tabId: string): ArmBus;
  seed(claims: ArmedProject[]): void;
};

const STORAGE_KEY = "iae.active-project";
const STORAGE_PREFIX = "iae.active-project:";
const CENSUS_MS = 30;
const CLAIM_TTL_MS = 45_000;
const HEARTBEAT_MS = 10_000;

export function createMemoryArmNetwork(): MemoryArmNetwork {
  const store = createArmStore();
  return {
    attach(tabId: string) {
      return createArmBus(tabId, store);
    },
    seed(claims: ArmedProject[]) {
      store.claims.clear();
      for (const claim of claims) {
        store.claims.set(claim.tabId, claim);
      }
      notify(store);
    },
  };
}

export function createBrowserArmBus(): ArmBus {
  const tabId = crypto.randomUUID();
  const store = createArmStore();
  const local = createArmBus(tabId, store);
  hydrateFromStorage(store, tabId);
  let heartbeat: ReturnType<typeof window.setInterval> | null = null;

  if (typeof window === "undefined") {
    return local;
  }

  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel("iae.active-project");

  function stopHeartbeat() {
    if (heartbeat !== null) {
      window.clearInterval(heartbeat);
      heartbeat = null;
    }
  }

  function startHeartbeat(project: { id: string; name: string }) {
    stopHeartbeat();
    heartbeat = window.setInterval(() => {
      if (!local.hasClaim()) {
        stopHeartbeat();
        return;
      }
      writeTabClaim(asArmed(tabId, project));
    }, HEARTBEAT_MS);
  }

  const bus: ArmBus = {
    tabId,
    listArmed() {
      return mergeStoredClaims(local.listArmed());
    },
    hasClaim() {
      return local.hasClaim();
    },
    claim(project) {
      const others = rememberStoredOthers(store, tabId);
      if (others[0]) {
        return { ok: false, holder: others[0] };
      }
      const result = local.claim(project);
      if (result.ok) {
        writeTabClaim(asArmed(tabId, project));
        rememberStoredOthers(store, tabId);
        startHeartbeat(project);
        post(channel, {
          type: "claim",
          tabId,
          projectId: project.id,
          projectName: project.name,
        });
        post(channel, { type: "who" });
      }
      return result;
    },
    takeOver(project) {
      local.takeOver(project);
      writeTabClaim(asArmed(tabId, project));
      rememberStoredOthers(store, tabId);
      startHeartbeat(project);
      post(channel, {
        type: "takeover",
        tabId,
        projectId: project.id,
        projectName: project.name,
      });
    },
    release() {
      stopHeartbeat();
      if (!local.hasClaim()) {
        removeTabClaim(tabId);
        return;
      }
      local.release();
      removeTabClaim(tabId);
      post(channel, { type: "release", tabId });
    },
    async sync() {
      rememberStoredOthers(store, tabId);
      post(channel, { type: "who" });
      await wait(CENSUS_MS);
    },
    subscribe(listener) {
      return local.subscribe(listener);
    },
  };

  if (channel) {
    channel.onmessage = (event: MessageEvent<ArmMessage>) => {
      applyRemoteMessage(store, tabId, event.data, channel, () => {
        stopHeartbeat();
        removeTabClaim(tabId);
      });
    };
    post(channel, { type: "who" });
  }

  window.addEventListener("storage", (event) => {
    if (
      event.key !== STORAGE_KEY &&
      event.key !== null &&
      !event.key.startsWith(STORAGE_PREFIX)
    ) {
      return;
    }
    hydrateFromStorage(store, tabId);
    notify(store);
  });

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) {
      return;
    }
    bus.release();
  });

  return bus;
}

function createArmStore(): ArmStore {
  return {
    claims: new Map(),
    listeners: new Set(),
  };
}

function createArmBus(tabId: string, store: ArmStore): ArmBus {
  return {
    tabId,
    listArmed() {
      return [...store.claims.values()];
    },
    hasClaim() {
      return store.claims.has(tabId);
    },
    claim(project) {
      const holder = otherHolder(store, tabId);
      if (holder) {
        return { ok: false, holder };
      }
      const next = asArmed(tabId, project);
      const current = store.claims.get(tabId);
      if (
        current &&
        current.projectId === next.projectId &&
        current.projectName === next.projectName
      ) {
        return { ok: true };
      }
      store.claims.set(tabId, next);
      notify(store);
      return { ok: true };
    },
    takeOver(project) {
      store.claims.clear();
      store.claims.set(tabId, asArmed(tabId, project));
      notify(store);
    },
    release() {
      if (!store.claims.delete(tabId)) {
        return;
      }
      notify(store);
    },
    sync() {
      return Promise.resolve();
    },
    subscribe(listener) {
      store.listeners.add(listener);
      return () => {
        store.listeners.delete(listener);
      };
    },
  };
}

function otherHolder(store: ArmStore, tabId: string): ArmedProject | null {
  for (const [holderId, holder] of store.claims) {
    if (holderId !== tabId) {
      return holder;
    }
  }
  return null;
}

function asArmed(
  tabId: string,
  project: { id: string; name: string },
): ArmedProject {
  return {
    tabId,
    projectId: project.id,
    projectName: project.name,
  };
}

function notify(store: ArmStore): void {
  for (const listener of store.listeners) {
    listener();
  }
}

type ArmMessage =
  | {
      type: "claim";
      tabId: string;
      projectId: string;
      projectName: string;
    }
  | {
      type: "takeover";
      tabId: string;
      projectId: string;
      projectName: string;
    }
  | { type: "release"; tabId: string }
  | { type: "who" }
  | {
      type: "here";
      tabId: string;
      projectId: string;
      projectName: string;
    };

function post(
  channel: BroadcastChannel | null,
  message: ArmMessage,
): void {
  channel?.postMessage(message);
}

function applyRemoteMessage(
  store: ArmStore,
  tabId: string,
  message: ArmMessage,
  channel: BroadcastChannel,
  releaseLocal: () => void,
): void {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return;
  }

  if (message.type === "who") {
    const mine = store.claims.get(tabId);
    if (mine) {
      post(channel, {
        type: "here",
        tabId,
        projectId: mine.projectId,
        projectName: mine.projectName,
      });
    }
    return;
  }

  if (!("tabId" in message) || message.tabId === tabId) {
    return;
  }

  if (message.type === "claim" || message.type === "here") {
    store.claims.set(message.tabId, {
      tabId: message.tabId,
      projectId: message.projectId,
      projectName: message.projectName,
    });
    notify(store);
    return;
  }

  if (message.type === "takeover") {
    if (store.claims.has(tabId)) {
      store.claims.delete(tabId);
      releaseLocal();
    }
    store.claims.set(message.tabId, {
      tabId: message.tabId,
      projectId: message.projectId,
      projectName: message.projectName,
    });
    notify(store);
    return;
  }

  if (message.type === "release") {
    if (store.claims.delete(message.tabId)) {
      notify(store);
    }
  }
}

type StoredClaimValue = {
  projectId: string;
  projectName: string;
  at?: number;
};

function readStoredClaims(): ArmedProject[] {
  if (typeof window === "undefined") {
    return [];
  }

  const claims = new Map<string, ArmedProject>();
  const now = Date.now();

  try {
    const legacy = window.localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      for (const claim of parseLegacyClaims(legacy)) {
        claims.set(claim.tabId, claim);
      }
    }

    for (const key of storageKeysWithPrefix(STORAGE_PREFIX)) {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        continue;
      }
      const tabId = key.slice(STORAGE_PREFIX.length);
      const claim = parseTabClaim(tabId, raw, now);
      if (!claim) {
        window.localStorage.removeItem(key);
        continue;
      }
      claims.set(claim.tabId, claim);
    }
  } catch {
    return [...claims.values()];
  }

  return [...claims.values()];
}

function parseLegacyClaims(raw: string): ArmedProject[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isLegacyStoredClaim(parsed)) {
      return [parsed];
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [];
    }
    const claims: ArmedProject[] = [];
    for (const [tabId, value] of Object.entries(
      parsed as Record<string, StoredClaimValue>,
    )) {
      if (
        typeof value?.projectId === "string" &&
        typeof value.projectName === "string"
      ) {
        claims.push({
          tabId,
          projectId: value.projectId,
          projectName: value.projectName,
        });
      }
    }
    return claims;
  } catch {
    return [];
  }
}

function parseTabClaim(
  tabId: string,
  raw: string,
  now: number,
): ArmedProject | null {
  try {
    const parsed = JSON.parse(raw) as StoredClaimValue;
    if (
      typeof parsed?.projectId !== "string" ||
      typeof parsed.projectName !== "string"
    ) {
      return null;
    }
    if (typeof parsed.at === "number" && now - parsed.at > CLAIM_TTL_MS) {
      return null;
    }
    return {
      tabId,
      projectId: parsed.projectId,
      projectName: parsed.projectName,
    };
  } catch {
    return null;
  }
}

function isLegacyStoredClaim(value: unknown): value is ArmedProject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const parsed = value as Partial<ArmedProject>;
  return (
    typeof parsed.tabId === "string" &&
    typeof parsed.projectId === "string" &&
    typeof parsed.projectName === "string"
  );
}

function writeTabClaim(claim: ArmedProject): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    STORAGE_PREFIX + claim.tabId,
    JSON.stringify({
      projectId: claim.projectId,
      projectName: claim.projectName,
      at: Date.now(),
    }),
  );
}

function removeTabClaim(tabId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_PREFIX + tabId);
}

function storageKeysWithPrefix(prefix: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

function rememberStoredOthers(store: ArmStore, tabId: string): ArmedProject[] {
  const others = readStoredClaims().filter((claim) => claim.tabId !== tabId);
  const seen = new Set(others.map((claim) => claim.tabId));
  for (const [holderId] of store.claims) {
    if (holderId !== tabId && !seen.has(holderId)) {
      store.claims.delete(holderId);
    }
  }
  for (const claim of others) {
    store.claims.set(claim.tabId, claim);
  }
  return others;
}

function hydrateFromStorage(store: ArmStore, tabId: string): void {
  rememberStoredOthers(store, tabId);
}

function mergeStoredClaims(armed: ArmedProject[]): ArmedProject[] {
  const merged = new Map(armed.map((claim) => [claim.tabId, claim]));
  for (const claim of readStoredClaims()) {
    if (!merged.has(claim.tabId)) {
      merged.set(claim.tabId, claim);
    }
  }
  return [...merged.values()];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

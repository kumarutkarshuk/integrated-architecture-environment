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
const CENSUS_MS = 30;

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

  if (typeof window === "undefined") {
    return local;
  }

  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel("iae.active-project");

  const bus: ArmBus = {
    tabId,
    listArmed() {
      return mergeStoredClaim(local.listArmed());
    },
    hasClaim() {
      return local.hasClaim();
    },
    claim(project) {
      const stored = readStoredClaim();
      if (stored && stored.tabId !== tabId) {
        store.claims.set(stored.tabId, stored);
        return { ok: false, holder: stored };
      }
      const result = local.claim(project);
      if (result.ok) {
        writeStoredClaim(asArmed(tabId, project));
        post(channel, {
          type: "claim",
          tabId,
          projectId: project.id,
          projectName: project.name,
        });
      }
      return result;
    },
    takeOver(project) {
      local.takeOver(project);
      writeStoredClaim(asArmed(tabId, project));
      post(channel, {
        type: "takeover",
        tabId,
        projectId: project.id,
        projectName: project.name,
      });
    },
    release() {
      if (!local.hasClaim()) {
        return;
      }
      local.release();
      const stored = readStoredClaim();
      if (stored?.tabId === tabId) {
        writeStoredClaim(null);
      }
      post(channel, { type: "release", tabId });
    },
    async sync() {
      post(channel, { type: "who" });
      await wait(CENSUS_MS);
    },
    subscribe(listener) {
      return local.subscribe(listener);
    },
  };

  if (channel) {
    channel.onmessage = (event: MessageEvent<ArmMessage>) => {
      applyRemoteMessage(store, tabId, event.data, channel);
    };
    post(channel, { type: "who" });
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) {
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
    store.claims.clear();
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

function readStoredClaim(): ArmedProject | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ArmedProject>;
    if (
      typeof parsed.tabId !== "string" ||
      typeof parsed.projectId !== "string" ||
      typeof parsed.projectName !== "string"
    ) {
      return null;
    }
    return {
      tabId: parsed.tabId,
      projectId: parsed.projectId,
      projectName: parsed.projectName,
    };
  } catch {
    return null;
  }
}

function writeStoredClaim(claim: ArmedProject | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!claim) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(claim));
}

function hydrateFromStorage(store: ArmStore, tabId: string): void {
  const stored = readStoredClaim();
  if (!stored || stored.tabId === tabId) {
    return;
  }
  store.claims.set(stored.tabId, stored);
}

function mergeStoredClaim(armed: ArmedProject[]): ArmedProject[] {
  const stored = readStoredClaim();
  if (!stored) {
    return armed;
  }
  if (armed.some((claim) => claim.tabId === stored.tabId)) {
    return armed;
  }
  return [...armed, stored];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

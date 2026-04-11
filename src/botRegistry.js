import { createBotState } from "./botStateFactory.js";
import { DerivSession } from "./derivSession.js";

const registry = new Map();

export function getUserBot(username) {
  if (!registry.has(username)) {
    const state = createBotState();
    let listeners = new Set();

    const emit = (event) => {
      for (const fn of listeners) fn(event);
    };

    const session = new DerivSession(state, emit, process.env.DERIV_APP_ID || "1089");

    registry.set(username, {
      state,
      session,
      addListener(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      }
    });
  }

  return registry.get(username);
}
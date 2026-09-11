import { createTestAnalytics, setAnalytics } from "../src/analytics.js";

export const testAnalytics = createTestAnalytics();

export function installTestAnalytics(): void {
  testAnalytics.reset();
  setAnalytics(testAnalytics.analytics);
}

/**
 * How often catalogue screens re-check the server while the customer is looking
 * at them.
 *
 * Stock is the one thing on screen that staff change from the admin console
 * while a customer is mid-browse, and a customer who adds a sold-out item to
 * their basket only finds out at checkout — the worst possible moment. Polling
 * closes that window without any realtime infrastructure.
 *
 * Thirty seconds is a deliberate compromise: fast enough that a sold-out label
 * appears before most people finish choosing, slow enough to stay cheap on a
 * phone's battery and data. React Query pauses these timers when the app is
 * backgrounded (see the AppState wiring in app/_layout.tsx), so an app sitting
 * in a pocket costs nothing.
 *
 * This is a display concern only. Overselling is prevented server-side, where
 * checkout re-checks stock under a row lock.
 */
export const CATALOGUE_POLL_MS = 30_000;

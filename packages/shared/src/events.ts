// Events the backend can emit to the frontend.
// Add entries as `"event:name": (payload: Payload) => void;` and emit them
// from the backend with `sdk.api.send("event:name", payload)`.
export type Events = Record<string, never>;

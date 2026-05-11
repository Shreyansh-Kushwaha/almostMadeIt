export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  setBaseUrl,
  setAuthTokenGetter,
  setBackendStatusListener,
  setDemoHandler,
} from "./custom-fetch";
export type { AuthTokenGetter, BackendStatus, DemoHandler } from "./custom-fetch";

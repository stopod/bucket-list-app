// Auth feature exports
export { AuthProvider, useAuth } from "./lib/auth-context";
export { withAuth, useRequireAuth } from "./components/auth-guard";
export { useAuth as useAuthHook } from "./hooks/use-auth";

// Auth types exports
export type { AuthContextType, AuthFormData, AuthError } from "./types";

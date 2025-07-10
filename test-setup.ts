import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Supabase client for tests
vi.mock("~/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      setSession: vi.fn().mockResolvedValue({ data: null, error: null }),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockImplementation(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock environment variables
process.env.VITE_SUPABASE_URL = "https://test.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

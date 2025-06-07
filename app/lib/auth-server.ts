import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/shared/types/database";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key must be set in environment variables for server-side auth."
  );
}

// Server-side Supabase client for auth validation
const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface ServerAuthResult {
  user: User | null;
  isAuthenticated: boolean;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number | null;
  } | null;
}

/**
 * Parse cookies from a Cookie header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      const value = rest.join('=');
      cookies[name.trim()] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

/**
 * Extract Supabase auth tokens from cookies
 */
function extractSupabaseTokens(cookies: Record<string, string>): {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
} {
  // Try different possible cookie patterns used by Supabase
  const possibleKeys = [
    'supabase-auth-token',
    'supabase.auth.token',
    'sb-access-token',
    'sb-refresh-token',
  ];
  
  let access_token: string | null = null;
  let refresh_token: string | null = null;
  let expires_at: number | null = null;
  
  // Look for Supabase session data in cookies
  for (const [key, value] of Object.entries(cookies)) {
    if (key.includes('supabase') || key.startsWith('sb-')) {
      try {
        // Try to parse as JSON (Supabase stores session as JSON in cookies)
        const parsed = JSON.parse(value);
        
        if (parsed.access_token) {
          access_token = parsed.access_token;
        }
        if (parsed.refresh_token) {
          refresh_token = parsed.refresh_token;
        }
        if (parsed.expires_at) {
          expires_at = parsed.expires_at;
        }
        
        // If we found session data, break
        if (access_token && refresh_token) {
          break;
        }
      } catch {
        // If not JSON, check if it's a direct token
        if (value.length > 20 && (value.includes('.') || value.startsWith('ey'))) {
          // Looks like a JWT token
          if (key.includes('access') || key.includes('token')) {
            access_token = value;
          } else if (key.includes('refresh')) {
            refresh_token = value;
          }
        }
      }
    }
  }
  
  return { access_token, refresh_token, expires_at };
}

/**
 * Validate JWT token and extract user information
 */
async function validateJwtToken(token: string): Promise<User | null> {
  try {
    // Use Supabase to validate the token
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    
    if (error || !user) {
      console.warn('JWT validation failed:', error?.message);
      return null;
    }
    
    return user;
  } catch (error) {
    console.warn('JWT validation error:', error);
    return null;
  }
}

/**
 * Check if a token is expired
 */
function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return false;
  
  const now = Math.floor(Date.now() / 1000);
  return expiresAt < now;
}

/**
 * Server-side authentication check for React Router loaders
 * 
 * This function:
 * 1. Parses cookies from the request headers
 * 2. Extracts Supabase auth tokens using multiple fallback patterns
 * 3. Validates JWT tokens if present using Supabase server client
 * 4. Returns authentication status and user info
 * 
 * Example usage:
 * ```typescript
 * // In a React Router loader
 * export async function loader({ request }: Route.LoaderArgs) {
 *   const authResult = await getServerAuth(request);
 *   
 *   if (!authResult.isAuthenticated) {
 *     // Handle unauthenticated case
 *     return { data: null, isLoggedIn: false };
 *   }
 *   
 *   // User is authenticated, use authResult.user
 *   return { user: authResult.user, isLoggedIn: true };
 * }
 * ```
 * 
 * @param request - The Request object from React Router loader
 * @returns Promise<ServerAuthResult> - Authentication result
 */
export async function getServerAuth(request: Request): Promise<ServerAuthResult> {
  try {
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = parseCookies(cookieHeader);
    
    // Extract Supabase tokens from cookies
    const { access_token, refresh_token, expires_at } = extractSupabaseTokens(cookies);
    
    // If no access token found, user is not authenticated
    if (!access_token) {
      return {
        user: null,
        isAuthenticated: false,
        session: null,
      };
    }
    
    // Check if token is expired
    if (isTokenExpired(expires_at)) {
      console.warn('Access token is expired');
      return {
        user: null,
        isAuthenticated: false,
        session: null,
      };
    }
    
    // Validate the JWT token and get user
    const user = await validateJwtToken(access_token);
    
    if (!user) {
      return {
        user: null,
        isAuthenticated: false,
        session: null,
      };
    }
    
    // Return successful authentication result
    return {
      user,
      isAuthenticated: true,
      session: {
        access_token,
        refresh_token: refresh_token || '',
        expires_at,
      },
    };
    
  } catch (error) {
    console.error('Server auth check failed:', error);
    return {
      user: null,
      isAuthenticated: false,
      session: null,
    };
  }
}

/**
 * Convenience function to check if user is authenticated
 * Throws a redirect response if not authenticated
 * 
 * @param request - The Request object from React Router loader
 * @param redirectTo - URL to redirect to if not authenticated (default: "/login")
 * @returns Promise<ServerAuthResult> - Authentication result (only if authenticated)
 */
export async function requireAuth(
  request: Request, 
  redirectTo: string = "/login"
): Promise<ServerAuthResult> {
  const authResult = await getServerAuth(request);
  
  if (!authResult.isAuthenticated) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
      },
    });
  }
  
  return authResult;
}

/**
 * Create a server-side Supabase client with user authentication
 * This is useful for making authenticated requests to Supabase in loaders
 * 
 * @param authResult - Result from getServerAuth or requireAuth
 * @returns Supabase client with user context
 */
export function createAuthenticatedSupabaseClient(authResult: ServerAuthResult) {
  if (!authResult.isAuthenticated || !authResult.session?.access_token) {
    throw new Error('Cannot create authenticated client without valid session');
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is missing');
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authResult.session.access_token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Convenience function for loaders that need authentication
 * Returns both the auth result and an authenticated Supabase client
 * 
 * @param request - The Request object from React Router loader
 * @param redirectTo - URL to redirect to if not authenticated (default: "/login")
 * @returns Promise<{ auth: ServerAuthResult, supabase: SupabaseClient }>
 */
export async function withAuth(
  request: Request,
  redirectTo: string = "/login"
): Promise<{
  auth: ServerAuthResult;
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>;
}> {
  const auth = await requireAuth(request, redirectTo);
  const supabase = createAuthenticatedSupabaseClient(auth);
  
  return { auth, supabase };
}

export type { Database };
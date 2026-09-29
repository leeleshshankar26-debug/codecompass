import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Augment Express Request with verified userId
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Sets req.userId to the authenticated user's ID.
 * NEVER trusts a userId passed in the request body.
 *
 * We use supabase.auth.getUser() which validates the JWT against
 * Supabase's key — this is the authoritative check.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.substring(7); // strip "Bearer "
  if (!token) {
    res.status(401).json({ error: 'Empty access token' });
    return;
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      res.status(401).json({ error: 'Authentication not configured' });
      return;
    }

    // Create a per-request client to validate the user token
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired access token' });
      return;
    }

    // Attach verified user ID — all downstream handlers use this
    req.userId = data.user.id;
    next();
  } catch (err) {
    console.error('[Auth] Token validation error:', err instanceof Error ? err.message : err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

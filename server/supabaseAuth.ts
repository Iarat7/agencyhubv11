import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from "express";
import session from "express-session";

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error("SUPABASE_DATABASE_URL environment variable is required");
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY environment variable is required");
}

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_DATABASE_URL.replace('/postgres', '').replace(':5432', ''),
  process.env.SUPABASE_ANON_KEY
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  return session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      // Store session
      (req.session as any).user = {
        id: data.user.id,
        email: data.user.email,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };

      res.json({ 
        user: { 
          id: data.user.id, 
          email: data.user.email,
          firstName: data.user.user_metadata?.first_name,
          lastName: data.user.user_metadata?.last_name,
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Register route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ 
        message: 'Usuário registrado com sucesso. Verifique seu email.',
        user: data.user ? { 
          id: data.user.id, 
          email: data.user.email 
        } : null
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const accessToken = (req.session as any).user?.accessToken;
      
      if (accessToken) {
        await supabase.auth.signOut();
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
        res.json({ message: 'Logout realizado com sucesso' });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Get current user route
  app.get('/api/auth/user', async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      
      if (!sessionUser) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(sessionUser.accessToken);
      
      if (error || !user) {
        // Clear invalid session
        req.session.destroy(() => {});
        return res.status(401).json({ error: 'Token inválido' });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.first_name,
        lastName: user.user_metadata?.last_name,
        profileImageUrl: user.user_metadata?.avatar_url,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const sessionUser = (req.session as any).user;
    
    if (!sessionUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(sessionUser.accessToken);
    
    if (error || !user) {
      // Clear invalid session
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Add user info to request
    (req as any).user = {
      id: user.id,
      email: user.email,
      claims: { sub: user.id }
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: "Unauthorized" });
  }
};
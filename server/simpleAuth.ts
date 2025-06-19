
import type { Express, RequestHandler } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";

// Simple in-memory user store for demo (replace with database in production)
const users = new Map<string, { 
  id: string; 
  email: string; 
  password: string; 
  firstName?: string; 
  lastName?: string;
  hashedPassword?: string; 
}>();

// Add a demo user with hashed password
const initializeUsers = async () => {
  const hashedPassword = await bcrypt.hash("123456", 10);
  users.set("admin@agencyhub.com", {
    id: "demo-user-1",
    email: "admin@agencyhub.com", 
    password: "123456", // Keep for backward compatibility
    hashedPassword,
    firstName: "Admin",
    lastName: "User"
  });
};

export function getSession() {
  return session({
    secret: process.env.SESSION_SECRET || 'demo-secret-key-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    },
  });
}

export async function setupAuth(app: Express) {
  await initializeUsers();
  
  app.use(getSession());

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const user = users.get(email);
      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Check password (support both hashed and plain for backward compatibility)
      let passwordValid = false;
      if (user.hashedPassword) {
        passwordValid = await bcrypt.compare(password, user.hashedPassword);
      } else {
        passwordValid = user.password === password;
      }

      if (!passwordValid) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Store user in session
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      };

      res.json({ 
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Organization signup route
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName, organizationName, subdomain, planId } = req.body;
      
      if (!email || !password || !organizationName || !subdomain) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
      }

      // Check if subdomain is available
      const existingOrg = await storage.getOrganizationBySubdomain(subdomain);
      if (existingOrg) {
        return res.status(400).json({ error: 'Subdomínio já está em uso' });
      }

      if (users.has(email)) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }

      // Create organization
      const organization = await storage.createOrganization({
        name: organizationName,
        subdomain,
        planId: planId || null,
        isActive: true
      });

      // Create owner user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: `user-${Date.now()}`,
        email,
        password,
        hashedPassword,
        firstName,
        lastName,
        organizationId: organization.id,
        role: 'owner'
      };

      users.set(email, newUser);

      // Store user in session
      (req.session as any).user = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        organizationId: organization.id,
        role: 'owner'
      };

      res.json({ 
        message: 'Organização criada com sucesso',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          organizationId: organization.id,
          role: 'owner'
        },
        organization
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Register route (for existing organizations)
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, organizationId } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
      }

      if (users.has(email)) {
        return res.status(400).json({ error: 'Usuário já existe' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: `user-${Date.now()}`,
        email,
        password,
        hashedPassword,
        firstName,
        lastName
      };

      users.set(email, newUser);

      // Store user in session
      (req.session as any).user = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      };

      res.json({ 
        message: 'Usuário registrado com sucesso',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Get current user route
  app.get('/api/auth/user', async (req, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      if (!sessionUser) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      res.json(sessionUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao fazer logout' });
      }
      res.json({ message: 'Logout realizado com sucesso' });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if ((req.session as any)?.user) {
    (req as any).user = { claims: { sub: (req.session as any).user.id } };
    return next();
  }
  res.status(401).json({ error: "Não autenticado" });
};

import { Router, Request, Response } from 'express';
import passport from 'passport';
import { generateToken, isAuthenticated } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Get current user
router.get('/me', isAuthenticated, (req: Request, res: Response) => {
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      username: req.user!.username,
      displayName: req.user!.displayName,
      avatarUrl: req.user!.avatarUrl,
      provider: req.user!.provider,
    },
  });
});

// Google OAuth - Initiate
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// Google OAuth - Callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
    session: true,
  }),
  (req: Request, res: Response) => {
    // Generate JWT token
    const token = generateToken(req.user!.id);

    logger.info(`User ${req.user!.username} logged in via Google`);

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// GitHub OAuth - Initiate
router.get('/github', passport.authenticate('github', {
  scope: ['user:email'],
}));

// GitHub OAuth - Callback
router.get('/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${FRONTEND_URL}/login?error=github_auth_failed`,
    session: true,
  }),
  (req: Request, res: Response) => {
    // Generate JWT token
    const token = generateToken(req.user!.id);

    logger.info(`User ${req.user!.username} logged in via GitHub`);

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Logout
router.post('/logout', (req: Request, res: Response) => {
  const userId = req.user?.id;

  req.logout((err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destroy error:', err);
      }

      res.clearCookie('connect.sid');

      if (userId) {
        logger.info(`User ${userId} logged out`);
      }

      res.json({ message: 'Logged out successfully' });
    });
  });
});

// Check authentication status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user ? {
      id: req.user.id,
      username: req.user.username,
      displayName: req.user.displayName,
      avatarUrl: req.user.avatarUrl,
    } : null,
  });
});

export { router as authRouter };

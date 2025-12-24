import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

export function configurePassport() {
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: { statistics: true },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        let user = await prisma.user.findUnique({
          where: {
            provider_providerId: {
              provider: 'google',
              providerId: profile.id,
            },
          },
        });

        if (!user) {
          // Create new user
          const email = profile.emails?.[0]?.value || `${profile.id}@google.oauth`;
          const baseUsername = profile.displayName?.replace(/\s+/g, '_').toLowerCase() || `user_${profile.id}`;

          // Ensure unique username
          let username = baseUsername;
          let counter = 1;
          while (await prisma.user.findUnique({ where: { username } })) {
            username = `${baseUsername}_${counter}`;
            counter++;
          }

          user = await prisma.user.create({
            data: {
              email,
              username,
              displayName: profile.displayName || username,
              avatarUrl: profile.photos?.[0]?.value,
              provider: 'google',
              providerId: profile.id,
              statistics: {
                create: {},
              },
            },
          });

          logger.info(`New user created via Google OAuth: ${user.username}`);
        }

        done(null, user);
      } catch (error) {
        logger.error('Google OAuth error:', error);
        done(error as Error, undefined);
      }
    }));
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Find or create user
        let user = await prisma.user.findUnique({
          where: {
            provider_providerId: {
              provider: 'github',
              providerId: profile.id,
            },
          },
        });

        if (!user) {
          const email = profile.emails?.[0]?.value || `${profile.id}@github.oauth`;
          const baseUsername = profile.username || `user_${profile.id}`;

          // Ensure unique username
          let username = baseUsername;
          let counter = 1;
          while (await prisma.user.findUnique({ where: { username } })) {
            username = `${baseUsername}_${counter}`;
            counter++;
          }

          user = await prisma.user.create({
            data: {
              email,
              username,
              displayName: profile.displayName || username,
              avatarUrl: profile.photos?.[0]?.value,
              provider: 'github',
              providerId: profile.id,
              statistics: {
                create: {},
              },
            },
          });

          logger.info(`New user created via GitHub OAuth: ${user.username}`);
        }

        done(null, user);
      } catch (error) {
        logger.error('GitHub OAuth error:', error);
        done(error as Error, undefined);
      }
    }));
  }
}

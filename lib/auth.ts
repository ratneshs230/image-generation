import { NextAuthOptions, getServerSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // @ts-ignore - Add username to session
        session.user.username = (user as any).username;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Create username from email or name if not exists
      if (user.email && !user.name) {
        const username = user.email.split('@')[0];
        await prisma.user.update({
          where: { id: user.id },
          data: { username },
        });
      }

      // Create user statistics if not exists
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { statistics: true },
      });

      if (existingUser && !existingUser.statistics) {
        await prisma.userStatistics.create({
          data: { userId: user.id },
        });
      }

      return true;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'database',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const getAuthSession = () => getServerSession(authOptions);

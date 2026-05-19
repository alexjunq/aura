import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import Nodemailer from 'next-auth/providers/nodemailer';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@aura/db';
import { loadEnv } from '@aura/config';
import { logger } from '@aura/logger';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      tenantId: string;
    };
  }
}

const env = loadEnv();

/**
 * Wrap PrismaAdapter so that creating a user (which happens on first OAuth
 * sign-in OR first magic-link redemption) atomically creates a tenant for
 * that user. Credentials sign-ups go through `auth.service.signup` directly
 * and bypass this path.
 */
function buildAdapter() {
  const base = PrismaAdapter(prisma);
  const baseCreate = base.createUser;
  if (!baseCreate) return base;
  base.createUser = async (data) => {
    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: data.name ?? data.email ?? 'My studio' },
      });
      const created = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          image: data.image,
          emailVerified: data.emailVerified,
          tenantId: tenant.id,
        },
      });
      logger.info(
        { userId: created.id, tenantId: tenant.id },
        'auto-provisioned tenant for new user',
      );
      return {
        id: created.id,
        email: created.email,
        emailVerified: created.emailVerified,
        name: created.name,
        image: created.image,
      };
    });
  };
  return base;
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: NextAuthConfig['providers'] = [
  Credentials({
    name: 'Email + password',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (!user?.hashedPassword) return null;
      const ok = await compare(parsed.data.password, user.hashedPassword);
      if (!ok) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

if (env.EMAIL_PROVIDER === 'resend' && env.EMAIL_API_KEY) {
  providers.push(
    Resend({
      apiKey: env.EMAIL_API_KEY,
      from: env.EMAIL_FROM,
    }),
  );
} else {
  providers.push(
    Nodemailer({
      server: {
        host: env.EMAIL_SMTP_HOST ?? 'localhost',
        port: env.EMAIL_SMTP_PORT ?? 1025,
      },
      from: env.EMAIL_FROM,
    }),
  );
}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: buildAdapter(),
  session: { strategy: 'database' },
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
  providers,
  pages: {
    signIn: '/signin',
    verifyRequest: '/signin/verify-request',
    error: '/signin?error',
  },
  callbacks: {
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { tenantId: true },
      });
      if (!dbUser) {
        logger.warn({ userId: user.id }, 'session: user has no tenant');
        return session;
      }
      session.user.id = user.id;
      session.user.tenantId = dbUser.tenantId;
      return session;
    },
  },
});

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, projects, projectMembers } from "./db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      projectId: string;
      projectCode: string;
      role: string;
      permissions?: string[] | null;
      email: string;
      name?: string;
    }
  }
  interface User {
    id: string;
    projectId: string;
    projectCode: string;
    role: string;
    permissions?: string[] | null;
    email: string;
    name?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    projectId: string;
    projectCode: string;
    role: string;
    permissions?: string[] | null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        projectCode: { label: "Project Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.projectCode) {
          throw new Error("Email, password, dan kode proyek wajib diisi");
        }

        // Find project by code
        const project = await db.select().from(projects).where(eq(projects.code, credentials.projectCode)).limit(1);
        if (project.length === 0) {
          throw new Error("Kode proyek tidak valid");
        }

        // Find user by email
        const user = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1);
        if (user.length === 0) {
          throw new Error("Email atau password salah");
        }

        // Validate password
        const valid = await bcrypt.compare(credentials.password, user[0].passwordHash);
        if (!valid) {
          throw new Error("Email atau password salah");
        }

        // Verify project membership
        const member = await db.select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, project[0].id),
              eq(projectMembers.userId, user[0].id)
            )
          )
          .limit(1);

        if (member.length === 0) {
          throw new Error("Anda tidak terdaftar dalam proyek ini");
        }

        return {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
          role: member[0].role,
          permissions: user[0].permissions,
          projectId: project[0].id,
          projectCode: project[0].code,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60, // 4 hours — limits stale-token window after role changes
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.projectId = user.projectId;
        token.projectCode = user.projectCode;
      }
      if (trigger === "update" && session) {
        if (session.projectId) {
          token.projectId = session.projectId;
        }
        if (session.projectCode) {
          token.projectCode = session.projectCode;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[] | null | undefined;
        session.user.projectId = token.projectId as string;
        session.user.projectCode = token.projectCode as string;
      }
      return session;
    },
  },
};


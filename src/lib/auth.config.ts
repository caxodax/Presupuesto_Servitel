import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isProtected) return isLoggedIn;
      if (isOnLogin && isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId as string | null;
        token.branchId = user.branchId as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string | null;
        session.user.branchId = token.branchId as string | null;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

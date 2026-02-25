import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware() {},
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/journey/:path*",
    "/api/attendance/:path*",
    "/api/members/:path*",
    "/api/branch/:path*",
    "/api/events/:path*",
    "/api/journey/:path*",
  ],
}

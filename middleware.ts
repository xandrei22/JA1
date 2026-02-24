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
  matcher: ["/dashboard/:path*", "/api/attendance/:path*", "/api/members/:path*"],
}

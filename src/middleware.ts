export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/sessions/:path*",
    "/tasks/:path*",
    "/topics/:path*",
    "/ask/:path*",
    "/settings/:path*",
  ],
};

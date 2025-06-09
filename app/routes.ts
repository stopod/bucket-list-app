import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/auth/login.tsx"),
  route("register", "routes/auth/register.tsx"),
  route("bucket-list", "routes/bucket-list/bucket-list.tsx"),
  route("bucket-list/add", "routes/bucket-list/add.tsx"),
  route("bucket-list/edit/:id", "routes/bucket-list/edit.$id.tsx"),
  route("bucket-list/delete/:id", "routes/bucket-list/delete.$id.tsx"),
  route("public", "routes/public/public.tsx"),
  route("dashboard", "routes/dashboard/dashboard.tsx"),
] satisfies RouteConfig;

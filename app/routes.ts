import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("instruments", "routes/instruments/instruments.tsx"),
  route("login", "routes/auth/login.tsx"),
  route("register", "routes/auth/register.tsx"),
  route("sample", "routes/sample/sample.tsx"),
  route("bucket-list", "routes/bucket-list/bucket-list.tsx"),
] satisfies RouteConfig;

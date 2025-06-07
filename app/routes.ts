import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("instruments", "routes/instruments.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("sample", "routes/sample.tsx"),
] satisfies RouteConfig;

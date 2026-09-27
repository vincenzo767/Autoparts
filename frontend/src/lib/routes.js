export const homeFor = (user) => (user?.role === "ADMIN" ? "/admin" : "/home");

/** True if the path belongs to the area this user's role may open. */
export function pathSuitsRole(path, user) {
  if (!path || !user) return false;
  const admin = path === "/admin" || path.startsWith("/admin/");
  return user.role === "ADMIN" ? admin : !admin && path !== "/auth";
}

const ROLE_RANK = { User: 1, Editor: 2, Admin: 3, Superadmin: 4 }

export function hasRole(userRole, minRole) {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0)
}

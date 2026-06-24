export const ROLES = {
  ADMIN: "admin",
  OFFICER: "officer",
};

export const PERMISSIONS = {
  admin: [
    "manage_students",
    "manage_events",
    "manage_users",
    "take_attendance",
    "view_reports",
    "export_data",
  ],
  officer: ["manage_events", "take_attendance", "view_reports"],
};

export function hasPermission(role, permission) {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

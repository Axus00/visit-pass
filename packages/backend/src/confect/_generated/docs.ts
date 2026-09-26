import type { Document } from "@confect/server";
import type schemaDefinition from "./schema";

export type ApartmentsDoc = Document.Document<typeof schemaDefinition, "apartments">;
export type AuthorizationsDoc = Document.Document<typeof schemaDefinition, "authorizations">;
export type FavoritesDoc = Document.Document<typeof schemaDefinition, "favorites">;
export type MembershipsDoc = Document.Document<typeof schemaDefinition, "memberships">;
export type PassesDoc = Document.Document<typeof schemaDefinition, "passes">;
export type ResidentialUnitsDoc = Document.Document<typeof schemaDefinition, "residentialUnits">;
export type ShiftReportsDoc = Document.Document<typeof schemaDefinition, "shiftReports">;
export type ShiftsDoc = Document.Document<typeof schemaDefinition, "shifts">;
export type SuperadminsDoc = Document.Document<typeof schemaDefinition, "superadmins">;
export type UsersDoc = Document.Document<typeof schemaDefinition, "users">;
export type VisitsDoc = Document.Document<typeof schemaDefinition, "visits">;

export interface Docs {
  apartments: ApartmentsDoc;
  authorizations: AuthorizationsDoc;
  favorites: FavoritesDoc;
  memberships: MembershipsDoc;
  passes: PassesDoc;
  residentialUnits: ResidentialUnitsDoc;
  shiftReports: ShiftReportsDoc;
  shifts: ShiftsDoc;
  superadmins: SuperadminsDoc;
  users: UsersDoc;
  visits: VisitsDoc;
}

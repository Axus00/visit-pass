/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as authorizations from "../authorizations.js";
import type * as crons from "../crons.js";
import type * as developmentSeeder from "../developmentSeeder.js";
import type * as http from "../http.js";
import type * as memberships from "../memberships.js";
import type * as residentialUnits from "../residentialUnits.js";
import type * as retention from "../retention.js";
import type * as shiftReports from "../shiftReports.js";
import type * as shifts from "../shifts.js";
import type * as users from "../users.js";
import type * as visits from "../visits.js";
import type * as workosAuth from "../workosAuth.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  authorizations: typeof authorizations;
  crons: typeof crons;
  developmentSeeder: typeof developmentSeeder;
  http: typeof http;
  memberships: typeof memberships;
  residentialUnits: typeof residentialUnits;
  retention: typeof retention;
  shiftReports: typeof shiftReports;
  shifts: typeof shifts;
  users: typeof users;
  visits: typeof visits;
  workosAuth: typeof workosAuth;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workOSAuthKit: import("@convex-dev/workos-authkit/_generated/component.js").ComponentApi<"workOSAuthKit">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};

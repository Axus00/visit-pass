import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import authorizations from "../../authorizations.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../authorizations.spec")["default"]>(databaseSchema, authorizations, RegisteredConvexFunction.make);

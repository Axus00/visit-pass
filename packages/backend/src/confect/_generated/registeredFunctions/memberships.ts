import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import memberships from "../../memberships.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../memberships.spec")["default"]>(databaseSchema, memberships, RegisteredConvexFunction.make);

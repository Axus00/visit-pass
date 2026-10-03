import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import apartments from "../../apartments.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../apartments.spec")["default"]>(databaseSchema, apartments, RegisteredConvexFunction.make);

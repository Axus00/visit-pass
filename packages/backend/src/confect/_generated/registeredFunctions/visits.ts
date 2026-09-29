import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import visits from "../../visits.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../visits.spec")["default"]>(databaseSchema, visits, RegisteredConvexFunction.make);

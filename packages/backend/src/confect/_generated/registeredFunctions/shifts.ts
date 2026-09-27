import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import shifts from "../../shifts.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../shifts.spec")["default"]>(databaseSchema, shifts, RegisteredConvexFunction.make);

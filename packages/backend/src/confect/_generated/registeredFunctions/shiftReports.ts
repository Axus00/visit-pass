import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import shiftReports from "../../shiftReports.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../shiftReports.spec")["default"]>(databaseSchema, shiftReports, RegisteredConvexFunction.make);

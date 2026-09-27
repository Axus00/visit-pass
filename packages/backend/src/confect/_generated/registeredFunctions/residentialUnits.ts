import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import residentialUnits from "../../residentialUnits.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../residentialUnits.spec")["default"]>(databaseSchema, residentialUnits, RegisteredConvexFunction.make);

import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import retention from "../../retention.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../retention.spec")["default"]>(databaseSchema, retention, RegisteredConvexFunction.make);

import {
  configExports,
  packageName as configPackageName,
  workspaceTaskNames
} from "@platform/config";
import { createUiShellDescriptor, packageName as uiPackageName } from "@platform/ui";
import {
  appShellIds,
  packageName as typesPackageName,
  sharedPackageNames,
  type AppShellId
} from "@platform/types";
import {
  packageName as utilsPackageName,
  parsePositiveInteger,
  trimToUndefined
} from "@platform/utils";

type PublicEntrypointContract = {
  configPackageName: string;
  configTargets: readonly string[];
  shellIds: readonly AppShellId[];
  sharedPackageNames: readonly string[];
  uiPackageName: string;
  uiShellDescriptor: {
    appId: string;
    title: string;
  };
  utilsPackageName: string;
  parsedInteger: number;
  trimmedValue: string | undefined;
  typesPackageName: string;
};

export const publicEntrypointContract: PublicEntrypointContract = {
  configPackageName,
  configTargets: [...configExports, ...workspaceTaskNames],
  shellIds: appShellIds,
  sharedPackageNames,
  uiPackageName,
  uiShellDescriptor: createUiShellDescriptor("web-customer", "Customer Portal"),
  utilsPackageName,
  parsedInteger: parsePositiveInteger("2", 1, "contract value"),
  trimmedValue: trimToUndefined(" public "),
  typesPackageName
};
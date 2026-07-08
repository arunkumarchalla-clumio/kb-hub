import type { Audience, KBFormFields } from "./types";

export interface IssueTemplate {
  id: string;
  label: string;
  description: string;
  // Partial — only the fields this template has an opinion about.
  // Title is intentionally left out: it's specific to each article.
  values: Partial<Omit<KBFormFields, "title">> & { audience?: Audience };
}

export const ISSUE_TEMPLATES: IssueTemplate[] = [
  {
    id: "network",
    label: "Network Issue",
    description: "Connectivity, VPN, DNS, firewall",
    values: {
      category: "Networking",
      audience: "Internal",
      symptoms:
        "User cannot connect to [resource]. Error message: \"[exact error text]\". Started after [recent change, e.g. firewall or router update].",
      cause: "A network or firewall change blocked a required port or protocol.",
      resolutionSteps:
        "1. Confirm the exact error message and when it started.\n2. Check firewall rules for the required port/protocol.\n3. Add or restore the necessary rule.\n4. Restart the affected network service.\n5. Have the user retest the connection.",
      keywords: "network, connectivity, firewall",
    },
  },
  {
    id: "software-install",
    label: "Software Install",
    description: "Installation failures or setup issues",
    values: {
      category: "Software Installation",
      audience: "Internal",
      symptoms: "Installation of [software name] fails with [error code/message] at [step].",
      cause: "Insufficient permissions, a missing prerequisite, or a corrupted installer.",
      resolutionSteps:
        "1. Confirm the user has local admin rights.\n2. Verify prerequisites (e.g. .NET, Visual C++ redistributables) are installed.\n3. Re-download the installer from the official source.\n4. Run the installer as administrator.\n5. Retry the installation and confirm success.",
      keywords: "installation, software, setup",
    },
  },
  {
    id: "access-request",
    label: "Access Request",
    description: "Permissions, accounts, credentials",
    values: {
      category: "Access & Permissions",
      audience: "Internal",
      symptoms: "User cannot access [system/application] and receives \"Access Denied\" or similar.",
      cause: "The user's account is missing the required group membership or license.",
      resolutionSteps:
        "1. Confirm the user's account and the system they need access to.\n2. Verify manager/owner approval for access, if required.\n3. Add the user to the appropriate security group or assign the license.\n4. Confirm access with the user.\n5. Document the approval reference.",
      keywords: "access, permissions, account",
    },
  },
];

const BRIDGE_URL = "https://bridge.simplefin.org/simplefin";

export interface SimpleFinOrg {
  domain?: string;
  name?: string;
  "sfin-url": string;
  url?: string;
  id?: string;
}

export interface SimpleFinTransaction {
  id: string;
  posted: number;
  amount: string;
  description: string;
  transacted_at?: number;
  pending?: boolean;
  extra?: Record<string, unknown>;
}

export interface SimpleFinAccount {
  org: SimpleFinOrg;
  id: string;
  name: string;
  currency: string;
  balance: string;
  "available-balance"?: string;
  "balance-date": number;
  transactions?: SimpleFinTransaction[];
  extra?: Record<string, unknown>;
}

export interface SimpleFinAccountSet {
  errors: string[];
  accounts: SimpleFinAccount[];
}

export function getCreateUrl(): string {
  return `${BRIDGE_URL}/create`;
}

export async function claimAccessUrl(setupToken: string): Promise<string> {
  const claimUrl = Buffer.from(setupToken, "base64").toString("utf-8");

  if (!claimUrl.startsWith("https://")) {
    throw new Error("Invalid SimpleFIN token: decoded URL must use HTTPS");
  }

  const response = await fetch(claimUrl, { method: "POST" });

  if (response.status === 403) {
    throw new Error(
      "SimpleFIN token already claimed or invalid. Generate a new token."
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to claim SimpleFIN token: ${response.status}`);
  }

  const accessUrl = await response.text();

  if (!accessUrl.startsWith("https://")) {
    throw new Error("Invalid access URL received from SimpleFIN");
  }

  return accessUrl.trim();
}

export async function fetchAccounts(
  accessUrl: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    pending?: boolean;
    balancesOnly?: boolean;
    accountIds?: string[];
  }
): Promise<SimpleFinAccountSet> {
  const parsed = new URL(`${accessUrl}/accounts`);

  // Extract credentials from URL and pass via Authorization header
  // fetch() rejects URLs with embedded credentials
  const headers: Record<string, string> = {};
  if (parsed.username || parsed.password) {
    const credentials = Buffer.from(
      `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`
    ).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
    parsed.username = "";
    parsed.password = "";
  }

  if (options?.startDate) {
    parsed.searchParams.set(
      "start-date",
      Math.floor(options.startDate.getTime() / 1000).toString()
    );
  }
  if (options?.endDate) {
    parsed.searchParams.set(
      "end-date",
      Math.floor(options.endDate.getTime() / 1000).toString()
    );
  }
  if (options?.pending) {
    parsed.searchParams.set("pending", "1");
  }
  if (options?.balancesOnly) {
    parsed.searchParams.set("balances-only", "1");
  }
  if (options?.accountIds) {
    for (const id of options.accountIds) {
      parsed.searchParams.append("account", id);
    }
  }

  const response = await fetch(parsed.toString(), { headers });

  if (response.status === 403) {
    throw new Error(
      "SimpleFIN access revoked or credentials invalid. Reconnect your account."
    );
  }

  if (response.status === 402) {
    throw new Error("SimpleFIN subscription payment required.");
  }

  if (!response.ok) {
    throw new Error(`SimpleFIN request failed: ${response.status}`);
  }

  return response.json() as Promise<SimpleFinAccountSet>;
}

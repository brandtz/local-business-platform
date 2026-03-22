// E8-S1-T3: Admin payment connection management views.
// Provides UI components for listing, creating, and managing payment
// gateway connections. NEVER displays credentials or secret values.

import type {
  PaymentProvider,
  PaymentConnectionStatus,
  PaymentConnectionMode,
  AdminPaymentConnectionSummary,
  PaymentConnectionHealthView,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Connection status badge display
// ---------------------------------------------------------------------------

export type ConnectionStatusBadge = {
  status: PaymentConnectionStatus;
  label: string;
  colorClass: string;
};

const statusBadgeConfig: Record<
  PaymentConnectionStatus,
  { label: string; colorClass: string }
> = {
  inactive: { label: "Inactive", colorClass: "badge-neutral" },
  verifying: { label: "Verifying", colorClass: "badge-warning" },
  active: { label: "Active", colorClass: "badge-success" },
  suspended: { label: "Suspended", colorClass: "badge-danger" },
};

export function getConnectionStatusBadge(
  status: PaymentConnectionStatus,
): ConnectionStatusBadge {
  const config = statusBadgeConfig[status];
  return {
    status,
    label: config.label,
    colorClass: config.colorClass,
  };
}

// ---------------------------------------------------------------------------
// Provider display
// ---------------------------------------------------------------------------

const providerLabels: Record<PaymentProvider, string> = {
  stripe: "Stripe",
  square: "Square",
};

const providerIcons: Record<PaymentProvider, string> = {
  stripe: "stripe-icon",
  square: "square-icon",
};

export function getProviderLabel(provider: PaymentProvider): string {
  return providerLabels[provider];
}

export function getProviderIcon(provider: PaymentProvider): string {
  return providerIcons[provider];
}

// ---------------------------------------------------------------------------
// Mode display
// ---------------------------------------------------------------------------

const modeLabels: Record<PaymentConnectionMode, string> = {
  sandbox: "Sandbox",
  production: "Production",
};

const modeBadgeClasses: Record<PaymentConnectionMode, string> = {
  sandbox: "badge-info",
  production: "badge-primary",
};

export function getModeBadge(
  mode: PaymentConnectionMode,
): { label: string; colorClass: string } {
  return {
    label: modeLabels[mode],
    colorClass: modeBadgeClasses[mode],
  };
}

// ---------------------------------------------------------------------------
// Connection list row view model
// ---------------------------------------------------------------------------

export type ConnectionListRow = {
  id: string;
  providerLabel: string;
  providerIcon: string;
  displayName: string;
  statusBadge: ConnectionStatusBadge;
  modeBadge: { label: string; colorClass: string };
  lastVerifiedLabel: string;
  canVerify: boolean;
  canDeactivate: boolean;
};

export function buildConnectionListRow(
  connection: AdminPaymentConnectionSummary,
): ConnectionListRow {
  return {
    id: connection.id,
    providerLabel: getProviderLabel(connection.provider),
    providerIcon: getProviderIcon(connection.provider),
    displayName: connection.displayName,
    statusBadge: getConnectionStatusBadge(connection.status),
    modeBadge: getModeBadge(connection.mode),
    lastVerifiedLabel: connection.lastVerifiedAt
      ? formatTimestamp(connection.lastVerifiedAt)
      : "Never verified",
    canVerify: connection.status !== "verifying",
    canDeactivate: connection.status !== "inactive",
  };
}

// ---------------------------------------------------------------------------
// Connection form validation
// ---------------------------------------------------------------------------

export type ConnectionFormField = {
  name: string;
  label: string;
  type: "text" | "password" | "select";
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

/**
 * Returns the form fields required for a given provider.
 * Credential fields are typed as "password" to prevent visual exposure.
 */
export function getProviderFormFields(
  provider: PaymentProvider,
): ConnectionFormField[] {
  const commonFields: ConnectionFormField[] = [
    {
      name: "displayName",
      label: "Connection Name",
      type: "text",
      required: true,
      placeholder: "e.g., My Stripe Production",
    },
    {
      name: "mode",
      label: "Environment",
      type: "select",
      required: true,
      options: [
        { value: "sandbox", label: "Sandbox (Test)" },
        { value: "production", label: "Production (Live)" },
      ],
    },
  ];

  if (provider === "stripe") {
    return [
      ...commonFields,
      {
        name: "publishableKey",
        label: "Publishable Key",
        type: "password",
        required: true,
        placeholder: "pk_...",
      },
      {
        name: "secretKey",
        label: "Secret Key",
        type: "password",
        required: true,
        placeholder: "sk_...",
      },
    ];
  }

  if (provider === "square") {
    return [
      ...commonFields,
      {
        name: "applicationId",
        label: "Application ID",
        type: "password",
        required: true,
        placeholder: "sq-app-...",
      },
      {
        name: "accessToken",
        label: "Access Token",
        type: "password",
        required: true,
        placeholder: "sq-token-...",
      },
      {
        name: "locationId",
        label: "Location ID",
        type: "password",
        required: true,
        placeholder: "sq-loc-...",
      },
    ];
  }

  return commonFields;
}

// ---------------------------------------------------------------------------
// Form validation errors
// ---------------------------------------------------------------------------

export type ConnectionFormErrors = Record<string, string>;

export function validateConnectionForm(
  provider: PaymentProvider,
  values: Record<string, string>,
): ConnectionFormErrors {
  const errors: ConnectionFormErrors = {};

  if (!values.displayName || values.displayName.trim().length === 0) {
    errors.displayName = "Connection name is required.";
  }

  if (!values.mode || !["sandbox", "production"].includes(values.mode)) {
    errors.mode = "Please select an environment.";
  }

  if (provider === "stripe") {
    if (!values.publishableKey || values.publishableKey.trim().length === 0) {
      errors.publishableKey = "Publishable key is required.";
    }
    if (!values.secretKey || values.secretKey.trim().length === 0) {
      errors.secretKey = "Secret key is required.";
    }
  }

  if (provider === "square") {
    if (!values.applicationId || values.applicationId.trim().length === 0) {
      errors.applicationId = "Application ID is required.";
    }
    if (!values.accessToken || values.accessToken.trim().length === 0) {
      errors.accessToken = "Access token is required.";
    }
    if (!values.locationId || values.locationId.trim().length === 0) {
      errors.locationId = "Location ID is required.";
    }
  }

  return errors;
}

/**
 * Returns true if the form has no validation errors.
 */
export function isConnectionFormValid(errors: ConnectionFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

// ---------------------------------------------------------------------------
// Health indicator
// ---------------------------------------------------------------------------

export type HealthIndicator = {
  label: string;
  colorClass: string;
  icon: string;
};

export function getHealthIndicator(
  health: PaymentConnectionHealthView,
): HealthIndicator {
  if (health.isHealthy) {
    return {
      label: "Healthy",
      colorClass: "text-success",
      icon: "check-circle",
    };
  }

  if (health.status === "verifying") {
    return {
      label: "Verifying",
      colorClass: "text-warning",
      icon: "refresh",
    };
  }

  if (health.status === "suspended") {
    return {
      label: "Suspended",
      colorClass: "text-danger",
      icon: "alert-triangle",
    };
  }

  return {
    label: "Inactive",
    colorClass: "text-muted",
    icon: "minus-circle",
  };
}

// ---------------------------------------------------------------------------
// Timestamp formatting
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

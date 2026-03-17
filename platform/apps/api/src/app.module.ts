import { Module } from "@nestjs/common";

import { AdminTenantController } from "./admin-tenant.controller";
import { AuditAttributionService } from "./auth/audit-attribution.service";
import { CustomDomainStatusQueryService } from "./auth/custom-domain-status-query.service";
import { DomainPromotionWorkflowService } from "./auth/domain-promotion-workflow.service";
import { DomainVerificationWorkflowService } from "./auth/domain-verification-workflow.service";
import { ImpersonationSessionService } from "./auth/impersonation-session.service";
import { ManagedSubdomainService } from "./auth/managed-subdomain.service";
import { MfaLifecycleService } from "./auth/mfa-lifecycle";
import { PasswordResetLifecycleService } from "./auth/password-reset-lifecycle";
import { PlatformAccessService } from "./auth/platform-access.service";
import { PlatformTenantOperationalSummaryService } from "./auth/platform-tenant-operational-summary.service";
import { PreviewEnvironmentMetadataService } from "./auth/preview-environment-metadata.service";
import { PreviewFallbackPolicyService } from "./auth/preview-fallback-policy.service";
import { PreviewRouteResolutionService } from "./auth/preview-route-resolution.service";
import { PrivilegedAuthPolicyService } from "./auth/privileged-auth-policy.service";
import { RequestContextService } from "./auth/request-context.service";
import { SecurityEventService } from "./auth/security-event.service";
import { TenantAccessService } from "./auth/tenant-access.service";
import { TenantLifecycleAuditService } from "./auth/tenant-lifecycle-audit.service";
import { TenantLifecyclePolicyService } from "./auth/tenant-lifecycle-policy.service";
import { TenantLifecycleService } from "./auth/tenant-lifecycle.service";
import { TenantCustomDomainPolicyService } from "./auth/tenant-custom-domain-policy.service";
import { ModuleRegistryService } from "./auth/module-registry.service";
import { TenantProvisioningService } from "./auth/tenant-provisioning.service";
import { TenantProvisioningSummaryService } from "./auth/tenant-provisioning-summary.service";
import { TenantProvisioningTemplateService } from "./auth/tenant-provisioning-template.service";
import { TenantPublishPolicyService } from "./auth/tenant-publish-policy.service";
import { TenantRequestPolicyService } from "./auth/tenant-request-policy.service";
import { TenantResolutionService } from "./auth/tenant-resolution.service";
import { HealthController } from "./health.controller";
import { PlatformTenantsController } from "./platform-tenants.controller";
import { TenantDirectoryQueryService } from "./tenant-directory-query.service";

@Module({
  controllers: [AdminTenantController, HealthController, PlatformTenantsController],
  providers: [
    AuditAttributionService,
    CustomDomainStatusQueryService,
    DomainPromotionWorkflowService,
    DomainVerificationWorkflowService,
    ImpersonationSessionService,
    ManagedSubdomainService,
    MfaLifecycleService,
    PasswordResetLifecycleService,
    PlatformAccessService,
    PlatformTenantOperationalSummaryService,
    PreviewEnvironmentMetadataService,
    PreviewFallbackPolicyService,
    PreviewRouteResolutionService,
    PrivilegedAuthPolicyService,
    RequestContextService,
    SecurityEventService,
    TenantAccessService,
    TenantCustomDomainPolicyService,
    ModuleRegistryService,
    TenantLifecycleAuditService,
    TenantLifecyclePolicyService,
    TenantLifecycleService,
    TenantProvisioningService,
    TenantProvisioningSummaryService,
    TenantProvisioningTemplateService,
    TenantPublishPolicyService,
    TenantRequestPolicyService,
    TenantDirectoryQueryService,
    TenantResolutionService
  ],
  exports: [
    AuditAttributionService,
    CustomDomainStatusQueryService,
    DomainPromotionWorkflowService,
    DomainVerificationWorkflowService,
    ImpersonationSessionService,
    ManagedSubdomainService,
    MfaLifecycleService,
    PasswordResetLifecycleService,
    PlatformAccessService,
    PlatformTenantOperationalSummaryService,
    PreviewEnvironmentMetadataService,
    PreviewFallbackPolicyService,
    PreviewRouteResolutionService,
    PrivilegedAuthPolicyService,
    RequestContextService,
    SecurityEventService,
    TenantAccessService,
    TenantCustomDomainPolicyService,
    ModuleRegistryService,
    TenantLifecycleAuditService,
    TenantLifecyclePolicyService,
    TenantLifecycleService,
    TenantProvisioningService,
    TenantProvisioningSummaryService,
    TenantProvisioningTemplateService,
    TenantPublishPolicyService,
    TenantRequestPolicyService,
    TenantDirectoryQueryService,
    TenantResolutionService
  ]
})
export class AppModule {}

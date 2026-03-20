import { Module } from "@nestjs/common";

import { AdminTenantController } from "./admin-tenant.controller";
import { CatalogRepository } from "./catalog/catalog.repository";
import { CatalogService } from "./catalog/catalog.service";
import { AnnouncementService } from "./content/announcement.service";
import { ContentPageService } from "./content/content-page.service";
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
import { ModuleCapabilityService } from "./auth/module-capability.service";
import { ModuleRegistryService } from "./auth/module-registry.service";
import { ModuleTemplateAssignmentService } from "./auth/module-template-assignment.service";
import { TenantProvisioningService } from "./auth/tenant-provisioning.service";
import { TenantProvisioningSummaryService } from "./auth/tenant-provisioning-summary.service";
import { TenantProvisioningTemplateService } from "./auth/tenant-provisioning-template.service";
import { TenantPublishPolicyService } from "./auth/tenant-publish-policy.service";
import { TemplateRegistryService } from "./auth/template-registry.service";
import { TenantRequestPolicyService } from "./auth/tenant-request-policy.service";
import { TenantResolutionService } from "./auth/tenant-resolution.service";
import { CatalogBulkService } from "./catalog/catalog-bulk.service";
import { CatalogCategoryService } from "./catalog/catalog-category.service";
import { CatalogInventoryService } from "./catalog/catalog-inventory.service";
import { CatalogItemService } from "./catalog/catalog-item.service";
import { CatalogModifierService } from "./catalog/catalog-modifier.service";
import { CatalogStorefrontService } from "./catalog/catalog-storefront.service";
import { StorefrontCatalogService } from "./catalog/storefront-catalog.service";
import { HealthController } from "./health.controller";
import { PlatformTenantsController } from "./platform-tenants.controller";
import { PrismaService } from "./prisma.service";
import { ServiceManagementService } from "./services/service-management.service";
import { StaffAssignmentService } from "./staff/staff-assignment.service";
import { StaffManagementService } from "./staff/staff-management.service";
import { StaffScheduleService } from "./staff/staff-schedule.service";
import { TenantDirectoryQueryService } from "./tenant-directory-query.service";
import { InquiryLeadService } from "./vertical/inquiry-lead.service";
import { VerticalTemplateService } from "./vertical/vertical-template.service";

@Module({
  controllers: [AdminTenantController, HealthController, PlatformTenantsController],
  providers: [
    PrismaService,
    AnnouncementService,
    AuditAttributionService,
    CatalogBulkService,
    CatalogCategoryService,
    CatalogInventoryService,
    CatalogItemService,
    CatalogModifierService,
    CatalogRepository,
    CatalogService,
    CatalogStorefrontService,
    ContentPageService,
    CustomDomainStatusQueryService,
    DomainPromotionWorkflowService,
    DomainVerificationWorkflowService,
    ImpersonationSessionService,
    ManagedSubdomainService,
    MfaLifecycleService,
    ModuleCapabilityService,
    PasswordResetLifecycleService,
    PlatformAccessService,
    PlatformTenantOperationalSummaryService,
    PreviewEnvironmentMetadataService,
    PreviewFallbackPolicyService,
    PreviewRouteResolutionService,
    PrivilegedAuthPolicyService,
    RequestContextService,
    SecurityEventService,
    ServiceManagementService,
    StaffAssignmentService,
    StaffManagementService,
    StaffScheduleService,
    StorefrontCatalogService,
    TenantAccessService,
    TenantCustomDomainPolicyService,
    ModuleRegistryService,
    ModuleTemplateAssignmentService,
    TenantLifecycleAuditService,
    TenantLifecyclePolicyService,
    TenantLifecycleService,
    TenantProvisioningService,
    TenantProvisioningSummaryService,
    TenantProvisioningTemplateService,
    TenantPublishPolicyService,
    TemplateRegistryService,
    TenantRequestPolicyService,
    TenantDirectoryQueryService,
    TenantResolutionService,
    VerticalTemplateService,
    InquiryLeadService
  ],
  exports: [
    PrismaService,
    AnnouncementService,
    AuditAttributionService,
    CatalogBulkService,
    CatalogCategoryService,
    CatalogInventoryService,
    CatalogItemService,
    CatalogModifierService,
    CatalogRepository,
    CatalogService,
    CatalogStorefrontService,
    ContentPageService,
    CustomDomainStatusQueryService,
    DomainPromotionWorkflowService,
    DomainVerificationWorkflowService,
    ImpersonationSessionService,
    ManagedSubdomainService,
    MfaLifecycleService,
    ModuleCapabilityService,
    PasswordResetLifecycleService,
    PlatformAccessService,
    PlatformTenantOperationalSummaryService,
    PreviewEnvironmentMetadataService,
    PreviewFallbackPolicyService,
    PreviewRouteResolutionService,
    PrivilegedAuthPolicyService,
    RequestContextService,
    SecurityEventService,
    ServiceManagementService,
    StaffAssignmentService,
    StaffManagementService,
    StaffScheduleService,
    StorefrontCatalogService,
    TenantAccessService,
    TenantCustomDomainPolicyService,
    ModuleRegistryService,
    ModuleTemplateAssignmentService,
    TenantLifecycleAuditService,
    TenantLifecyclePolicyService,
    TenantLifecycleService,
    TenantProvisioningService,
    TenantProvisioningSummaryService,
    TenantProvisioningTemplateService,
    TenantPublishPolicyService,
    TemplateRegistryService,
    TenantRequestPolicyService,
    TenantDirectoryQueryService,
    TenantResolutionService,
    VerticalTemplateService,
    InquiryLeadService
  ]
})
export class AppModule {}

/**
 * Request header set by middleware when a request arrived on a tenant
 * subdomain (slug.epuredrive.com) or a tenant custom domain. Kept in its own
 * module so the edge middleware can import it without pulling in next/headers.
 */
export const TENANT_HOST_HEADER = 'x-tenant-host'

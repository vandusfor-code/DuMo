/** Identificador de la empresa por defecto (instalación single-tenant actual). */
export const DEFAULT_COMPANY_ID = "company-default";

export type CompanyStatus = "active" | "inactive";

export interface Company {
  id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  createdAt: string;
}

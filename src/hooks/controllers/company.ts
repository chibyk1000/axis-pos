import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/database";
import { eq, and } from "drizzle-orm";
import { companies, voidReasons } from "@/db/schema";
import type {
  Company,
  NewCompany,
  VoidReason,
  NewVoidReason,
  CompanyWithRelations,
} from "@/db/schema";

export type {
  Company,
  NewCompany,
  VoidReason,
  NewVoidReason,
  CompanyWithRelations,
};

/* -------------------------------------------------------------------------- */
/*                                    KEYS                                    */
/* -------------------------------------------------------------------------- */

export const companyKeys = {
  all: ["companies"] as const,
  list: () => [...companyKeys.all, "list"] as const,
  byId: (id: string) => [...companyKeys.all, "byId", id] as const,
  default: () => [...companyKeys.all, "default"] as const,
  voidReasons: (id: string) => [...companyKeys.all, id, "voidReasons"] as const,
};

/* -------------------------------------------------------------------------- */
/*                                  QUERIES                                   */
/* -------------------------------------------------------------------------- */

export function useCompanies() {
  return useQuery({
    queryKey: companyKeys.list(),
    queryFn: () =>
      db.query.companies.findMany({
        orderBy: (c) => c.name,
        with: { voidReasons: { orderBy: (v) => v.position } },
      }) as Promise<CompanyWithRelations[]>,
  });
}

export function useCompanyById(id: string) {
  return useQuery({
    queryKey: companyKeys.byId(id),
    enabled: !!id,
    queryFn: async () => {
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, id),
        with: { voidReasons: { orderBy: (v) => v.position } },
      });
      if (!company) throw new Error("Company not found");
      return company as CompanyWithRelations;
    },
  });
}

export function useDefaultCompany() {
  return useQuery({
    queryKey: companyKeys.default(),
    queryFn: async () => {
      const company = await db.query.companies.findFirst({
        where: eq(companies.isDefault, true),
        with: { voidReasons: { orderBy: (v) => v.position } },
      });
      return (company ?? null) as CompanyWithRelations | null;
    },
  });
}

export function useVoidReasons(companyId: string) {
  return useQuery({
    queryKey: companyKeys.voidReasons(companyId),
    enabled: !!companyId,
    queryFn: () =>
      db.query.voidReasons.findMany({
        where: eq(voidReasons.companyId, companyId),
        orderBy: (v) => v.position,
      }),
  });
}

/* -------------------------------------------------------------------------- */
/*                            COMPANY MUTATIONS                               */
/* -------------------------------------------------------------------------- */

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: NewCompany) => {
      // If this is set as default, clear other defaults first
      if (data.isDefault) {
        await db.update(companies).set({ isDefault: false });
      }
      await db.insert(companies).values(data);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.list() });
      qc.invalidateQueries({ queryKey: companyKeys.default() });
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Company, "id" | "createdAt">>;
    }) => {
      const existing = await db.query.companies.findFirst({
        where: eq(companies.id, id),
      });
      if (!existing) throw new Error("Company not found");

      if (data.isDefault) {
        await db.update(companies).set({ isDefault: false });
      }
      await db.update(companies).set(data).where(eq(companies.id, id));
      const updated = await db.query.companies.findFirst({ where: eq(companies.id, id) });
      return updated as Company;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: companyKeys.byId(id) });
      qc.invalidateQueries({ queryKey: companyKeys.list() });
      qc.invalidateQueries({ queryKey: companyKeys.default() });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const existing = await db.query.companies.findFirst({
        where: eq(companies.id, id),
      });
      if (!existing) throw new Error("Company not found");
      await db.delete(companies).where(eq(companies.id, id));
      return existing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.list() });
      qc.invalidateQueries({ queryKey: companyKeys.default() });
    },
  });
}

export function useSetDefaultCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.update(companies).set({ isDefault: false });
      await db.update(companies).set({ isDefault: true }).where(eq(companies.id, id));
      const updated = await db.query.companies.findFirst({ where: eq(companies.id, id) });
      return updated as Company;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.list() });
      qc.invalidateQueries({ queryKey: companyKeys.default() });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                          VOID REASON MUTATIONS                             */
/* -------------------------------------------------------------------------- */

export function useCreateVoidReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: NewVoidReason) => {
      await db.insert(voidReasons).values(data);
      return data as NewVoidReason;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: companyKeys.voidReasons(vars.companyId),
      });
      qc.invalidateQueries({ queryKey: companyKeys.byId(vars.companyId) });
    },
  });
}

export function useUpdateVoidReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      companyId,
      data,
    }: {
      id: string;
      companyId: string;
      data: Partial<Omit<VoidReason, "id" | "companyId" | "createdAt">>;
    }) => {
      await db
        .update(voidReasons)
        .set(data)
        .where(
          and(eq(voidReasons.id, id), eq(voidReasons.companyId, companyId)),
        );
      const updated = await db.query.voidReasons.findFirst({ where: and(eq(voidReasons.id, id), eq(voidReasons.companyId, companyId)) });
      return updated as VoidReason;
    },
    onSuccess: (_, { companyId }) => {
      qc.invalidateQueries({ queryKey: companyKeys.voidReasons(companyId) });
      qc.invalidateQueries({ queryKey: companyKeys.byId(companyId) });
    },
  });
}

export function useDeleteVoidReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      companyId,
    }: {
      id: string;
      companyId: string;
    }) => {
      await db.delete(voidReasons).where(eq(voidReasons.id, id));
      return { id, companyId };
    },
    onSuccess: (_, { companyId }) => {
      qc.invalidateQueries({ queryKey: companyKeys.voidReasons(companyId) });
      qc.invalidateQueries({ queryKey: companyKeys.byId(companyId) });
    },
  });
}

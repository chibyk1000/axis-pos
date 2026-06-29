// hooks/controllers/countries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { countries } from "@/db/schema/countries";
import { count, eq, like, or } from "drizzle-orm";
import { db } from "@/db/database";
import { allCountries } from "@/lib/data";

export const countryKeys = {
  all: ["countries"] as const,
  page: (page: number, pageSize: number, search: string) =>
    ["countries", "page", page, pageSize, search] as const,
  count: (search: string) => ["countries", "count", search] as const,
};

// Fetch all countries
export function useCountries() {
  return useQuery({
    queryKey: countryKeys.all,
    queryFn: () => db.select().from(countries),
  });
}

export function useCountriesPage(
  page: number,
  pageSize: number,
  search: string = "",
) {
  return useQuery({
    queryKey: countryKeys.page(page, pageSize, search),
    queryFn: () =>
      db
        .select()
        .from(countries)
        .where(
          search.trim()
            ? or(
                like(countries.name, `%${search.trim()}%`),
                like(countries.code, `%${search.trim()}%`),
              )
            : undefined,
        )
        .orderBy(countries.position, countries.name)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    placeholderData: (prev) => prev,
  });
}

export function useCountriesCount(search: string = "") {
  return useQuery({
    queryKey: countryKeys.count(search),
    queryFn: async () => {
      const [row] = await db
        .select({ total: count(countries.id) })
        .from(countries)
        .where(
          search.trim()
            ? or(
                like(countries.name, `%${search.trim()}%`),
                like(countries.code, `%${search.trim()}%`),
              )
            : undefined,
        );
      return row?.total ?? 0;
    },
  });
}

// Create a new country
export function useCreateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      code: string;
      position?: number;
    }) => {
      await db.insert(countries).values({
        id: crypto.randomUUID(),
        name: data.name,
        code: data.code,
        position: data.position ?? 0,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: countryKeys.all }),
  });
}

// Update a country
export function useUpdateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; code: string; position?: number };
    }) => {
      await db.update(countries).set(data).where(eq(countries.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: countryKeys.all }),
  });
}

// Delete a country
export function useDeleteCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(countries).where(eq(countries.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: countryKeys.all }),
  });
}

export async function seedCountriesIfEmpty() {
  // Check if countries table already has data
  const existing = await db.select().from(countries);

  if (existing.length > 0) {
    console.log("Countries already exist, skipping seed.");
    return;
  }

  // Prepare insert values
  const values = allCountries.map((c) => ({
    id: crypto.randomUUID(),
    name: c.name,
    code: c.code,
  }));

  // Insert all countries
  await db.insert(countries).values(values);

  console.log(`Seeded ${values.length} countries successfully.`);
}

// hooks/controllers/countries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { countries } from "@/db/schema/countries";
import { eq } from "drizzle-orm";
import { db } from "@/db/database";
import { allCountries } from "@/lib/data";

// Fetch all countries
export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: () => db.select().from(countries),
  });
}

// Create a new country
export function useCreateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code: string }) => {
      await db.insert(countries).values({
        id: crypto.randomUUID(),
        name: data.name,
        code: data.code,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["countries"] }),
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
      data: { name: string; code: string };
    }) => {
      await db.update(countries).set(data).where(eq(countries.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["countries"] }),
  });
}

// Delete a country
export function useDeleteCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(countries).where(eq(countries.id, id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["countries"] }),
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
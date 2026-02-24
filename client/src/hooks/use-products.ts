import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useProducts(categoryId?: number) {
  return useQuery({
    queryKey: [api.products.list.path, categoryId],
    queryFn: async () => {
      const url = new URL(api.products.list.path, window.location.origin);
      if (categoryId) {
        url.searchParams.append("categoryId", categoryId.toString());
      }
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return api.products.list.responses[200].parse(await res.json());
    },
    enabled: categoryId !== undefined, // Only fetch if categoryId is provided (optional behavior based on UI needs)
  });
}

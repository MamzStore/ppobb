import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type TransactionInput } from "@shared/routes";

export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: [api.transactions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.transactions.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch transaction");
      return api.transactions.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: TransactionInput) => {
      const validated = api.transactions.create.input.parse(data);
      const res = await fetch(api.transactions.create.path, {
        method: api.transactions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = api.transactions.create.responses[400].parse(await res.json());
          throw new Error(err.message || "Bad request");
        }
        throw new Error("Failed to create transaction");
      }
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.users.me.path] }); // Refresh balance
    },
  });
}

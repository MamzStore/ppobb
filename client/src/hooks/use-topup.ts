import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Topup } from "@shared/schema";

export function useTopups() {
  return useQuery<Topup[]>({
    queryKey: ["/api/topup"],
  });
}

export function useTopupStatus(id: number | null, enabled: boolean) {
  return useQuery<Topup>({
    queryKey: ["/api/topup", id],
    queryFn: () => fetch(`/api/topup/${id}`).then(r => r.json()),
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const data = query.state.data as Topup | undefined;
      if (!data) return 5000;
      if (data.status === "pending") return 5000;
      return false;
    },
  });
}

export function useCreateTopup() {
  const queryClient = useQueryClient();
  return useMutation<Topup, Error, { amount: number; userId: number }>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/topup/create", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal membuat pembayaran");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topup"] });
    },
  });
}

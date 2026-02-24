import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export type SafeUser = {
  id: number;
  username: string;
  role: string;
  balance: number;
  createdAt: string | null;
};

export function useMe() {
  return useQuery<SafeUser | null>({
    queryKey: [api.users.me.path],
    queryFn: async () => {
      const res = await fetch(api.users.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<SafeUser, Error, { username: string; password: string }>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", api.auth.login.path, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login gagal");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.users.me.path], user);
      queryClient.invalidateQueries({ queryKey: [api.users.me.path] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation<SafeUser, Error, { username: string; password: string }>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", api.auth.register.path, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registrasi gagal");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.users.me.path], user);
      queryClient.invalidateQueries({ queryKey: [api.users.me.path] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", api.auth.logout.path, {});
    },
    onSuccess: () => {
      queryClient.setQueryData([api.users.me.path], null);
      queryClient.clear();
    },
  });
}

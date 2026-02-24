import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type User } from "@shared/schema";

export function useMe() {
  return useQuery({
    queryKey: [api.users.me.path],
    queryFn: async () => {
      const res = await fetch(api.users.me.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch user");
      }
      return api.users.me.responses[200].parse(await res.json());
    },
  });
}

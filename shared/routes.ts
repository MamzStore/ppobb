import { z } from 'zod';
import { insertTransactionSchema, users, categories, products, transactions } from './schema';

// Shared Error Schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  badRequest: z.object({
    message: z.string(),
  }),
};

// API Contract
export const api = {
  users: {
    me: {
      method: 'GET' as const,
      path: '/api/users/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      input: z.object({
        categoryId: z.coerce.number().optional()
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      responses: {
        200: z.array(z.any()), // Transaction with Product relation
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions' as const,
      input: insertTransactionSchema.extend({
        productId: z.coerce.number(),
        userId: z.coerce.number().default(1), // Mocking user
      }),
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.badRequest,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/transactions/:id' as const,
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
};

// Helper for frontend URL building
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Type inferences
export type TransactionInput = z.infer<typeof api.transactions.create.input>;
export type TransactionResponse = z.infer<typeof api.transactions.create.responses[201]>;

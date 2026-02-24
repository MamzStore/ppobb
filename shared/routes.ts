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
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: z.object({
        categoryId: z.coerce.number(),
        brand: z.string().optional().nullable(),
        subBrand: z.string().optional().nullable(),
        name: z.string().min(1),
        code: z.string().min(1),
        price: z.coerce.number().min(1),
        isActive: z.boolean().optional().default(true),
      }),
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.badRequest,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id' as const,
      input: z.object({
        categoryId: z.coerce.number().optional(),
        brand: z.string().optional().nullable(),
        subBrand: z.string().optional().nullable(),
        name: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
        price: z.coerce.number().min(1).optional(),
        isActive: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  admin: {
    adjustBalance: {
      method: 'POST' as const,
      path: '/api/admin/users/:id/balance' as const,
      input: z.object({
        amount: z.coerce.number(),
        type: z.enum(['add', 'subtract', 'set']),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.badRequest,
        404: errorSchemas.notFound,
      },
    },
    listUsers: {
      method: 'GET' as const,
      path: '/api/admin/users' as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
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
    },
    checkStatus: {
      method: 'POST' as const,
      path: '/api/transactions/:id/check-status' as const,
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.badRequest,
        404: errorSchemas.notFound,
      },
    },
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

// Topup API contracts (added separately to avoid circular deps with topups table type)
export const topupApi = {
  create: {
    method: 'POST' as const,
    path: '/api/topup/create' as const,
    input: z.object({
      amount: z.coerce.number().min(10000).max(5000000),
      userId: z.coerce.number().default(1),
    }),
  },
  webhook: {
    method: 'POST' as const,
    path: '/api/topup/webhook' as const,
  },
  get: {
    method: 'GET' as const,
    path: '/api/topup/:id' as const,
  },
  list: {
    method: 'GET' as const,
    path: '/api/topup' as const,
  },
};

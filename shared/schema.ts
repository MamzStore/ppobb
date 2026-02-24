import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  balance: integer("balance").notNull().default(0), // Balance in cents/rupiah
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull(), // lucide-react icon name
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  price: integer("price").notNull(), // Price in cents/rupiah
  isActive: boolean("is_active").notNull().default(true),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  targetNumber: text("target_number").notNull(), // Phone number, PLN meter, etc.
  amount: integer("amount").notNull(), // Snapshot of price at purchase time
  status: text("status").notNull().default("pending"), // pending, success, failed
  telegramMessageId: text("telegram_message_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [transactions.productId],
    references: [products.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  amount: true,
  telegramMessageId: true 
});

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Request types
export type CreateTransactionRequest = InsertTransaction;

// Response types
export type UserResponse = User;
export type CategoriesListResponse = Category[];
export type ProductsListResponse = Product[];
export type TransactionsListResponse = (Transaction & { product?: Product })[];
export type TransactionResponse = Transaction;

// Query Params
export interface ProductsQueryParams {
  categoryId?: number;
}

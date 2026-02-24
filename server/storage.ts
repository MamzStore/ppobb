import { db } from "./db";
import {
  users, categories, products, transactions,
  type User, type Category, type Product, type Transaction,
  type InsertUser, type CreateTransactionRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getCategories(): Promise<Category[]>;
  getProducts(categoryId?: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getTransactions(userId: number): Promise<(Transaction & { product?: Product })[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(tx: CreateTransactionRequest & { amount: number }): Promise<Transaction>;
  updateUserBalance(userId: number, newBalance: number): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getProducts(categoryId?: number): Promise<Product[]> {
    if (categoryId !== undefined) {
      return await db.select().from(products).where(eq(products.categoryId, categoryId));
    }
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getTransactions(userId: number): Promise<(Transaction & { product?: Product })[]> {
    const records = await db.select({
      transaction: transactions,
      product: products
    }).from(transactions)
      .leftJoin(products, eq(transactions.productId, products.id))
      .where(eq(transactions.userId, userId));
      
    return records.map(r => ({
      ...r.transaction,
      product: r.product || undefined
    }));
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
    return tx;
  }

  async createTransaction(tx: CreateTransactionRequest & { amount: number }): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values(tx).returning();
    return newTx;
  }
  
  async updateUserBalance(userId: number, newBalance: number): Promise<User> {
    const [updated] = await db.update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();

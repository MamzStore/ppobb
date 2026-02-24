import { db } from "./db";
import {
  users, categories, products, transactions,
  type User, type Category, type Product, type Transaction,
  type InsertProduct, type CreateTransactionRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getCategories(): Promise<Category[]>;
  getProducts(categoryId?: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  getTransactions(userId: number): Promise<(Transaction & { product?: Product })[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(tx: CreateTransactionRequest & { amount: number }): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Pick<Transaction, "status" | "refId" | "serialNumber">>): Promise<Transaction>;
  updateUserBalance(userId: number, newBalance: number): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [updated] = await db.update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
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

  async updateTransaction(id: number, updates: Partial<Pick<Transaction, "status" | "refId" | "serialNumber">>): Promise<Transaction> {
    const [updated] = await db.update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return updated;
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

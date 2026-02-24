import { db } from "./db";
import {
  users, categories, products, transactions, topups,
  type User, type Category, type Product, type Transaction, type Topup,
  type InsertProduct, type CreateTransactionRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: { username: string; password: string; role?: string }): Promise<User>;
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
  createTopup(data: { userId: number; amount: number; refId: string }): Promise<Topup>;
  getTopup(id: number): Promise<Topup | undefined>;
  getTopupByRefId(refId: string): Promise<Topup | undefined>;
  updateTopup(id: number, updates: Partial<Pick<Topup, "status" | "trxId" | "amountUnique" | "qrString" | "expiredAt">>): Promise<Topup>;
  getTopups(userId: number): Promise<Topup[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(data: { username: string; password: string; role?: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      username: data.username,
      password: data.password,
      role: data.role || "user",
    }).returning();
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

  async createTopup(data: { userId: number; amount: number; refId: string }): Promise<Topup> {
    const [newTopup] = await db.insert(topups).values(data).returning();
    return newTopup;
  }

  async getTopup(id: number): Promise<Topup | undefined> {
    const [topup] = await db.select().from(topups).where(eq(topups.id, id));
    return topup;
  }

  async getTopupByRefId(refId: string): Promise<Topup | undefined> {
    const [topup] = await db.select().from(topups).where(eq(topups.refId, refId));
    return topup;
  }

  async updateTopup(id: number, updates: Partial<Pick<Topup, "status" | "trxId" | "amountUnique" | "qrString" | "expiredAt">>): Promise<Topup> {
    const [updated] = await db.update(topups)
      .set(updates)
      .where(eq(topups.id, id))
      .returning();
    return updated;
  }

  async getTopups(userId: number): Promise<Topup[]> {
    return await db.select().from(topups)
      .where(eq(topups.userId, userId))
      .orderBy(topups.createdAt);
  }
}

export const storage = new DatabaseStorage();

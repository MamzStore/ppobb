import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { createMamzTransaction, checkMamzStatus } from "./mamzstore";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  seedDatabase().catch(console.error);

  // === USERS ===
  app.get(api.users.me.path, async (req, res) => {
    const user = await storage.getUser(1);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  // === CATEGORIES ===
  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  // === PRODUCTS ===
  app.get(api.products.list.path, async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const prods = await storage.getProducts(categoryId);
    res.json(prods);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.products.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.products.update.input.parse(req.body);
      const existing = await storage.getProduct(id);
      if (!existing) return res.status(404).json({ message: "Produk tidak ditemukan" });
      const updated = await storage.updateProduct(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getProduct(id);
    if (!existing) return res.status(404).json({ message: "Produk tidak ditemukan" });
    await storage.deleteProduct(id);
    res.status(204).send();
  });

  // === ADMIN ===
  app.get(api.admin.listUsers.path, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post(api.admin.adjustBalance.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.admin.adjustBalance.input.parse(req.body);
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

      let newBalance = user.balance;
      if (input.type === "add") {
        newBalance = user.balance + input.amount;
      } else if (input.type === "subtract") {
        newBalance = user.balance - input.amount;
        if (newBalance < 0) return res.status(400).json({ message: "Saldo tidak boleh minus" });
      } else if (input.type === "set") {
        newBalance = input.amount;
        if (newBalance < 0) return res.status(400).json({ message: "Saldo tidak boleh minus" });
      }

      const updated = await storage.updateUserBalance(id, newBalance);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === TRANSACTIONS ===
  app.get(api.transactions.list.path, async (req, res) => {
    const txs = await storage.getTransactions(1);
    res.json(txs);
  });

  app.get(api.transactions.get.path, async (req, res) => {
    const tx = await storage.getTransaction(Number(req.params.id));
    if (!tx) return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    res.json(tx);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);

      const product = await storage.getProduct(input.productId);
      if (!product) return res.status(400).json({ message: "Produk tidak ditemukan" });

      if (!product.isActive) return res.status(400).json({ message: "Produk tidak tersedia saat ini" });

      const user = await storage.getUser(input.userId);
      if (!user) return res.status(400).json({ message: "User tidak ditemukan" });

      if (user.balance < product.price) {
        return res.status(400).json({ message: "Saldo tidak cukup" });
      }

      // Deduct balance
      await storage.updateUserBalance(user.id, user.balance - product.price);

      // Create transaction record
      let tx = await storage.createTransaction({ ...input, amount: product.price });

      // Call MamzStore API
      if (process.env.MAMZSTORE_API_KEY) {
        try {
          const mamzResponse = await createMamzTransaction(product.code, input.targetNumber);
          if (mamzResponse.status && mamzResponse.data) {
            tx = await storage.updateTransaction(tx.id, {
              refId: mamzResponse.data.ref_id,
              status: "pending",
            });
          } else {
            // Refund on MamzStore failure
            await storage.updateUserBalance(user.id, user.balance);
            await storage.updateTransaction(tx.id, { status: "failed" });
            return res.status(400).json({ message: mamzResponse.message || "Transaksi ditolak provider" });
          }
        } catch (mamzErr) {
          console.error("MamzStore API error:", mamzErr);
          await storage.updateUserBalance(user.id, user.balance);
          await storage.updateTransaction(tx.id, { status: "failed" });
          return res.status(500).json({ message: "Gagal terhubung ke provider. Silakan coba lagi." });
        }
      }

      res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.transactions.checkStatus.path, async (req, res) => {
    try {
      const tx = await storage.getTransaction(Number(req.params.id));
      if (!tx) return res.status(404).json({ message: "Transaksi tidak ditemukan" });

      if (!tx.refId) return res.status(400).json({ message: "Transaksi belum memiliki ref_id dari provider" });

      if (!process.env.MAMZSTORE_API_KEY) return res.status(400).json({ message: "API Key belum dikonfigurasi" });

      const statusResponse = await checkMamzStatus(tx.refId);
      if (!statusResponse.status || !statusResponse.data) {
        return res.status(400).json({ message: "Gagal mendapat status dari provider" });
      }

      const mamzStatus = statusResponse.data.status;
      const sn = statusResponse.data.sn;

      let newStatus: string = tx.status;
      let serialNumber: string | undefined;

      if (mamzStatus === "Sukses") {
        newStatus = "success";
        serialNumber = sn || undefined;
      } else if (mamzStatus === "Gagal") {
        newStatus = "failed";
        // Refund if not already failed
        if (tx.status !== "failed") {
          const user = await storage.getUser(tx.userId);
          if (user) await storage.updateUserBalance(user.id, user.balance + tx.amount);
        }
      }

      const updated = await storage.updateTransaction(tx.id, {
        status: newStatus,
        ...(serialNumber ? { serialNumber } : {}),
      });

      res.json(updated);
    } catch (err) {
      console.error("Check status error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

async function seedDatabase() {
  const { db } = await import("./db");
  const { users, categories, products } = await import("@shared/schema");

  let user = await storage.getUser(1);
  if (!user) {
    await db.insert(users).values({ id: 1, username: "testuser", balance: 500000 });
  }

  const cats = await storage.getCategories();
  if (cats.length === 0) {
    const insertedCats = await db.insert(categories).values([
      { name: "Pulsa", slug: "pulsa", icon: "Smartphone" },
      { name: "Paket Data", slug: "data", icon: "Wifi" },
      { name: "Token PLN", slug: "pln", icon: "Zap" },
      { name: "Voucher Game", slug: "game", icon: "Gamepad2" },
    ]).returning();

    if (insertedCats.length > 0) {
      const pulsaCat = insertedCats.find(c => c.slug === "pulsa")?.id;
      const dataCat = insertedCats.find(c => c.slug === "data")?.id;
      const plnCat = insertedCats.find(c => c.slug === "pln")?.id;

      const prodsToInsert: any[] = [];
      if (pulsaCat) {
        prodsToInsert.push(
          { categoryId: pulsaCat, name: "Telkomsel 10.000", code: "TSEL10", price: 10500 },
          { categoryId: pulsaCat, name: "Telkomsel 20.000", code: "TSEL20", price: 20500 },
          { categoryId: pulsaCat, name: "Indosat 10.000", code: "ISAT10", price: 10500 }
        );
      }
      if (dataCat) {
        prodsToInsert.push(
          { categoryId: dataCat, name: "Data Tsel 5GB", code: "TSELD5", price: 55000 },
          { categoryId: dataCat, name: "Data XL 10GB", code: "XLD10", price: 85000 }
        );
      }
      if (plnCat) {
        prodsToInsert.push(
          { categoryId: plnCat, name: "Token PLN 20.000", code: "PLN20", price: 22000 },
          { categoryId: plnCat, name: "Token PLN 50.000", code: "PLN50", price: 52000 }
        );
      }

      if (prodsToInsert.length > 0) {
        await db.insert(products).values(prodsToInsert);
      }
    }
  }
}

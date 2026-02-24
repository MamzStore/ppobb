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
  
  // Seed Database on startup
  seedDatabase().catch(console.error);

  // Users
  app.get(api.users.me.path, async (req, res) => {
    const user = await storage.getUser(1); // Hardcoded to 1 for MVP
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  });

  // Categories
  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  // Products
  app.get(api.products.list.path, async (req, res) => {
    let categoryId: number | undefined;
    if (req.query.categoryId) {
      categoryId = Number(req.query.categoryId);
    }
    const prods = await storage.getProducts(categoryId);
    res.json(prods);
  });

  // Transactions - List
  app.get(api.transactions.list.path, async (req, res) => {
    const txs = await storage.getTransactions(1); // Hardcoded user 1
    res.json(txs);
  });

  // Transactions - Get by ID
  app.get(api.transactions.get.path, async (req, res) => {
    const tx = await storage.getTransaction(Number(req.params.id));
    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json(tx);
  });

  // Transactions - Create (with MamzStore integration)
  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      
      const product = await storage.getProduct(input.productId);
      if (!product) {
        return res.status(400).json({ message: "Product not found" });
      }
      
      const user = await storage.getUser(input.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      if (user.balance < product.price) {
        return res.status(400).json({ message: "Saldo tidak cukup" });
      }
      
      // Deduct balance first
      await storage.updateUserBalance(user.id, user.balance - product.price);
      
      // Create transaction record in DB with pending status
      let tx = await storage.createTransaction({
        ...input,
        amount: product.price,
      });

      // Call MamzStore API if API key is configured
      if (process.env.MAMZSTORE_API_KEY) {
        try {
          const mamzResponse = await createMamzTransaction(
            product.code,
            input.targetNumber
          );

          if (mamzResponse.status && mamzResponse.data) {
            // Update transaction with ref_id from MamzStore
            tx = await storage.updateTransaction(tx.id, {
              refId: mamzResponse.data.ref_id,
              status: "pending",
            });
          } else {
            // MamzStore returned error — refund the user
            await storage.updateUserBalance(user.id, user.balance);
            await storage.updateTransaction(tx.id, { status: "failed" });
            return res.status(400).json({
              message: mamzResponse.message || "Transaksi gagal di provider",
            });
          }
        } catch (mamzErr) {
          console.error("MamzStore API error:", mamzErr);
          // If MamzStore call fails, refund and mark failed
          await storage.updateUserBalance(user.id, user.balance);
          await storage.updateTransaction(tx.id, { status: "failed" });
          return res.status(500).json({ message: "Gagal terhubung ke provider. Silakan coba lagi." });
        }
      }
      
      res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Transactions - Check Status (polls MamzStore)
  app.post(api.transactions.checkStatus.path, async (req, res) => {
    try {
      const tx = await storage.getTransaction(Number(req.params.id));
      if (!tx) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (!tx.refId) {
        return res.status(400).json({ message: "Transaksi ini tidak memiliki ref_id dari provider" });
      }

      if (!process.env.MAMZSTORE_API_KEY) {
        return res.status(400).json({ message: "MAMZSTORE_API_KEY belum dikonfigurasi" });
      }

      const statusResponse = await checkMamzStatus(tx.refId);
      
      if (!statusResponse.status || !statusResponse.data) {
        return res.status(400).json({ message: "Gagal mengecek status dari provider" });
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
        // MamzStore auto-refunds balance on their side, but we refund ours too
        const user = await storage.getUser(tx.userId);
        if (user && tx.status !== "failed") {
          await storage.updateUserBalance(user.id, user.balance + tx.amount);
        }
      }
      // If still "Pending", no change

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
  
  // Seed user
  let user = await storage.getUser(1);
  if (!user) {
    await db.insert(users).values({ id: 1, username: "testuser", balance: 500000 });
  }

  // Seed categories
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
      
      const prodsToInsert = [];
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

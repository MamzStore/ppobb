import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, topupApi } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import { createMamzTransaction, checkMamzStatus } from "./mamzstore";
import { createMamzPayment } from "./mamzpay";

// === MIDDLEWARE ===
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Silakan login terlebih dahulu" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Silakan login terlebih dahulu" });
  }
  if (req.session.userRole !== "admin") {
    return res.status(403).json({ message: "Akses ditolak: hanya admin" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  seedDatabase().catch(console.error);

  // === AUTH ===

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }
      const hashed = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ username: input.username, password: hashed, role: "user" });
      req.session.userId = user.id;
      req.session.userRole = user.role;
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      if (!user) {
        return res.status(401).json({ message: "Username atau password salah" });
      }
      const valid = user.password
        ? await bcrypt.compare(input.password, user.password)
        : false;
      if (!valid) {
        return res.status(401).json({ message: "Username atau password salah" });
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  // === USERS ===
  app.get(api.users.me.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Tidak terautentikasi" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
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

  app.post(api.products.create.path, requireAdmin, async (req, res) => {
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

  app.patch(api.products.update.path, requireAdmin, async (req, res) => {
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

  app.delete(api.products.delete.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getProduct(id);
    if (!existing) return res.status(404).json({ message: "Produk tidak ditemukan" });
    await storage.deleteProduct(id);
    res.status(204).send();
  });

  // === ADMIN ===
  app.get(api.admin.listUsers.path, requireAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map(({ password: _, ...u }) => u));
  });

  app.post(api.admin.adjustBalance.path, requireAdmin, async (req, res) => {
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
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === TRANSACTIONS ===
  app.get(api.transactions.list.path, requireAuth, async (req, res) => {
    const txs = await storage.getTransactions(req.session.userId!);
    res.json(txs);
  });

  app.get(api.transactions.get.path, requireAuth, async (req, res) => {
    const tx = await storage.getTransaction(Number(req.params.id));
    if (!tx) return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    res.json(tx);
  });

  app.post(api.transactions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const userId = req.session.userId!;

      const product = await storage.getProduct(input.productId);
      if (!product) return res.status(400).json({ message: "Produk tidak ditemukan" });
      if (!product.isActive) return res.status(400).json({ message: "Produk tidak tersedia saat ini" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(400).json({ message: "User tidak ditemukan" });

      if (user.balance < product.price) {
        return res.status(400).json({ message: "Saldo tidak cukup" });
      }

      await storage.updateUserBalance(user.id, user.balance - product.price);

      let tx = await storage.createTransaction({ ...input, userId, amount: product.price });

      if (process.env.MAMZSTORE_API_KEY) {
        try {
          const mamzResponse = await createMamzTransaction(product.code, input.targetNumber);
          if (mamzResponse.status && mamzResponse.data) {
            tx = await storage.updateTransaction(tx.id, {
              refId: mamzResponse.data.ref_id,
              status: "pending",
            });
          } else {
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

  app.post(api.transactions.checkStatus.path, requireAuth, async (req, res) => {
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

  // === TOPUP ===

  app.post(topupApi.create.path, requireAuth, async (req, res) => {
    try {
      const input = topupApi.create.input.parse(req.body);
      const userId = req.session.userId!;

      if (!process.env.MAMZPAY_API_KEY) {
        return res.status(400).json({ message: "MAMZPAY_API_KEY belum dikonfigurasi. Tambahkan di Secrets." });
      }

      const refId = `TU-${Date.now()}`;
      const domain = process.env.REPLIT_DOMAINS;
      const callbackUrl = domain
        ? `https://${domain}/api/topup/webhook`
        : `http://localhost:5000/api/topup/webhook`;

      const mamzResponse = await createMamzPayment(input.amount, refId, callbackUrl);

      if (!mamzResponse.status || !mamzResponse.data) {
        return res.status(400).json({ message: mamzResponse.message || "Gagal membuat pembayaran" });
      }

      const { trx_id, amount_unique, qr_string, expired_in } = mamzResponse.data;
      const expiredAt = new Date(Date.now() + expired_in * 1000);

      let topup = await storage.createTopup({ userId, amount: input.amount, refId });
      topup = await storage.updateTopup(topup.id, {
        trxId: trx_id,
        amountUnique: amount_unique,
        qrString: qr_string,
        expiredAt,
      });

      res.status(201).json(topup);
    } catch (err: any) {
      console.error("Create topup error:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // Webhook — no auth required (called by payment gateway)
  app.post(topupApi.webhook.path, async (req, res) => {
    try {
      const { status, ref_id } = req.body;

      if (status !== "PAID" || !ref_id) {
        return res.status(400).json({ message: "Invalid webhook payload" });
      }

      const topup = await storage.getTopupByRefId(ref_id);
      if (!topup) {
        console.warn(`Webhook: topup not found for ref_id=${ref_id}`);
        return res.status(200).json({ ok: true });
      }

      if (topup.status === "paid") {
        return res.status(200).json({ ok: true });
      }

      await storage.updateTopup(topup.id, { status: "paid" });

      const user = await storage.getUser(topup.userId);
      if (user) {
        await storage.updateUserBalance(user.id, user.balance + topup.amount);
      }

      console.log(`[Topup] Payment confirmed: ref_id=${ref_id}, amount=${topup.amount}, user=${topup.userId}`);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/topup/:id", requireAuth, async (req, res) => {
    const topup = await storage.getTopup(Number(req.params.id));
    if (!topup) return res.status(404).json({ message: "Topup tidak ditemukan" });
    res.json(topup);
  });

  app.get("/api/topup", requireAuth, async (req, res) => {
    const topups = await storage.getTopups(req.session.userId!);
    res.json(topups);
  });

  return httpServer;
}

async function seedDatabase() {
  const { db } = await import("./db");
  const { users, categories, products } = await import("@shared/schema");

  // Seed admin user if no users exist
  const allUsers = await storage.getAllUsers();
  if (allUsers.length === 0) {
    const hashed = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      username: "admin",
      password: hashed,
      role: "admin",
      balance: 0,
    });
    console.log("[Seed] Admin user created: admin / admin123");
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
          { categoryId: pulsaCat, brand: "Telkomsel", name: "Telkomsel 10.000", code: "TSEL10", price: 10500 },
          { categoryId: pulsaCat, brand: "Telkomsel", name: "Telkomsel 20.000", code: "TSEL20", price: 20500 },
          { categoryId: pulsaCat, brand: "Indosat", name: "Indosat 10.000", code: "ISAT10", price: 10500 },
          { categoryId: pulsaCat, brand: "XL", name: "XL 10.000", code: "XL10", price: 10500 }
        );
      }
      if (dataCat) {
        prodsToInsert.push(
          { categoryId: dataCat, brand: "Telkomsel", subBrand: "Reguler", name: "Tsel Reguler 1GB 7 Hari", code: "TSELD1G7H", price: 15000 },
          { categoryId: dataCat, brand: "Telkomsel", subBrand: "Reguler", name: "Tsel Reguler 5GB 30 Hari", code: "TSELD5G30H", price: 55000 },
          { categoryId: dataCat, brand: "XL", subBrand: "Reguler", name: "XL Reguler 10GB", code: "XLD10G", price: 85000 },
          { categoryId: dataCat, brand: "XL", subBrand: "Xtra On", name: "XL Xtra On 1GB", code: "XLXO1G", price: 10000 },
          { categoryId: dataCat, brand: "Indosat", name: "Indosat 3GB 30 Hari", code: "ISATD3G", price: 35000 }
        );
      }
      if (plnCat) {
        prodsToInsert.push(
          { categoryId: plnCat, name: "Token PLN 20.000", code: "PLN20", price: 22000 },
          { categoryId: plnCat, name: "Token PLN 50.000", code: "PLN50", price: 52000 },
          { categoryId: plnCat, name: "Token PLN 100.000", code: "PLN100", price: 102000 }
        );
      }
      if (prodsToInsert.length > 0) {
        await db.insert(products).values(prodsToInsert as any);
      }
    }
  }

  // Seed E-Wallet category separately
  const ewalletCat = (await storage.getCategories()).find(c => c.slug === "ewallet");
  if (!ewalletCat) {
    const [inserted] = await db.insert(categories).values(
      { name: "E-Wallet", slug: "ewallet", icon: "Wallet" }
    ).returning();

    if (inserted) {
      const cid = inserted.id;
      await db.insert(products).values([
        { categoryId: cid, brand: "GoPay", name: "GoPay 10.000", code: "GOPAY10", price: 11000 },
        { categoryId: cid, brand: "GoPay", name: "GoPay 20.000", code: "GOPAY20", price: 21000 },
        { categoryId: cid, brand: "GoPay", name: "GoPay 50.000", code: "GOPAY50", price: 51000 },
        { categoryId: cid, brand: "GoPay", name: "GoPay 100.000", code: "GOPAY100", price: 101000 },
        { categoryId: cid, brand: "GoPay", name: "GoPay 200.000", code: "GOPAY200", price: 201000 },
        { categoryId: cid, brand: "OVO", name: "OVO 10.000", code: "OVO10", price: 11000 },
        { categoryId: cid, brand: "OVO", name: "OVO 20.000", code: "OVO20", price: 21000 },
        { categoryId: cid, brand: "OVO", name: "OVO 50.000", code: "OVO50", price: 51000 },
        { categoryId: cid, brand: "OVO", name: "OVO 100.000", code: "OVO100", price: 101000 },
        { categoryId: cid, brand: "OVO", name: "OVO 200.000", code: "OVO200", price: 201000 },
        { categoryId: cid, brand: "Dana", name: "Dana 10.000", code: "DANA10", price: 11000 },
        { categoryId: cid, brand: "Dana", name: "Dana 20.000", code: "DANA20", price: 21000 },
        { categoryId: cid, brand: "Dana", name: "Dana 50.000", code: "DANA50", price: 51000 },
        { categoryId: cid, brand: "Dana", name: "Dana 100.000", code: "DANA100", price: 101000 },
        { categoryId: cid, brand: "Dana", name: "Dana 200.000", code: "DANA200", price: 201000 },
        { categoryId: cid, brand: "ShopeePay", name: "ShopeePay 10.000", code: "SPAY10", price: 11000 },
        { categoryId: cid, brand: "ShopeePay", name: "ShopeePay 20.000", code: "SPAY20", price: 21000 },
        { categoryId: cid, brand: "ShopeePay", name: "ShopeePay 50.000", code: "SPAY50", price: 51000 },
        { categoryId: cid, brand: "ShopeePay", name: "ShopeePay 100.000", code: "SPAY100", price: 101000 },
        { categoryId: cid, brand: "ShopeePay", name: "ShopeePay 200.000", code: "SPAY200", price: 201000 },
        { categoryId: cid, brand: "LinkAja", name: "LinkAja 10.000", code: "LINKAJA10", price: 11000 },
        { categoryId: cid, brand: "LinkAja", name: "LinkAja 20.000", code: "LINKAJA20", price: 21000 },
        { categoryId: cid, brand: "LinkAja", name: "LinkAja 50.000", code: "LINKAJA50", price: 51000 },
        { categoryId: cid, brand: "LinkAja", name: "LinkAja 100.000", code: "LINKAJA100", price: 101000 },
        { categoryId: cid, brand: "LinkAja", name: "LinkAja 200.000", code: "LINKAJA200", price: 201000 },
      ] as any);
      console.log("[Seed] E-Wallet category and products inserted.");
    }
  }
}

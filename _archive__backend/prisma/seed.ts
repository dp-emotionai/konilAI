/**
 * Seed: создаёт одного закреплённого админа, если заданы ADMIN_EMAIL и ADMIN_PASSWORD.
 * Роль admin через регистрацию API больше не выдаётся — только через этот seed.
 */
import path from "path";
import fs from "fs";
import { config } from "dotenv";
// Загружаем .env: сначала из текущей папки (npm run db:seed из backend), потом из папки backend относительно prisma
const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "..", ".env"),
];
for (const p of candidates) {
  if (fs.existsSync(p)) {
    config({ path: p });
    break;
  }
}
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Seed: ADMIN_EMAIL и ADMIN_PASSWORD не заданы — админ не создаётся.");
    return;
  }

  const prisma = new PrismaClient();
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    if (existing.role === "admin") {
      console.log("Seed: админ уже существует:", normalizedEmail);
      await prisma.$disconnect();
      return;
    }
    // Обновить существующего пользователя на admin (закрепить админа по почте)
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { role: "admin", passwordHash, name: existing.name || "Admin" },
    });
    console.log("Seed: пользователь назначен админом:", normalizedEmail);
  } else {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "admin",
        name: "Admin",
      },
    });
    console.log("Seed: создан админ:", normalizedEmail);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});

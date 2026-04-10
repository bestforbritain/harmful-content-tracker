import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_TAGS = [
  { name: "Racist", color: "#DC2626" },
  { name: "Anti-immigrant", color: "#EA580C" },
  { name: "Anti-LGBT+", color: "#D946EF" },
  { name: "Islamophobic", color: "#F59E0B" },
  { name: "Antisemitic", color: "#92400E" },
  { name: "Misogynistic", color: "#BE185D" },
  { name: "Ragebait", color: "#EF4444" },
  { name: "Foreign state actor", color: "#7C3AED" },
  { name: "AI-generated", color: "#2563EB" },
  { name: "Disinformation", color: "#0891B2" },
  { name: "Conspiracy theory", color: "#4B5563" },
  { name: "Violent rhetoric", color: "#991B1B" },
  { name: "Election interference", color: "#065F46" },
  { name: "Anti-democratic", color: "#1E3A5F" },
];

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@bestforbritain.org" },
    update: {},
    create: {
      email: "admin@bestforbritain.org",
      name: "Admin",
      password: hashedPassword,
    },
  });

  // Create default tags
  for (const tag of DEFAULT_TAGS) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: { color: tag.color },
      create: tag,
    });
  }

  console.log("Seed complete: admin user and default tags created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

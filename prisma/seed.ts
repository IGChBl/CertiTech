import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@certitech.app";
const ADMIN_PASSWORD = "Demo12345!";

const categorySeed = [
  { name: "Electrodomesticos", slug: "electrodomesticos", icon: "WashingMachine" },
  { name: "Electricidad", slug: "electricidad", icon: "Zap" },
  { name: "Plomeria", slug: "plomeria", icon: "Droplets" },
  { name: "Aire acondicionado", slug: "aire-acondicionado", icon: "Wind" },
  { name: "Refrigeracion", slug: "refrigeracion", icon: "Snowflake" },
  { name: "Carpinteria", slug: "carpinteria", icon: "Hammer" },
  { name: "Pintura", slug: "pintura", icon: "PaintBucket" },
  { name: "Soldadura", slug: "soldadura", icon: "Wrench" },
  { name: "Instalaciones", slug: "instalaciones", icon: "Drill" },
  { name: "Mantenimiento general", slug: "mantenimiento-general", icon: "House" },
  { name: "Mecanica basica", slug: "mecanica-basica", icon: "Car" },
  { name: "Otros", slug: "otros", icon: "CircleEllipsis" },
];

async function upsertRoles() {
  const roleClient = await prisma.role.upsert({
    where: { code: "CLIENT" },
    update: { name: "Cliente" },
    create: { code: "CLIENT", name: "Cliente" },
  });

  const roleTechnician = await prisma.role.upsert({
    where: { code: "TECHNICIAN" },
    update: { name: "Tecnico" },
    create: { code: "TECHNICIAN", name: "Tecnico" },
  });

  const roleAdmin = await prisma.role.upsert({
    where: { code: "ADMIN" },
    update: { name: "Administrador" },
    create: { code: "ADMIN", name: "Administrador" },
  });

  return { roleClient, roleTechnician, roleAdmin };
}

async function upsertBaseCategories() {
  await Promise.all(
    categorySeed.map((category) =>
      prisma.serviceCategory.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          icon: category.icon,
          isActive: true,
          description: `Servicios de ${category.name.toLowerCase()} para hogar y negocio.`,
        },
        create: {
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          description: `Servicios de ${category.name.toLowerCase()} para hogar y negocio.`,
          isActive: true,
        },
      }),
    ),
  );
}

async function removeDemoData() {
  await prisma.message.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.requestImage.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.adminAction.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.technicianService.deleteMany();

  await prisma.clientProfile.deleteMany({
    where: {
      user: {
        email: {
          not: ADMIN_EMAIL,
        },
      },
    },
  });

  await prisma.technicianProfile.deleteMany({
    where: {
      user: {
        email: {
          not: ADMIN_EMAIL,
        },
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        not: ADMIN_EMAIL,
      },
    },
  });
}

async function main() {
  const passwordHash = await hash(ADMIN_PASSWORD, 10);
  const { roleAdmin } = await upsertRoles();

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      roleId: roleAdmin.id,
      phone: "+505 8888-0000",
      birthDate: new Date("1990-01-01"),
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      status: "ACTIVE",
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      phone: "+505 8888-0000",
      birthDate: new Date("1990-01-01"),
      roleId: roleAdmin.id,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      status: "ACTIVE",
    },
  });

  await removeDemoData();

  await prisma.clientProfile.deleteMany({ where: { userId: admin.id } });
  await prisma.technicianProfile.deleteMany({ where: { userId: admin.id } });

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      roleId: roleAdmin.id,
      status: "ACTIVE",
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await upsertBaseCategories();

  console.log("Seed limpio completado.");
  console.log(`Admin demo: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


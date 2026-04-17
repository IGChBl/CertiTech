import { PrismaClient, RequestUrgency, ServiceRequestStatus, VerificationStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

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

async function main() {
  const password = await hash("Demo12345!", 10);

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

  const categories = await Promise.all(
    categorySeed.map((category) =>
      prisma.serviceCategory.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          icon: category.icon,
          isActive: true,
        },
        create: {
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          description: `Servicios de ${category.name.toLowerCase()} para hogar y negocio.`,
        },
      }),
    ),
  );

  const admin = await prisma.user.upsert({
    where: { email: "admin@certitech.app" },
    update: {
      passwordHash: password,
      roleId: roleAdmin.id,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "admin@certitech.app",
      passwordHash: password,
      phone: "+505 8888-0000",
      roleId: roleAdmin.id,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const clientData = [
    {
      email: "ana@cliente.com",
      phone: "+505 8871-1201",
      fullName: "Ana Velasquez",
      city: "Managua",
      zone: "Carretera a Masaya",
      bio: "Busco tecnicos responsables para mantenimiento del hogar.",
    },
    {
      email: "carlos@cliente.com",
      phone: "+505 8882-4410",
      fullName: "Carlos Mena",
      city: "Leon",
      zone: "Sutiaba",
      bio: "Necesito servicios rapidos para mi negocio.",
    },
    {
      email: "mariana@cliente.com",
      phone: "+505 8831-1212",
      fullName: "Mariana Solis",
      city: "Granada",
      zone: "Centro",
      bio: "Comparo tecnicos por reputacion y calidad.",
    },
    {
      email: "jose@cliente.com",
      phone: "+505 8899-2299",
      fullName: "Jose Duarte",
      city: "Masaya",
      zone: "Monimbo",
      bio: "Busco soluciones de plomeria y electricidad.",
    },
  ];

  const clients = [];
  for (const item of clientData) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        passwordHash: password,
        phone: item.phone,
        roleId: roleClient.id,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
      create: {
        email: item.email,
        passwordHash: password,
        phone: item.phone,
        roleId: roleClient.id,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.clientProfile.upsert({
      where: { userId: user.id },
      update: {
        fullName: item.fullName,
        city: item.city,
        zone: item.zone,
        bio: item.bio,
      },
      create: {
        userId: user.id,
        fullName: item.fullName,
        city: item.city,
        zone: item.zone,
        bio: item.bio,
      },
    });

    clients.push(user);
  }

  const techniciansData = [
    {
      email: "luis.electricista@certitech.com",
      phone: "+505 8855-1001",
      displayName: "Luis Mendoza",
      businessName: "Electric Solutions LM",
      city: "Managua",
      workZone: "Managua y alrededores",
      description:
        "Tecnico electricista residencial y comercial, especializado en instalaciones seguras y mantenimiento preventivo.",
      yearsExperience: 8,
      availabilityText: "Lunes a sabado, atencion de urgencias",
      scheduleText: "08:00 - 18:00",
      referencePriceMin: 20,
      referencePriceMax: 120,
      verification: VerificationStatus.VERIFIED,
      services: ["electricidad", "instalaciones", "mantenimiento-general"],
      isHomeService: true,
      completedJobs: 28,
    },
    {
      email: "sofia.plomeria@certitech.com",
      phone: "+505 8834-2121",
      displayName: "Sofia Ramirez",
      businessName: "Plomeria Premium SR",
      city: "Granada",
      workZone: "Granada y Nandaime",
      description:
        "Especialista en fugas, griferia, calentadores y redes hidrosanitarias para hogar y negocio.",
      yearsExperience: 6,
      availabilityText: "Lunes a viernes",
      scheduleText: "09:00 - 17:00",
      referencePriceMin: 18,
      referencePriceMax: 90,
      verification: VerificationStatus.VERIFIED,
      services: ["plomeria", "mantenimiento-general"],
      isHomeService: true,
      completedJobs: 22,
    },
    {
      email: "henry.aire@certitech.com",
      phone: "+505 8891-0101",
      displayName: "Henry Castillo",
      businessName: "CoolFix",
      city: "Leon",
      workZone: "Leon y Chinandega",
      description:
        "Mantenimiento, diagnostico y reparacion de sistemas de aire acondicionado y refrigeracion.",
      yearsExperience: 10,
      availabilityText: "Lunes a sabado",
      scheduleText: "07:30 - 18:30",
      referencePriceMin: 25,
      referencePriceMax: 160,
      verification: VerificationStatus.IN_REVIEW,
      services: ["aire-acondicionado", "refrigeracion"],
      isHomeService: true,
      completedJobs: 31,
    },
    {
      email: "marco.carpinteria@certitech.com",
      phone: "+505 8870-5757",
      displayName: "Marco Pineda",
      businessName: "Carpinteria MP",
      city: "Masaya",
      workZone: "Masaya y Managua",
      description:
        "Fabricacion e instalacion de muebles, puertas y acabados en madera.",
      yearsExperience: 12,
      availabilityText: "Agenda previa",
      scheduleText: "08:00 - 16:00",
      referencePriceMin: 30,
      referencePriceMax: 220,
      verification: VerificationStatus.UNVERIFIED,
      services: ["carpinteria", "instalaciones"],
      isHomeService: false,
      completedJobs: 14,
    },
    {
      email: "daniela.pintura@certitech.com",
      phone: "+505 8812-9922",
      displayName: "Daniela Rivas",
      businessName: "PintaPro",
      city: "Managua",
      workZone: "Zona urbana",
      description:
        "Pintura residencial y comercial, acabados premium y restauracion de superficies.",
      yearsExperience: 5,
      availabilityText: "Lunes a viernes",
      scheduleText: "08:00 - 17:00",
      referencePriceMin: 15,
      referencePriceMax: 140,
      verification: VerificationStatus.VERIFIED,
      services: ["pintura", "mantenimiento-general"],
      isHomeService: true,
      completedJobs: 19,
    },
    {
      email: "oscar.soldadura@certitech.com",
      phone: "+505 8844-3121",
      displayName: "Oscar Rizo",
      businessName: "MetalWorks OR",
      city: "Tipitapa",
      workZone: "Tipitapa, Managua norte",
      description:
        "Soldadura estructural y reparaciones metalicas para portones, verjas y estructuras livianas.",
      yearsExperience: 9,
      availabilityText: "Lunes a sabado",
      scheduleText: "08:00 - 18:00",
      referencePriceMin: 25,
      referencePriceMax: 180,
      verification: VerificationStatus.IN_REVIEW,
      services: ["soldadura", "instalaciones"],
      isHomeService: true,
      completedJobs: 26,
    },
  ];

  const technicians = [];

  for (const item of techniciansData) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        passwordHash: password,
        phone: item.phone,
        roleId: roleTechnician.id,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
      create: {
        email: item.email,
        passwordHash: password,
        phone: item.phone,
        roleId: roleTechnician.id,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const profile = await prisma.technicianProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: item.displayName,
        businessName: item.businessName,
        city: item.city,
        workZone: item.workZone,
        description: item.description,
        yearsExperience: item.yearsExperience,
        availabilityText: item.availabilityText,
        scheduleText: item.scheduleText,
        referencePriceMin: item.referencePriceMin,
        referencePriceMax: item.referencePriceMax,
        verification: item.verification,
        verifiedAt: item.verification === VerificationStatus.VERIFIED ? new Date() : null,
        isHomeService: item.isHomeService,
        completedJobs: item.completedJobs,
      },
      create: {
        userId: user.id,
        displayName: item.displayName,
        businessName: item.businessName,
        city: item.city,
        workZone: item.workZone,
        description: item.description,
        yearsExperience: item.yearsExperience,
        availabilityText: item.availabilityText,
        scheduleText: item.scheduleText,
        referencePriceMin: item.referencePriceMin,
        referencePriceMax: item.referencePriceMax,
        verification: item.verification,
        verifiedAt: item.verification === VerificationStatus.VERIFIED ? new Date() : null,
        isHomeService: item.isHomeService,
        completedJobs: item.completedJobs,
      },
    });

    await prisma.technicianService.deleteMany({ where: { technicianId: profile.id } });

    for (const serviceSlug of item.services) {
      const category = categories.find((current) => current.slug === serviceSlug);

      if (!category) {
        continue;
      }

      await prisma.technicianService.create({
        data: {
          technicianId: profile.id,
          categoryId: category.id,
          title: `Servicio de ${category.name}`,
          description: `Atencion profesional en ${category.name.toLowerCase()}.`,
          basePrice: item.referencePriceMin,
        },
      });
    }

    technicians.push({ user, profile });
  }

  const requestData = [
    {
      client: clients[0],
      technician: technicians[0].user,
      categorySlug: "electricidad",
      title: "Instalacion de abanico de techo",
      description: "Necesito instalar dos abanicos en sala y comedor.",
      city: "Managua",
      zone: "Las Colinas",
      urgency: RequestUrgency.MEDIUM,
      budgetMin: 35,
      budgetMax: 80,
      desiredDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      status: ServiceRequestStatus.COMPLETED,
    },
    {
      client: clients[1],
      technician: technicians[1].user,
      categorySlug: "plomeria",
      title: "Fuga en tuberia de cocina",
      description: "La tuberia debajo del fregadero tiene una fuga constante.",
      city: "Leon",
      zone: "Centro",
      urgency: RequestUrgency.HIGH,
      budgetMin: 20,
      budgetMax: 65,
      desiredDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
      status: ServiceRequestStatus.IN_PROGRESS,
    },
    {
      client: clients[2],
      technician: technicians[2].user,
      categorySlug: "aire-acondicionado",
      title: "Mantenimiento de aire split",
      description: "Dos unidades necesitan limpieza y revision de gas.",
      city: "Granada",
      zone: "Centro",
      urgency: RequestUrgency.LOW,
      budgetMin: 40,
      budgetMax: 100,
      desiredDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      status: ServiceRequestStatus.ACCEPTED,
    },
    {
      client: clients[3],
      technician: technicians[4].user,
      categorySlug: "pintura",
      title: "Pintar sala y comedor",
      description: "Busco pintor/a para renovar paredes internas.",
      city: "Masaya",
      zone: "Monimbo",
      urgency: RequestUrgency.MEDIUM,
      budgetMin: 50,
      budgetMax: 190,
      desiredDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      status: ServiceRequestStatus.PENDING,
    },
  ];

  const createdRequests = [];

  for (const item of requestData) {
    const category = categories.find((current) => current.slug === item.categorySlug);

    if (!category) {
      continue;
    }

    const created = await prisma.serviceRequest.create({
      data: {
        clientId: item.client.id,
        technicianId: item.technician.id,
        categoryId: category.id,
        title: item.title,
        description: item.description,
        city: item.city,
        zone: item.zone,
        urgency: item.urgency,
        budgetMin: item.budgetMin,
        budgetMax: item.budgetMax,
        desiredDate: item.desiredDate,
        status: item.status,
        isDirectRequest: true,
        completedAt:
          item.status === ServiceRequestStatus.COMPLETED ? new Date(Date.now() - 1000 * 60 * 60 * 24) : null,
      },
    });

    createdRequests.push(created);
  }

  for (const request of createdRequests.slice(0, 3)) {
    const chat = await prisma.chat.create({
      data: {
        createdById: request.clientId,
        serviceRequestId: request.id,
      },
    });

    await prisma.chatParticipant.createMany({
      data: [
        { chatId: chat.id, userId: request.clientId },
        { chatId: chat.id, userId: request.technicianId ?? request.clientId },
      ],
      skipDuplicates: true,
    });

    await prisma.message.createMany({
      data: [
        {
          chatId: chat.id,
          senderId: request.clientId,
          content: "Hola, necesito coordinar este servicio.",
        },
        {
          chatId: chat.id,
          senderId: request.technicianId ?? request.clientId,
          content: "Perfecto, puedo atenderte en el horario solicitado.",
          isRead: true,
          readAt: new Date(),
        },
      ],
    });
  }

  const completedRequest = createdRequests.find((item) => item.status === ServiceRequestStatus.COMPLETED);

  if (completedRequest) {
    const technicianProfile = technicians.find((entry) => entry.user.id === completedRequest.technicianId)?.profile;

    if (technicianProfile) {
      await prisma.review.upsert({
        where: { serviceRequestId: completedRequest.id },
        update: {
          rating: 5,
          comment: "Trabajo puntual y excelente calidad.",
        },
        create: {
          serviceRequestId: completedRequest.id,
          clientId: completedRequest.clientId,
          technicianProfileId: technicianProfile.id,
          rating: 5,
          comment: "Trabajo puntual y excelente calidad.",
        },
      });
    }
  }

  const allReviews = await prisma.review.findMany({
    select: {
      technicianProfileId: true,
      rating: true,
    },
  });

  const grouped = new Map<string, number[]>();
  for (const review of allReviews) {
    const list = grouped.get(review.technicianProfileId) ?? [];
    list.push(review.rating);
    grouped.set(review.technicianProfileId, list);
  }

  for (const [technicianProfileId, ratings] of grouped.entries()) {
    const total = ratings.reduce((acc, value) => acc + value, 0);
    const average = total / ratings.length;

    await prisma.technicianProfile.update({
      where: { id: technicianProfileId },
      data: {
        totalReviews: ratings.length,
        averageRating: Number(average.toFixed(2)),
      },
    });
  }

  const favoritePairs = [
    [clients[0].id, technicians[0].profile.id],
    [clients[0].id, technicians[1].profile.id],
    [clients[1].id, technicians[2].profile.id],
    [clients[2].id, technicians[4].profile.id],
  ];

  for (const [clientId, technicianProfileId] of favoritePairs) {
    await prisma.favorite.upsert({
      where: {
        clientId_technicianProfileId: {
          clientId,
          technicianProfileId,
        },
      },
      update: {},
      create: {
        clientId,
        technicianProfileId,
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: clients[0].id,
        type: "NEW_MESSAGE",
        title: "Nuevo mensaje",
        body: "Luis te envio una respuesta para tu solicitud.",
      },
      {
        userId: technicians[0].user.id,
        type: "NEW_REQUEST",
        title: "Nueva solicitud recibida",
        body: "Tienes una nueva solicitud de instalacion electrica.",
      },
      {
        userId: technicians[0].user.id,
        type: "NEW_REVIEW",
        title: "Nueva valoracion",
        body: "Has recibido una valoracion de 5 estrellas.",
      },
      {
        userId: admin.id,
        type: "SYSTEM",
        title: "Seed completado",
        body: "Los datos de demostracion de CertiTech fueron cargados.",
      },
    ],
  });

  await prisma.verificationRequest.createMany({
    data: [
      {
        technicianProfileId: technicians[2].profile.id,
        requestedById: technicians[2].user.id,
        status: "PENDING",
        notes: "Documento de identidad y licencia tecnica adjunta.",
      },
      {
        technicianProfileId: technicians[5].profile.id,
        requestedById: technicians[5].user.id,
        status: "PENDING",
        notes: "Solicitud de validacion de negocio.",
      },
    ],
  });

  await prisma.report.create({
    data: {
      reporterId: clients[1].id,
      reportedTechnicianId: technicians[5].profile.id,
      reason: "INAPPROPRIATE_BEHAVIOR",
      details: "El tecnico uso lenguaje ofensivo durante la llamada.",
      status: "OPEN",
    },
  });

  await prisma.adminAction.create({
    data: {
      adminId: admin.id,
      actionType: "VERIFY_TECHNICIAN",
      targetType: "TECHNICIAN",
      targetId: technicians[0].profile.id,
      details: {
        note: "Verificacion inicial de tecnico completada durante seed.",
      },
    },
  });

  console.log("Seed completado correctamente.");
  console.log("Credenciales demo: admin@certitech.app / Demo12345!");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


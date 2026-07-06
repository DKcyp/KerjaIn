const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logsWithBa24 = await prisma.bacaraLog.findMany({
    where: { baId: 24 },
    take: 5
  });
  console.log('Logs with baId=24:', logsWithBa24);
  
  const logsWithProject14 = await prisma.bacaraLog.findMany({
    where: { projectId: 14 },
    take: 5
  });
  console.log('Logs with projectId=14:', logsWithProject14);
}

main().catch(console.error).finally(() => prisma.$disconnect());

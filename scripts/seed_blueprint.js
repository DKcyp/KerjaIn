const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BLUEPRINT_DATA = [
  {
    projectId: 'SIA-2024-001',
    projectName: 'Sistem Informasi Akademik',
    client: 'Universitas Indonesia',
    pic: 'Dr. Ahmad Wijaya',
    blueprintStatus: 'APPROVED',
    createdBy: 1,
    documents: [
      {
        fileName: 'sia_requirements_v1.pdf',
        originalName: 'SIA Requirements Document v1.0.pdf',
        fileSize: 2048576,
        fileType: 'application/pdf',
        version: '1.0',
        uploadedBy: 1,
        notes: 'Initial requirements document'
      },
      {
        fileName: 'sia_wireframes_v1.pdf',
        originalName: 'SIA Wireframes v1.0.pdf',
        fileSize: 5242880,
        fileType: 'application/pdf',
        version: '1.0',
        uploadedBy: 2,
        notes: 'UI/UX wireframes'
      }
    ],
    requirements: [
      {
        description: 'Database design and ERD creation',
        assignedTo: 1,
        status: 'DONE'
      },
      {
        description: 'API endpoint specifications',
        assignedTo: 2,
        status: 'DONE'
      },
      {
        description: 'User authentication system design',
        assignedTo: 1,
        status: 'DONE'
      }
    ],
    activities: [
      {
        userId: 1,
        action: 'CREATE',
        description: 'Blueprint created',
        notes: 'Initial blueprint creation'
      },
      {
        userId: 2,
        action: 'UPLOAD_DOCUMENT',
        description: 'Document uploaded: SIA Requirements Document v1.0.pdf',
        notes: 'Initial requirements document'
      },
      {
        userId: 1,
        action: 'APPROVE',
        description: 'Blueprint approved',
        notes: 'All requirements met, ready for development'
      }
    ]
  },
  {
    projectId: 'ECP-2024-002',
    projectName: 'E-Commerce Platform',
    client: 'PT Maju Jaya',
    pic: 'Siti Nurhaliza',
    blueprintStatus: 'DRAFT',
    createdBy: 2,
    documents: [
      {
        fileName: 'ecp_requirements_v1.docx',
        originalName: 'E-Commerce Requirements v1.0.docx',
        fileSize: 1048576,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        version: '1.0',
        uploadedBy: 2,
        notes: 'Initial requirements draft'
      }
    ],
    requirements: [
      {
        description: 'Product catalog system design',
        assignedTo: 2,
        status: 'PENDING'
      },
      {
        description: 'Payment gateway integration plan',
        assignedTo: 1,
        status: 'REVISI'
      },
      {
        description: 'Inventory management system',
        assignedTo: 3,
        status: 'PENDING'
      }
    ],
    activities: [
      {
        userId: 2,
        action: 'CREATE',
        description: 'Blueprint created',
        notes: 'Initial blueprint creation'
      },
      {
        userId: 2,
        action: 'UPLOAD_DOCUMENT',
        description: 'Document uploaded: E-Commerce Requirements v1.0.docx',
        notes: 'Initial requirements draft'
      }
    ]
  },
  {
    projectId: 'MBA-2024-003',
    projectName: 'Mobile Banking App',
    client: 'Bank Sejahtera',
    pic: 'Budi Santoso',
    blueprintStatus: 'APPROVED',
    createdBy: 1,
    documents: [
      {
        fileName: 'mba_specs_v2.pdf',
        originalName: 'Mobile Banking Specifications v2.0.pdf',
        fileSize: 3145728,
        fileType: 'application/pdf',
        version: '2.0',
        uploadedBy: 1,
        notes: 'Updated specifications with security requirements'
      }
    ],
    requirements: [
      {
        description: 'Security framework implementation',
        assignedTo: 1,
        status: 'DONE'
      },
      {
        description: 'Mobile UI/UX design',
        assignedTo: 2,
        status: 'DONE'
      }
    ],
    activities: [
      {
        userId: 1,
        action: 'CREATE',
        description: 'Blueprint created',
        notes: 'Initial blueprint creation'
      },
      {
        userId: 1,
        action: 'APPROVE',
        description: 'Blueprint approved',
        notes: 'Security requirements approved'
      }
    ]
  },
  {
    projectId: 'IMS-2024-004',
    projectName: 'Inventory Management System',
    client: 'PT Logistik Nusantara',
    pic: 'Maya Sari',
    blueprintStatus: 'REJECTED',
    createdBy: 3,
    documents: [],
    requirements: [
      {
        description: 'Warehouse management module',
        assignedTo: 3,
        status: 'PENDING'
      }
    ],
    activities: [
      {
        userId: 3,
        action: 'CREATE',
        description: 'Blueprint created',
        notes: 'Initial blueprint creation'
      },
      {
        userId: 1,
        action: 'REJECT',
        description: 'Blueprint rejected',
        notes: 'Insufficient requirements documentation. Please provide detailed specifications.'
      }
    ]
  },
  {
    projectId: 'HRM-2024-005',
    projectName: 'HR Management Portal',
    client: 'PT Karya Mandiri',
    pic: 'Andi Wijaya',
    blueprintStatus: 'DRAFT',
    createdBy: 2,
    documents: [
      {
        fileName: 'hrm_proposal_v1.xlsx',
        originalName: 'HRM Project Proposal v1.0.xlsx',
        fileSize: 512000,
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        version: '1.0',
        uploadedBy: 2,
        notes: 'Project proposal and timeline'
      }
    ],
    requirements: [
      {
        description: 'Employee data management system',
        assignedTo: 2,
        status: 'PENDING'
      },
      {
        description: 'Payroll calculation module',
        assignedTo: 1,
        status: 'PENDING'
      }
    ],
    activities: [
      {
        userId: 2,
        action: 'CREATE',
        description: 'Blueprint created',
        notes: 'Initial blueprint creation'
      }
    ]
  }
];

async function seedBlueprints() {
  console.log('🌱 Starting Blueprint seeding...');

  try {
    // Clear existing data
    await prisma.blueprintActivityLog.deleteMany();
    await prisma.blueprintRequirement.deleteMany();
    await prisma.blueprintDocument.deleteMany();
    await prisma.blueprint.deleteMany();

    console.log('🗑️  Cleared existing Blueprint data');

    // Seed blueprints
    for (const blueprintData of BLUEPRINT_DATA) {
      const { documents, requirements, activities, ...blueprintInfo } = blueprintData;

      // Create blueprint
      const blueprint = await prisma.blueprint.create({
        data: blueprintInfo
      });

      console.log(`✅ Created blueprint: ${blueprint.projectName}`);

      // Create documents
      for (const docData of documents) {
        await prisma.blueprintDocument.create({
          data: {
            ...docData,
            blueprintId: blueprint.id
          }
        });
      }

      // Create requirements
      for (const reqData of requirements) {
        await prisma.blueprintRequirement.create({
          data: {
            ...reqData,
            blueprintId: blueprint.id
          }
        });
      }

      // Create activity logs
      for (const activityData of activities) {
        await prisma.blueprintActivityLog.create({
          data: {
            ...activityData,
            blueprintId: blueprint.id
          }
        });
      }

      console.log(`   📄 Added ${documents.length} documents`);
      console.log(`   ✔️  Added ${requirements.length} requirements`);
      console.log(`   📝 Added ${activities.length} activity logs`);
    }

    console.log('🎉 Blueprint seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - ${BLUEPRINT_DATA.length} blueprints created`);
    console.log(`   - ${BLUEPRINT_DATA.reduce((sum, bp) => sum + bp.documents.length, 0)} documents created`);
    console.log(`   - ${BLUEPRINT_DATA.reduce((sum, bp) => sum + bp.requirements.length, 0)} requirements created`);
    console.log(`   - ${BLUEPRINT_DATA.reduce((sum, bp) => sum + bp.activities.length, 0)} activity logs created`);

  } catch (error) {
    console.error('❌ Error seeding blueprints:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedBlueprints()
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedBlueprints };

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * External API endpoint for creating projects from other applications
 * POST /api/external/project
 * 
 * Authentication: API Key in header (X-API-Key)
 * 
 * Request Body:
 * {
 *   "projectCode": "string",        // kodeProyek (required, unique)
 *   "projectName": "string",        // namaProyek (required)
 *   "companyName": "string",        // client (required)
 *   "pics": [                       // PICs for blueprint (optional)
 *     {
 *       "id": number,               // Pegawai ID (required)
 *       "name": "string",           // Pegawai name (required)
 *       "email": "string",          // Email address (required)
 *       "phone": "string"           // Phone number (required)
 *     }
 *   ],
 *   "team": ["username1", "username2"] // Team member usernames (optional, jabatan from role)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "project": { ... },
 *     "blueprint": { ... },
 *     "team": [ ... ]
 *   }
 * }
 */

// Validate API Key
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.EXTERNAL_API_KEY;
  
  if (!validApiKey) {
    console.error('EXTERNAL_API_KEY not configured in environment');
    return false;
  }
  
  return apiKey === validApiKey;
}

export async function POST(request: NextRequest) {
  try {
    // Validate API Key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    let { 
      projectCode, 
      projectName, 
      companyName,
      pics = [],
      team = []
    } = body;

    // Sanitize PICs - handle if it comes as a JSON string
    if (typeof pics === 'string') {
      try {
        pics = JSON.parse(pics);
      } catch (e) {
        return NextResponse.json(
          { success: false, error: 'Invalid PICs format: must be a valid JSON array' },
          { status: 400 }
        );
      }
    }

    // Sanitize team - handle if it comes as a JSON string
    if (typeof team === 'string') {
      try {
        team = JSON.parse(team);
      } catch (e) {
        return NextResponse.json(
          { success: false, error: 'Invalid team format: must be a valid JSON array' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!projectCode || !projectName || !companyName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: projectCode, projectName, and companyName are required' 
        },
        { status: 400 }
      );
    }

    // Validate projectCode format (trim whitespace)
    const trimmedProjectCode = String(projectCode).trim();
    const trimmedProjectName = String(projectName).trim();
    const trimmedCompanyName = String(companyName).trim();

    if (!trimmedProjectCode || !trimmedProjectName || !trimmedCompanyName) {
      return NextResponse.json(
        { success: false, error: 'Project code, name, and company name cannot be empty' },
        { status: 400 }
      );
    }

    // Validate team members if provided
    if (team && !Array.isArray(team)) {
      return NextResponse.json(
        { success: false, error: 'Team must be an array' },
        { status: 400 }
      );
    }

    // Validate PICs if provided
    if (pics && !Array.isArray(pics)) {
      return NextResponse.json(
        { success: false, error: 'PICs must be an array' },
        { status: 400 }
      );
    }

    // Validate PICs structure
    if (pics && pics.length > 0) {
      for (const pic of pics) {
        if (!pic.id || !pic.name || !pic.email || !pic.phone) {
          return NextResponse.json(
            { success: false, error: 'Each PIC must have id, name, email, and phone fields' },
            { status: 400 }
          );
        }
      }
    }

    // Check if project code already exists
    const existingProject = await prisma.proyek.findUnique({
      where: { kodeProyek: trimmedProjectCode }
    });

    if (existingProject) {
      return NextResponse.json(
        { success: false, error: `Project with code '${trimmedProjectCode}' already exists` },
        { status: 409 }
      );
    }

    // Validate team members exist (team is now just an array of usernames)
    const teamUsernames = Array.isArray(team) ? team.filter(Boolean) : [];
    if (teamUsernames.length > 0) {
      const teamMembers = await prisma.pegawai.findMany({
        where: { username: { in: teamUsernames } },
        select: { id: true, username: true, namaLengkap: true, role: true }
      });

      if (teamMembers.length !== teamUsernames.length) {
        const foundUsernames = teamMembers.map(m => m.username);
        const missingUsernames = teamUsernames.filter((u: string) => !foundUsernames.includes(u));
        return NextResponse.json(
          { 
            success: false, 
            error: `Team members not found: ${missingUsernames.join(', ')}` 
          },
          { status: 400 }
        );
      }
    }

    // PICs are just JSON data to be stored in blueprint (no validation needed)
    let picData: any[] = [];
    if (pics && pics.length > 0) {
      // Use PICs data as provided (id, name, email, phone)
      picData = pics.map((pic: any) => ({
        id: pic.id,
        name: pic.name,
        email: pic.email,
        phone: pic.phone
      }));
    }

    // Create project, blueprint, and team in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get next noUrut for project
      const maxProyek = await tx.proyek.aggregate({ _max: { noUrut: true } });
      const nextNoUrut = (maxProyek._max.noUrut || 0) + 1;

      // 2. Create project (default type: BLUEPRINT for external API)
      const project = await tx.proyek.create({
        data: {
          kodeProyek: trimmedProjectCode,
          namaProyek: trimmedProjectName,
          client: trimmedCompanyName,
          type: 'BLUEPRINT',
          noUrut: nextNoUrut
        }
      });

      // 3. Create blueprint with PICs
      const blueprint = await tx.blueprint.create({
        data: {
          proyekId: project.id,
          createdBy: 1, // System user
          blueprintStatus: 'DRAFT',
          picsData: picData.length > 0 ? picData : [],
          activityLog: {
            create: {
              userId: 1,
              action: 'CREATE',
              description: 'Blueprint created via external API',
              notes: `Project created from external application with ${picData.length} PICs`
            }
          }
        }
      });

      // 4. Create team members (jabatan derived from role)
      const createdTeam = [];
      if (teamUsernames.length > 0) {
        for (const username of teamUsernames) {
          const pegawai = await tx.pegawai.findUnique({
            where: { username },
            select: { id: true, namaLengkap: true, role: true }
          });

          if (pegawai) {
            // Map role to jabatan
            let jabatan = pegawai.role;
            if (pegawai.role === 'SUPER_ADMIN' || pegawai.role === 'ADMIN') {
              jabatan = 'ADMIN';
            }
            // PM, PROGRAMMER roles stay as is

            await tx.proyekTeam.create({
              data: {
                projectId: project.id,
                pegawaiId: pegawai.id,
                jabatan: jabatan
              }
            });
            createdTeam.push({
              username: username,
              name: pegawai.namaLengkap,
              role: pegawai.role,
              jabatan: jabatan
            });
          }
        }
      }

      return {
        project,
        blueprint,
        team: createdTeam
      };
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      data: {
        project: {
          id: result.project.id,
          code: result.project.kodeProyek,
          name: result.project.namaProyek,
          company: result.project.client,
          type: result.project.type,
          noUrut: result.project.noUrut
        },
        blueprint: {
          id: result.blueprint.id,
          status: result.blueprint.blueprintStatus,
          pics: picData
        },
        team: result.team
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating project via external API:', error);
    
    // Handle unique constraint violation
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Project code must be unique' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create project',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing API key validation
export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing API key' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'API key is valid',
    endpoint: '/api/external/project',
    method: 'POST',
    documentation: {
      authentication: 'API Key in X-API-Key header',
      requiredFields: ['projectCode', 'projectName', 'companyName'],
      optionalFields: ['pics (array of {id, name, email, phone})', 'team (array of usernames)'],
      notes: 'Projects created via external API default to type: BLUEPRINT'
    }
  });
}

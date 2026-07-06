import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * External API for synchronizing all projects with their complete data
 * GET /api/external/projects/sync
 * 
 * Authentication: API key via X-API-Key header
 * Returns: All projects with teams, modules, and tasklists
 */

// Validate API key
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const expectedKey = process.env.CRM_API_KEY;
  
  if (!expectedKey) {
    console.error('CRM_API_KEY not configured');
    return false;
  }
  
  return apiKey === expectedKey;
}

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: 'Valid API key required in X-API-Key header' 
        }, 
        { status: 401 }
      );
    }

    console.log('External projects sync API called');

    // Fetch all projects with their complete data
    const projects = await prisma.proyek.findMany({
      orderBy: { noUrut: 'asc' }
    });

    // Fetch additional data for each project
    const projectsWithData = await Promise.all(
      projects.map(async (project) => {
        // Get team members
        const teamMembers = await prisma.proyekTeam.findMany({
          where: { projectId: project.id },
          orderBy: { createdAt: 'asc' }
        });

        // Get simplified team member details
        const teamWithDetails = await Promise.all(
          teamMembers.map(async (member) => {
            const pegawai = await prisma.pegawai.findUnique({
              where: { id: member.pegawaiId },
              select: {
                namaLengkap: true,
                username: true
              }
            });

            return {
              jabatan: member.jabatan,
              username: pegawai?.username || null,
              namaLengkap: pegawai?.namaLengkap || null
            };
          })
        );

        // Get project modules (hierarchical structure)
        const modules = await prisma.proyekModule.findMany({
          where: { projectId: project.id },
          orderBy: [
            { parentId: 'asc' },
            { order: 'asc' },
            { nama: 'asc' }
          ]
        });

        // Simplified team structure - no tasklists needed

        // Build module hierarchy
        const moduleHierarchy = buildModuleHierarchy(modules);

        return {
          ...project,
          team: teamWithDetails,
          modules: moduleHierarchy,
          stats: {
            teamCount: teamWithDetails.length,
            moduleCount: modules.length
          }
        };
      })
    );

    // Return comprehensive project data
    return NextResponse.json({
      success: true,
      message: 'Projects synchronized successfully',
      timestamp: new Date().toISOString(),
      totalProjects: projectsWithData.length,
      projects: projectsWithData
    });

  } catch (error) {
    console.error('External projects sync API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to sync projects data'
      }, 
      { status: 500 }
    );
  }
}

/**
 * Build hierarchical module structure from flat array
 */
function buildModuleHierarchy(modules: any[]): any[] {
  const moduleMap = new Map();
  const rootModules: any[] = [];

  // Create a map of all modules
  modules.forEach(module => {
    moduleMap.set(module.id, { ...module, children: [] });
  });

  // Build hierarchy
  modules.forEach(module => {
    const moduleWithChildren = moduleMap.get(module.id);
    
    if (module.parentId === null) {
      // Root module
      rootModules.push(moduleWithChildren);
    } else {
      // Child module
      const parent = moduleMap.get(module.parentId);
      if (parent) {
        parent.children.push(moduleWithChildren);
      }
    }
  });

  return rootModules;
}

// POST method for documentation endpoint
export async function POST(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { 
        error: 'Unauthorized', 
        message: 'Valid API key required in X-API-Key header' 
      }, 
      { status: 401 }
    );
  }

  return NextResponse.json({
    message: 'External Projects Synchronization API',
    version: '1.0.0',
    description: 'API for synchronizing all projects with their complete data including teams and modules',
    authentication: 'API Key via X-API-Key header',
    endpoints: {
      'GET /api/external/projects/sync': {
        description: 'Get all projects with complete data for synchronization',
        authentication: 'Required',
        response: {
          success: 'boolean',
          message: 'string',
          timestamp: 'ISO date string',
          totalProjects: 'number',
          projects: 'array of project objects with teams and modules'
        }
      }
    },
    projectDataStructure: {
      id: 'Project ID',
      noUrut: 'Project sequence number',
      kodeProyek: 'Project code (unique)',
      namaProyek: 'Project name',
      createdAt: 'Creation timestamp',
      updatedAt: 'Last update timestamp',
      team: 'Array of simplified team members with position, username, and name',
      modules: 'Hierarchical array of project modules',
      stats: 'Project statistics (team and module counts)'
    },
    usage: {
      curl: 'curl -H "X-API-Key: your-api-key" http://localhost:3000/api/external/projects/sync',
      headers: {
        'X-API-Key': 'Your external API key'
      }
    }
  });
}

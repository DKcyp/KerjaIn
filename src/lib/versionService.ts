import { prisma } from '@/lib/prisma';
import { BAStatus, Prisma } from '@prisma/client';

/**
 * Statuses that are considered "DEVELOPMENT or higher" in the BA lifecycle.
 * Used to find the latest approved/active BA version for a project.
 */
export const DEVELOPMENT_OR_HIGHER_STATUSES: BAStatus[] = [
  'DEVELOPMENT',
  'PROSES_DEVELOPMENT',
  'UAT_INTERNAL',
  'UAT_INTERNAL_SELESAI',
  'UAT_EXTERNAL',
  'UAT_EXTERNAL_SELESAI',
  'SELESAI',
];

/**
 * Compares two semantic version strings (e.g. "105.0.1", "99.0.0").
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const parse = (v: string | null | undefined) => (v || '').split('.').map(n => parseInt(n, 10) || 0);
  const partsA = parse(a);
  const partsB = parse(b);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

/**
 * Gets the latest BA version from a blueprint/bacara that has status
 * DEVELOPMENT or higher for a given project (and optionally filtered by BA type).
 *
 * This is the recommended source of truth when creating tasklists or
 * proyek_module records during the approve flow.
 *
 * @param projectId - Project ID
 * @param baType    - Optional BA type filter ('BLUEPRINT' | 'BERITA_ACARA')
 * @returns The latest version string, or null if none found
 */
export async function getLatestDevelopmentBAVersion(
  projectId: number,
  baType?: 'BLUEPRINT' | 'BERITA_ACARA',
): Promise<string | null> {
  try {
    const whereClause: Prisma.BacaraWhereInput = {
      projectId,
      status: { in: DEVELOPMENT_OR_HIGHER_STATUSES },
    };
    if (baType) {
      whereClause.type = baType;
    }

    const allBAs = await prisma.bacara.findMany({
      where: whereClause,
      select: { version: true, nama: true, status: true },
    });

    if (allBAs.length > 0) {
      allBAs.sort((a, b) => compareVersions(b.version, a.version));
      const latestBA = allBAs[0];
      console.log(
        `[VersionService] Latest DEVELOPMENT+ BA for project ${projectId}: "${latestBA.nama}" status=${latestBA.status} version=${latestBA.version}`,
      );
      return latestBA.version;
    }

    console.log(`[VersionService] No DEVELOPMENT+ BA found for project ${projectId}`);
    return null;
  } catch (error) {
    console.error(`[VersionService] Error getting latest DEVELOPMENT+ BA version:`, error);
    return null;
  }
}

/**
 * Gets the current version for a module from bacara (source of truth)
 * 
 * Logic priority:
 * 1. ProyekModule.bacara.version (via baId relation)
 * 2. Fallback: BAModule lookup by nama+projectId → bacara.version
 * 3. ProyekModule.baVersion (legacy fallback)
 * 4. Default '1.0.0'
 *
 * @param moduleId - ID of the ProyekModule
 * @returns Current version string from bacara (e.g., "1.0.0", "25.0.0")
 */
export async function getNextVersionForModule(
  moduleId: number
): Promise<string> {
  try {
    // Get the module along with its linked bacara (source of truth for version)
    const proyekModule = await prisma.proyekModule.findUnique({
      where: { id: moduleId },
      select: {
        baId: true,
        baVersion: true,
        nama: true,
        projectId: true,
        bacara: {
          select: { version: true }
        }
      },
    });

    if (!proyekModule) {
      console.log(`[VersionService] Module ${moduleId} not found, using default 1.0.0`);
      return '1.0.0';
    }

    // Priority 1: bacara.version via direct relation (source of truth)
    if (proyekModule.bacara?.version) {
      console.log(`[VersionService] Using bacara version for module ${moduleId}: ${proyekModule.bacara.version}`);
      return proyekModule.bacara.version;
    }

    // Priority 2: Fallback - find latest bacara via bacara_module by name + projectId
    // This handles cases where ProyekModule.baId is null (legacy data)
    const baModule = await prisma.bAModule.findFirst({
      where: {
        nama: proyekModule.nama,
        projectId: proyekModule.projectId,
      },
      orderBy: {
        createdAt: 'desc', // Get latest BA module
      },
      select: {
        bacara: {
          select: { version: true, id: true }
        }
      }
    });

    if (baModule?.bacara?.version) {
      console.log(`[VersionService] Using bacara version via fallback lookup for module ${moduleId}: ${baModule.bacara.version}`);

      // Auto-fix: link this module to the bacara for future calls
      try {
        await prisma.proyekModule.update({
          where: { id: moduleId },
          data: { baId: baModule.bacara.id, baVersion: baModule.bacara.version },
        });
        console.log(`[VersionService] Auto-linked module ${moduleId} to bacara ${baModule.bacara.id}`);
      } catch (linkError) {
        console.error(`[VersionService] Failed to auto-link module:`, linkError);
      }

      return baModule.bacara.version;
    }

    // Priority 3: Module's own baVersion (legacy)
    if (proyekModule.baVersion) {
      console.log(`[VersionService] Using module baVersion (legacy) for module ${moduleId}: ${proyekModule.baVersion}`);
      return proyekModule.baVersion;
    }

    console.log(`[VersionService] No version found for module ${moduleId}, using default 1.0.0`);
    return '1.0.0';
  } catch (error) {
    console.error(`[VersionService] Error getting version for module ${moduleId}:`, error);
    return '1.0.0';
  }
}

/**
 * Increments the version for a module when BA is approved
 * 
 * Logic:
 * - Parse current version (e.g., "0.0.1")
 * - Increment patch version (0.0.1 -> 0.0.2)
 * - Update module baVersion
 * - Update all tasklists in this module to use new version
 * 
 * @param moduleId - ID of the ProyekModule
 * @returns New version string
 */
export async function incrementModuleVersionOnBAApproval(
  moduleId: number
): Promise<string> {
  try {
    // Get current module version
    const proyekModule = await prisma.proyekModule.findUnique({
      where: { id: moduleId },
      select: { baVersion: true },
    });

    if (!proyekModule) {
      throw new Error(`Module ${moduleId} not found`);
    }

    const currentVersion = proyekModule.baVersion || '1.0.0';

    // Parse version
    const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
      throw new Error(`Invalid version format: ${currentVersion}`);
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);

    // Increment patch version
    const newVersion = `${major}.${minor}.${patch + 1}`;

    console.log(`[VersionService] Incrementing module ${moduleId} version from ${currentVersion} to ${newVersion}`);

    // Update module baVersion
    await prisma.proyekModule.update({
      where: { id: moduleId },
      data: { baVersion: newVersion },
    });

    // Update all tasklists in this module to use new version
    await prisma.tasklist.updateMany({
      where: { moduleId },
      data: { baVersion: newVersion },
    });

    console.log(`[VersionService] Module ${moduleId} and its tasklists updated to version ${newVersion}`);

    return newVersion;
  } catch (error) {
    console.error(`[VersionService] Error incrementing version for module ${moduleId}:`, error);
    throw error;
  }
}

/**
 * Updates module version to match tasklist version (deprecated - kept for backward compatibility)
 * 
 * @param moduleId - ID of the ProyekModule
 * @param version - Version to set
 */
export async function updateModuleVersion(
  moduleId: number,
  version: string
): Promise<void> {
  try {
    await prisma.proyekModule.update({
      where: { id: moduleId },
      data: { baVersion: version },
    });
    console.log(`[VersionService] Module ${moduleId} baVersion updated to ${version}`);
  } catch (error) {
    console.error(`[VersionService] Error updating module version:`, error);
    // Don't throw - module update failure shouldn't break tasklist creation
  }
}

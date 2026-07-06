import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getLatestDevelopmentBAVersion } from '@/lib/versionService';

function buildTree(rows: any[]) {
  const byParent = new Map<number | null, any[]>();
  // rows already ordered by parentId, kode, id from the query; preserve insertion order
  rows.forEach((r) => {
    const key = r.parentId ?? null;
    const arr = byParent.get(key) || [];
    arr.push(r); // keep insertion order as provided by DB
    byParent.set(key, arr);
  });
  const make = (parentId: number | null): any[] => {
    const level = byParent.get(parentId) || [];
    return level.map((n) => {
      const children = make(n.id);
      const isLeaf = children.length === 0;
      return {
        id: n.id,
        nama: n.nama,
        kode: n.kode ?? null,
        version: n.version ?? null,
        baVersion: n.baVersion ?? null,
        isLeaf,
        children,
        expanded: true,
      };
    });
  };
  return make(null);
}

// GET /api/proyek-modules/[projectId]/tree
export async function GET(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId: p } = await ctx.params;
  const projectId = Number(p);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  try {
    const rows = await prisma.proyekModule.findMany({
      where: { projectId },
      // Ensure stable hierarchical ordering that matches Master Proyek display
      orderBy: [
        { parentId: 'asc' },
        // Primary ordering by regenerated hierarchical kode (e.g., 01.02.03)
        { kode: 'asc' },
        // Fallbacks in case some kode are null (pre-migration / partial data)
        { order: 'asc' },
        { id: 'asc' },
      ],
    });
    const tree = buildTree(rows);
    return NextResponse.json({ tree });
  } catch (e) {
    console.error('GET relational modules tree error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/proyek-modules/[projectId]/tree
// Upserts the full tree for a project while PRESERVING existing IDs.
// Body: { tree: [{ id?, nama, children: [...] }] }
// Behavior:
// - Existing nodes (id present in DB) keep their ids; only nama, parentId, order, depth, isLeaf are updated.
// - New nodes (id missing or unknown) are created with new DB ids.
// - Nodes not present in the incoming tree are deleted.
export async function PUT(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId: p } = await ctx.params;
  const projectId = Number(p);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const tree = Array.isArray(body?.tree) ? body.tree : [];

  // Validate input data
  if (!tree.length) {
    return NextResponse.json({ error: 'Tree data is empty' }, { status: 400 });
  }

  // Validate that each node has required fields
  const validateNode = (node: any, path = 'root'): string | null => {
    if (!node || typeof node !== 'object') {
      return `Invalid node at ${path}`;
    }
    if (!node.nama || typeof node.nama !== 'string' || !node.nama.trim()) {
      return `Missing or invalid nama at ${path}`;
    }
    if (node.children && Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        const childError = validateNode(node.children[i], `${path}.children[${i}]`);
        if (childError) return childError;
      }
    }
    return null;
  };

  for (let i = 0; i < tree.length; i++) {
    const error = validateNode(tree[i], `tree[${i}]`);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  }

  // Retry logic for handling write conflicts/deadlocks
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[PUT tree] Attempt ${attempt}/${maxRetries}: Starting transaction for project ${projectId} with ${tree.length} root nodes`);

      // Transaction to serialize concurrent updates
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 0) Get latest BA version for the project
        const latestBAVersion = await getLatestDevelopmentBAVersion(projectId);

        // 1) Load existing nodes for this project
        const existing = await tx.proyekModule.findMany({ where: { projectId } });
        console.log(`[PUT tree] Found ${existing.length} existing nodes for project ${projectId}`);
        const existingById = new Map<number, (typeof existing)[number]>();
        for (const r of existing) existingById.set(r.id, r);

        // 2) Sanitize input (trim names/codes, dedupe sibling names by first occurrence), keep provided id if any
        type JsonNode = { id?: number; nama?: string; kode?: string | null; children?: JsonNode[] };
        const sanitize = (nodes: JsonNode[]): JsonNode[] => {
          const out: JsonNode[] = [];
          const seen = new Set<string>();
          for (const raw of nodes) {
            const name = String(raw?.nama || '').trim();
            if (!name) continue;
            const key = name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            const kids = Array.isArray(raw?.children) ? raw.children! : [];
            const kode = raw?.kode == null ? null : String(raw.kode).trim() || null;
            out.push({ id: raw?.id, nama: name, kode, children: sanitize(kids) });
          }
          return out;
        };
        const sanitizedRoot = sanitize(tree as JsonNode[]);

        const usedIds = new Set<number>();

        // 3) Upsert traversal preserving IDs
        const upsertNode = async (node: JsonNode, parentId: number | null, order: number, depth: number): Promise<number> => {
          try {
            const children = Array.isArray(node.children) ? node.children : [];
            const hasChildren = children.length > 0;
            let nodeId: number;

            if (node.id && existingById.has(node.id)) {
              // Update existing node in-place (preserve id)
              nodeId = node.id;
              console.log(`[PUT tree] Updating existing node ${nodeId}: ${node.nama}`);
              await tx.proyekModule.update({
                where: { id: nodeId },
                data: { parentId, order, depth, nama: String(node.nama || ''), kode: node.kode ?? undefined, isLeaf: !hasChildren },
              });
            } else {
              // Create new node
              console.log(`[PUT tree] Creating new node: ${node.nama} (parent: ${parentId}, order: ${order})`);

              const createData: any = {
                projectId,
                parentId,
                nama: String(node.nama || ''),
                kode: node.kode ?? null,
                order,
                depth,
                isLeaf: !hasChildren
              };

              if (latestBAVersion) {
                createData.version = latestBAVersion;
                createData.baVersion = latestBAVersion;
              }

              const created = await tx.proyekModule.create({
                data: createData,
              });
              nodeId = created.id;
              console.log(`[PUT tree] Created node with ID: ${nodeId}`);
            }

            usedIds.add(nodeId);

            // Recurse for children
            for (let i = 0; i < children.length; i++) {
              await upsertNode(children[i], nodeId, i + 1, depth + 1);
            }

            return nodeId;
          } catch (error: any) {
            console.error(`[PUT tree] Error upserting node "${node.nama}":`, error);
            throw error; // Re-throw to be caught by outer try-catch
          }
        };

        console.log(`[PUT tree] Processing ${sanitizedRoot.length} root nodes`);
        for (let i = 0; i < sanitizedRoot.length; i++) {
          console.log(`[PUT tree] Processing root node ${i + 1}: ${sanitizedRoot[i].nama}`);
          await upsertNode(sanitizedRoot[i], null, i + 1, 0);
        }

        // 4) Delete nodes that are no longer present in the incoming tree
        const toDeleteIds = existing.filter((r) => !usedIds.has(r.id)).map((r) => r.id);
        console.log(`[PUT tree] Deleting ${toDeleteIds.length} unused nodes`);
        if (toDeleteIds.length) {
          await tx.proyekModule.deleteMany({ where: { id: { in: toDeleteIds }, projectId } });
        }

        // 5) Regenerate hierarchical kode for this project using two-digit per level based on current order
        // Example formats: 01, 01.03, 01.03.02
        console.log(`[PUT tree] Regenerating hierarchical codes for project ${projectId}`);

        // Get all nodes for this project ordered by hierarchy
        const allNodes = await tx.proyekModule.findMany({
          where: { projectId },
          orderBy: [
            { parentId: 'asc' },
            { order: 'asc' }
          ]
        });

        // Build hierarchy map
        const nodesByParent = new Map<number | null, any[]>();
        allNodes.forEach(node => {
          const parentId = node.parentId;
          if (!nodesByParent.has(parentId)) {
            nodesByParent.set(parentId, []);
          }
          nodesByParent.get(parentId)!.push(node);
        });

        // Generate codes recursively
        const generateCodes = async (parentId: number | null, parentCode: string = '') => {
          const children = nodesByParent.get(parentId) || [];

          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const orderStr = String(child.order || (i + 1)).padStart(2, '0');
            const newCode = parentCode ? `${parentCode}.${orderStr}` : orderStr;

            // Update the node with new code
            await tx.proyekModule.update({
              where: { id: child.id },
              data: { kode: newCode }
            });

            // Recursively generate codes for children
            await generateCodes(child.id, newCode);
          }
        };

        await generateCodes(null);
        console.log(`[PUT tree] Successfully completed transaction for project ${projectId}`);
      }, { timeout: 30000 });

      console.log(`[PUT tree] Successfully saved tree for project ${projectId}`);
      return NextResponse.json({ ok: true });

    } catch (error: any) {
      lastError = error;

      // Check if it's a write conflict/deadlock error (P2034)
      if (error.code === 'P2034' && attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff: 1s, 2s, 4s (max 5s)
        console.warn(`[PUT tree] Write conflict detected (attempt ${attempt}/${maxRetries}). Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue; // Retry
      }

      // If it's not a retryable error or we've exhausted retries, throw
      throw error;
    }
  }

  // If we get here, all retries failed
  console.error(`[PUT tree] All ${maxRetries} attempts failed for project ${projectId}:`, lastError);
  return NextResponse.json({
    error: 'Failed to save tree after multiple attempts. Please try again.',
    details: lastError?.code === 'P2034' ? 'Write conflict detected' : 'Unknown error'
  }, { status: 409 });
}

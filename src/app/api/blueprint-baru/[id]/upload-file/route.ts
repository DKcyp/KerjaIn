import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { logBacaraActivity, extractRequestInfo } from '@/lib/bacaraLogger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(req);
  
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const baId = formData.get('baId') as string;
    const type = formData.get('type') as 'RFC' | 'CED' | 'OK';
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file || !baId || !type) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/upload-file`,
        httpMethod: 'POST',
        ...requestInfo,
        requestParams: { baId, type, fileName: file?.name },
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'Missing parameters',
        errorCode: 'VALIDATION_ERROR',
        projectId,
        baId: baId ? parseInt(baId) : undefined,
        actionType: 'UPLOAD_FILE',
        actionDescription: `Pengunggahan berkas ${type} gagal karena data yang diperlukan belum lengkap`,
        userId: uploadedBy ? parseInt(uploadedBy) : 1,
      });
      
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // Verify that the baId exists in bacara table
    const bacaraExists = await prisma.bacara.findUnique({
      where: { id: parseInt(baId) }
    });

    if (!bacaraExists) {
      console.error(`Bacara with ID ${baId} does not exist`);
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/upload-file`,
        httpMethod: 'POST',
        ...requestInfo,
        requestParams: { baId, type, fileName: file.name },
        responseStatusCode: 404,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'BA not found',
        errorCode: 'NOT_FOUND',
        projectId,
        baId: parseInt(baId),
        actionType: 'UPLOAD_FILE',
        actionDescription: `Pengunggahan berkas ${type} gagal karena data Blueprint tidak ditemukan`,
        userId: uploadedBy ? parseInt(uploadedBy) : 1,
      });
      
      return NextResponse.json({ 
        success: false, 
        error: `BA/Bacara with ID ${baId} not found. Please ensure the BA exists before uploading files.` 
      }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ba-files');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${type}_${baId}_${Date.now()}_${file.name}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/ba-files/${filename}`;

    // Set semua file dengan type yang sama jadi is_latest = false
    await prisma.bADoc.updateMany({
      where: { baId: parseInt(baId), type },
      data: { isLatest: false }
    });

    // Insert file baru dengan is_latest = true
    await prisma.bADoc.create({
      data: {
        baId: parseInt(baId),
        type,
        filePath: fileUrl,
        fileName: file.name,
        fileSize: file.size,
        isLatest: true,
        uploadedBy: uploadedBy ? parseInt(uploadedBy) : null,
      }
    });

    // Update kolom lama di business_analyst untuk backward compatibility
    const updateData = type === 'RFC' ? { fileRFC: fileUrl } : type === 'CED' ? { fileCED: fileUrl } : { fileOK: fileUrl };
    await prisma.bacara.update({
      where: { id: parseInt(baId) },
      data: updateData
    });

    const responseTime = Date.now() - startTime;
    
    // Log to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${id}/upload-file`,
      httpMethod: 'POST',
      ...requestInfo,
      requestParams: { baId, type, fileName: file.name, fileSize: file.size },
      responseStatusCode: 200,
      responseTimeMs: responseTime,
      isError: false,
      projectId: bacaraExists.projectId,
      baId: parseInt(baId),
      actionType: 'UPLOAD_FILE',
      actionDescription: `Berkas ${type} "${file.name}" berhasil diunggah untuk Blueprint "${bacaraExists.nama}"`,
      statusBa: bacaraExists.status,
      userId: uploadedBy ? parseInt(uploadedBy) : 1,
    });

    return NextResponse.json({ success: true, fileUrl });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    const responseTime = Date.now() - startTime;
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload file';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code === 'P2003') {
      errorMessage = 'BA/Bacara ID does not exist. Please ensure the BA is created before uploading files.';
      errorCode = 'FOREIGN_KEY_CONSTRAINT';
    } else if (error.code === 'P2025') {
      errorMessage = 'BA/Bacara not found for update.';
      errorCode = 'NOT_FOUND';
    } else if (error.message) {
      errorMessage = error.message;
      errorCode = error.code || 'INTERNAL_ERROR';
    }
    
    // Log error to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${req.url}`,
      httpMethod: 'POST',
      ...requestInfo,
      responseStatusCode: 500,
      responseTimeMs: responseTime,
      isError: true,
      errorMessage,
      errorCode,
      actionType: 'UPLOAD_FILE',
      actionDescription: 'Pengunggahan berkas gagal karena terjadi kesalahan pada sistem',
      userId: 1,
    });
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: error.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}

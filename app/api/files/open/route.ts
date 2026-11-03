import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { createS3Client, displayName, missingEnvResponse, NO_STORE, UPLOADS_PREFIX } from "@/lib/s3";

export const dynamic = "force-dynamic";

const URL_EXPIRY_SECONDS = 300; // 5 minutos: solo debe alcanzar para iniciar la descarga.

export async function GET(request: NextRequest) {
  const envError = missingEnvResponse();
  if (envError) return envError;

  const key = request.nextUrl.searchParams.get("key");
  if (!key || !key.startsWith(UPLOADS_PREFIX) || key.includes("..")) {
    return NextResponse.json({ error: "Clave de archivo no válida" }, { status: 400, headers: NO_STORE });
  }

  const filename = displayName(key).replace(/[^a-zA-Z0-9._-]/g, "_");
  const download = request.nextUrl.searchParams.get("download") === "1";

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `${download ? "attachment" : "inline"}; filename="${filename}"`,
  });

  try {
    // El servidor solo firma y redirige: el archivo viaja de S3 al navegador.
    const url = await getSignedUrl(createS3Client(), command, { expiresIn: URL_EXPIRY_SECONDS });
    return NextResponse.redirect(url, { status: 302, headers: NO_STORE });
  } catch (error) {
    console.error("No se pudo generar la URL de lectura", error);
    return NextResponse.json({ error: "No se pudo generar la URL" }, { status: 500, headers: NO_STORE });
  }
}

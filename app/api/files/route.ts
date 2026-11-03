import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { createS3Client, displayName, missingEnvResponse, NO_STORE, UPLOADS_PREFIX } from "@/lib/s3";

export const dynamic = "force-dynamic";

const MAX_FILES = 100;

export async function GET() {
  const envError = missingEnvResponse();
  if (envError) return envError;

  try {
    const result = await createS3Client().send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: UPLOADS_PREFIX,
        MaxKeys: MAX_FILES,
      }),
    );

    const files = (result.Contents ?? [])
      .filter((object) => object.Key && object.Key !== UPLOADS_PREFIX)
      .map((object) => ({
        key: object.Key!,
        name: displayName(object.Key!),
        size: object.Size ?? 0,
        lastModified: object.LastModified?.toISOString() ?? null,
      }))
      .sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""));

    return NextResponse.json({ files, truncated: Boolean(result.IsTruncated) }, { headers: NO_STORE });
  } catch (error) {
    // Listar sí contacta a S3, así que un permiso faltante aparece aquí mismo.
    if (error instanceof Error && error.name === "AccessDenied") {
      return NextResponse.json(
        { error: "AccessDenied: la política IAM todavía no permite s3:ListBucket." },
        { status: 403, headers: NO_STORE },
      );
    }
    console.error("No se pudo listar el bucket", error);
    return NextResponse.json({ error: "No se pudo listar el bucket" }, { status: 500, headers: NO_STORE });
  }
}

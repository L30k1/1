import { S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const REQUIRED_ENV = ["S3_BUCKET_NAME", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

export const NO_STORE = { "Cache-Control": "no-store" };
export const UPLOADS_PREFIX = "uploads/";

const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/;

// uploads/<uuid>-archivo.png -> archivo.png
export function displayName(key: string) {
  return key.slice(UPLOADS_PREFIX.length).replace(UUID_PREFIX, "");
}

// Devuelve la respuesta de error si falta una variable, o null si están todas.
export function missingEnvResponse() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length === 0) return null;
  return NextResponse.json(
    { error: `Faltan variables de entorno: ${missing.join(", ")}` },
    { status: 500, headers: NO_STORE },
  );
}

export function createS3Client() {
  return new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

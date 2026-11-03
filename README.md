# Ingesta de datos NASA a S3

Boilerplate para subir archivos pesados directo del navegador a Amazon S3 con URLs prefirmadas. Stack: Next.js (App Router), AWS Amplify y Amazon S3.

## Flujo de datos

1. `app/page.tsx` pide permiso con `GET /api/upload?filename=...&contentType=...`.
2. `app/api/upload/route.ts` genera una URL temporal de 15 minutos con `PutObjectCommand` y `getSignedUrl`.
3. `app/page.tsx` sube el archivo con un `PUT` directo a esa URL. El archivo no pasa por el servidor.

Máximo por archivo: 5 GB, el límite de S3 para un solo `PUT`.

## Consulta de archivos

1. `app/api/files/route.ts` lista desde el servidor hasta 100 objetos de `uploads/`. El navegador no habla con S3 en este paso.
2. `app/api/files/open/route.ts` genera una URL de lectura de 5 minutos con `GetObjectCommand` y redirige al navegador.
3. El navegador descarga el archivo directo de S3. Es una navegación normal, así que no requiere cambios de CORS.

## Configuración

### Variables de entorno en Amplify

Agrégalas antes de compilar. Amplify no permite variables con el prefijo `AWS`, y `amplify.yml` las copia a `.env.production` para que Next.js pueda leerlas en el servidor.

| Variable | Valor |
| --- | --- |
| `S3_BUCKET_NAME` | Nombre del bucket |
| `S3_REGION` | Región del bucket, ej. `us-east-1` |
| `S3_ACCESS_KEY_ID` | Access key del usuario IAM |
| `S3_SECRET_ACCESS_KEY` | Secret access key del usuario IAM |

Cualquier cambio en estas variables requiere un nuevo despliegue.

### CORS del bucket

Plantilla: [`config/s3-cors.json`](config/s3-cors.json). Reemplaza `<APP_ID>` y pégala en S3 > tu bucket > Permissions > Cross-origin resource sharing (CORS).

### Política IAM inline

Reemplaza `<NOMBRE_DEL_BUCKET>` y agrégala al usuario de la API:

- Solo subidas: [`config/iam-inline-policy.json`](config/iam-inline-policy.json)
- Subidas, listado y lectura: [`config/iam-inline-policy-lectura.json`](config/iam-inline-policy-lectura.json)

Con la primera, el panel de archivos muestra `AccessDenied`. Los cambios de IAM no requieren un nuevo despliegue.

## Desarrollo local

```bash
cp .env.example .env.local   # y completa los valores
npm install
npm run dev
```

Requiere Node.js 20 o superior.

## Bloqueos de IAM y CORS

Firmar una URL no contacta a AWS, así que unas credenciales incorrectas fallan en el `PUT`, no en la API.

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| La compilación falla en `env \| grep` | No hay variables `S3_*` en Amplify | Agrégalas y vuelve a desplegar |
| `Faltan variables de entorno` | Falta una variable, o se agregó después de compilar | Corrígela y vuelve a desplegar |
| Error de CORS en el navegador | El bucket no tiene CORS, o el origen no coincide | Usa el dominio exacto, con `https://` y sin `/` final |
| `403 AccessDenied` al subir | La política no cubre el bucket o `uploads/*` | Revisa el `Resource` de la política |
| `AccessDenied` en el panel de archivos | Falta `s3:ListBucket`, que aplica sobre el ARN del bucket, sin `/*` | Usa la política de lectura |
| XML `AccessDenied` al abrir un archivo | Falta `s3:GetObject` | Usa la política de lectura |
| `403 InvalidAccessKeyId` | Access key incorrecta o eliminada | Corrige `S3_ACCESS_KEY_ID` y vuelve a desplegar |
| `403 SignatureDoesNotMatch` | Secret incorrecto | Corrige `S3_SECRET_ACCESS_KEY` y vuelve a desplegar |
| `Request has expired` | Pasaron más de 15 minutos | Intenta de nuevo para obtener otra URL |
| Redirección o CORS según la región | `S3_REGION` no es la región del bucket | Usa la región exacta y vuelve a desplegar |

## Simulacro de despliegue

Pendiente: completar tras ejecutarlo en una cuenta AWS limpia.

| Etapa | Tiempo medido |
| --- | --- |
| Bucket y usuario IAM | |
| Copia del repositorio y primera compilación | |
| Diagnóstico y corrección de CORS | |
| Subida de 176 MB | |
| Ampliación de permisos y lectura | |

Bloqueos encontrados: pendiente.

## Antes de usar en producción

Este repositorio es material de laboratorio. La API es pública, así que cualquiera con el enlace puede subir, listar y descargar archivos, y usa claves de acceso de larga duración. En producción, exige autenticación, usa un rol IAM para el cómputo y limita el tamaño de los archivos.

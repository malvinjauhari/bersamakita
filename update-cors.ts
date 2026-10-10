import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) throw new Error("No service account");
  const keys = JSON.parse(serviceAccountJson);

  const auth = new GoogleAuth({
    credentials: {
      client_email: keys.client_email,
      private_key: keys.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  const client = await auth.getClient();

  const bucketName = 'bersamakita-app.appspot.com';
  const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}`;

  try {
    const res = await client.request({ url });
    console.log("Bucket exists:", (res.data as { name?: string }).name);

    // Now try to update CORS
    const patchUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}`;
    const patchRes = await client.request({
      url: patchUrl,
      method: 'PATCH',
      data: {
        cors: [
          {
            origin: ["*"],
            method: ["GET", "PUT", "POST", "DELETE", "OPTIONS", "HEAD"],
            responseHeader: ["*"],
            maxAgeSeconds: 3600
          }
        ]
      }
    });
    console.log("CORS updated:", JSON.stringify((patchRes.data as { cors?: unknown }).cors, null, 2));
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main().catch(console.error);

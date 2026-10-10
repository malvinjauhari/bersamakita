import { auth } from '../config/firebase';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_IMAGE_EXTENSIONS = 'JPG, JPEG, PNG, WEBP';

export interface UploadedImage {
  secureUrl: string;
  publicId: string;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/** Client-side validation shared by every image upload entry point. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `Format file tidak didukung. Gunakan ${ACCEPTED_IMAGE_EXTENSIONS}.`;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Ukuran gambar maksimal ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
}

async function requestUploadSignature(folder: string): Promise<UploadSignature> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang untuk mengunggah gambar.');
  }

  const res = await fetch('/api/images/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ folder }),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message || 'Server menolak permintaan upload gambar.');
  }
  return payload.data as UploadSignature;
}

/**
 * Uploads a file directly to Cloudinary using a signature issued by the backend.
 * The Cloudinary API secret stays server-side; only `api_key`, `timestamp`,
 * `folder` and the signature are sent to Cloudinary together with the file.
 */
export function uploadImageToCloudinary(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<UploadedImage> {
  const invalid = validateImageFile(file);
  if (invalid) {
    return Promise.reject(new Error(invalid));
  }

  return requestUploadSignature(folder).then(
    (sign) =>
      new Promise<UploadedImage>((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sign.apiKey);
        formData.append('timestamp', String(sign.timestamp));
        formData.append('folder', sign.folder);
        formData.append('signature', sign.signature);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`);

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
            }
          };
        }

        xhr.onerror = () => reject(new Error('Koneksi ke Cloudinary gagal. Periksa jaringan Anda.'));
        xhr.ontimeout = () => reject(new Error('Upload gambar melebat waktu. Coba lagi.'));
        xhr.onload = () => {
          let body: any = null;
          try {
            body = JSON.parse(xhr.responseText);
          } catch {
            body = null;
          }
          if (xhr.status >= 200 && xhr.status < 300 && body?.secure_url && body?.public_id) {
            resolve({ secureUrl: body.secure_url as string, publicId: body.public_id as string });
          } else {
            const cloudinaryMessage = body?.error?.message;
            reject(new Error(cloudinaryMessage ? `Cloudinary menolak gambar: ${cloudinaryMessage}` : 'Upload gambar gagal.'));
          }
        };

        xhr.send(formData);
      })
  );
}

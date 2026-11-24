import * as FileSystem from 'expo-file-system/legacy';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';

/**
 * Configurações da API S3 do Cloudflare R2
 */
export const R2_CONFIG = {
  endpoint: 'https://5c130e1182d48ffe8c128e9e0403afe1.r2.cloudflarestorage.com',
  accessKeyId: 'cb950c2956a4b46ed9befcc57808fb6e',
  secretAccessKey: '2bfd3891635504cbd307c769fefd70a621896619d99f97f68173558c8dc42cc5',
  bucket: 'comprovacoes',
  region: 'auto',
  service: 's3',
  /** Se você configurar um domínio público ou r2.dev no Cloudflare R2, insira aqui (opcional). */
  publicDomain: '',
};

function hmacSHA256(key: any, message: string) {
  return CryptoJS.HmacSHA256(message, key);
}

function sha256Hex(message: string): string {
  return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string) {
  const kDate = hmacSHA256('AWS4' + secretKey, dateStamp);
  const kRegion = hmacSHA256(kDate, region);
  const kService = hmacSHA256(kRegion, service);
  return hmacSHA256(kService, 'aws4_request');
}

/**
 * Gera uma URL pré-assinada para upload (PUT) no bucket R2 usando AWS SigV4.
 */
export function gerarUrlPresignadaPut(
  key: string,
  contentType: string = 'image/jpeg',
  expiraSegundos: number = 3600,
): string {
  const urlObj = new URL(R2_CONFIG.endpoint);
  const host = urlObj.host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const credentialScope = `${dateStamp}/${R2_CONFIG.region}/${R2_CONFIG.service}/aws4_request`;

  const queryParams: [string, string][] = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${R2_CONFIG.accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expiraSegundos.toString()],
    ['X-Amz-SignedHeaders', 'host'],
  ];

  const canonicalQuerystring = queryParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .sort()
    .join('&');

  const canonicalUri = `/${R2_CONFIG.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest =
    `PUT\n${canonicalUri}\n${canonicalQuerystring}\n` +
    `${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const signingKey = getSigningKey(
    R2_CONFIG.secretAccessKey,
    dateStamp,
    R2_CONFIG.region,
    R2_CONFIG.service,
  );
  const signature = CryptoJS.HmacSHA256(stringToSign, signingKey).toString(CryptoJS.enc.Hex);

  return `${R2_CONFIG.endpoint}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
}

/**
 * Gera uma URL pré-assinada para download/leitura (GET) de uma imagem privada no bucket R2.
 * Por padrão expira em 7 dias (máximo permitido pelo protocolo AWS SigV4).
 */
export function gerarUrlPresignadaGet(
  key: string,
  expiraSegundos: number = 604800, // 7 dias
): string {
  const urlObj = new URL(R2_CONFIG.endpoint);
  const host = urlObj.host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const credentialScope = `${dateStamp}/${R2_CONFIG.region}/${R2_CONFIG.service}/aws4_request`;

  const queryParams: [string, string][] = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${R2_CONFIG.accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expiraSegundos.toString()],
    ['X-Amz-SignedHeaders', 'host'],
  ];

  const canonicalQuerystring = queryParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .sort()
    .join('&');

  const canonicalUri = `/${R2_CONFIG.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest =
    `GET\n${canonicalUri}\n${canonicalQuerystring}\n` +
    `${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const signingKey = getSigningKey(
    R2_CONFIG.secretAccessKey,
    dateStamp,
    R2_CONFIG.region,
    R2_CONFIG.service,
  );
  const signature = CryptoJS.HmacSHA256(stringToSign, signingKey).toString(CryptoJS.enc.Hex);

  return `${R2_CONFIG.endpoint}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
}

const cacheUrlsAssinadas = new Map<string, { url: string; expiraEm: number }>();

/**
 * Retorna uma URL válida para carregar no componente <Image source={{ uri }} />.
 * Caso seja um identificador de chave do R2 (ex: 'tarefas/123/foto_0.jpg'), gera a URL assinada e cacheia.
 */
export function obterUrlVisualizacaoFoto(keyOuUrl: string): string {
  if (!keyOuUrl) return '';

  // Se já for URI local ou data URI
  if (
    keyOuUrl.startsWith('file://') ||
    keyOuUrl.startsWith('content://') ||
    keyOuUrl.startsWith('data:')
  ) {
    return keyOuUrl;
  }

  // Se já tiver domínio público configurado
  if (R2_CONFIG.publicDomain && !keyOuUrl.startsWith('http')) {
    const limpo = keyOuUrl.startsWith('/') ? keyOuUrl.substring(1) : keyOuUrl;
    return `${R2_CONFIG.publicDomain.replace(/\/$/, '')}/${limpo}`;
  }

  // Se for chave interna ou caminho do bucket
  if (!keyOuUrl.startsWith('http://') && !keyOuUrl.startsWith('https://')) {
    const agora = Date.now();
    const cache = cacheUrlsAssinadas.get(keyOuUrl);
    // Reutiliza a URL enquanto ainda for válida (com margem de segurança de 1 hora)
    if (cache && cache.expiraEm > agora + 3600 * 1000) {
      return cache.url;
    }

    const novaUrl = gerarUrlPresignadaGet(keyOuUrl, 604800); // 7 dias
    cacheUrlsAssinadas.set(keyOuUrl, {
      url: novaUrl,
      expiraEm: agora + 604800 * 1000,
    });
    return novaUrl;
  }

  return keyOuUrl;
}

export interface UploadFotoParametros {
  moradiaId?: string;
  tarefaId: string;
  instanciaId?: string;
  indice: number; // 0, 1 ou 2
}

/**
 * Faz o upload nativo de uma foto local para o Cloudflare R2 usando URL pré-assinada S3.
 * Usa FileSystem.uploadAsync no Android/iOS (evita problemas com React Native Blob) e fetch no Web.
 */
export async function uploadFotoComprovacao(
  localUri: string,
  params: UploadFotoParametros,
): Promise<{ key: string; url: string }> {
  const idIdentificador = params.instanciaId || params.tarefaId || 'geral';
  const timestamp = Date.now();
  const key = `tarefas/${idIdentificador}/foto_${params.indice}_${timestamp}.jpg`;
  const contentType = 'image/jpeg';

  // 1. Gera URL pré-assinada de PUT
  const presignedPutUrl = gerarUrlPresignadaPut(key, contentType, 3600);

  // 2. Upload nativo via FileSystem no iOS e Android (stream direto de arquivo binário)
  if (Platform.OS !== 'web' && FileSystem && typeof FileSystem.uploadAsync === 'function') {
    const uploadResult = await FileSystem.uploadAsync(presignedPutUrl, localUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': contentType,
      },
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(
        `Falha no upload para o Cloudflare R2: status ${uploadResult.status}. ${uploadResult.body}`,
      );
    }
  } else {
    // Fallback para Web
    const localFileResponse = await fetch(localUri);
    const blob = await localFileResponse.blob();

    const uploadResponse = await fetch(presignedPutUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => '');
      throw new Error(
        `Falha no upload para o Cloudflare R2: status ${uploadResponse.status} ` +
          `${uploadResponse.statusText}. ${errorText}`,
      );
    }
  }

  // 3. Gera URL de visualização (GET) e insere no cache
  const viewUrl = gerarUrlPresignadaGet(key);
  cacheUrlsAssinadas.set(key, {
    url: viewUrl,
    expiraEm: Date.now() + 604800 * 1000,
  });

  return {
    key,
    url: viewUrl,
  };
}

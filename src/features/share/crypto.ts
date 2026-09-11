import { base64ToBytes, bytesToBase64 } from './base64'
import { shareEnvelopeSchema, type ShareData, type ShareEnvelope } from './shareData'

// 口令保护：PBKDF2-SHA256 派生 AES-GCM-256 密钥，加密整个 ShareData。
// 防的是链接泄露与托管平台翻看文件；无法防御托管方恶意替换页面代码窃取口令。
export const SHARE_KDF_ITERATIONS = 310_000
const SALT_LENGTH = 16
const IV_LENGTH = 12

// 解密失败（口令错误或密文被篡改）的哨兵错误码，由调用方映射为友好提示。
export const SHARE_DECRYPT_FAILED = 'SHARE_DECRYPT_FAILED'

function getCrypto(): Crypto {
  const instance = globalThis.crypto
  if (!instance?.subtle) throw new Error('当前环境不支持 WebCrypto')
  return instance
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await getCrypto().subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return getCrypto().subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function encryptShareData(data: ShareData, passphrase: string): Promise<ShareEnvelope> {
  const salt = getCrypto().getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = getCrypto().getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(passphrase, salt, SHARE_KDF_ITERATIONS)
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext = new Uint8Array(await getCrypto().subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext))
  return {
    format: 'praxis-share', version: 1, encrypted: true, kdf: 'PBKDF2-SHA256', iterations: SHARE_KDF_ITERATIONS,
    salt: bytesToBase64(salt), iv: bytesToBase64(iv), payload: bytesToBase64(ciphertext),
  }
}

export async function decryptShareData(envelope: ShareEnvelope, passphrase: string): Promise<unknown> {
  const parsed = shareEnvelopeSchema.parse(envelope)
  if (!parsed.encrypted) return JSON.parse(new TextDecoder().decode(base64ToBytes(parsed.payload)))
  const key = await deriveKey(passphrase, base64ToBytes(parsed.salt), parsed.iterations)
  try {
    const plaintext = await getCrypto().subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(parsed.iv) }, key, base64ToBytes(parsed.payload))
    return JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    throw new Error(SHARE_DECRYPT_FAILED)
  }
}

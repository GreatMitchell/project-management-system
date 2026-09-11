import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { webcrypto } from 'node:crypto'
import { vi } from 'vitest'

// jsdom 不实现 WebCrypto subtle；分享加密测试需要它。
if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto)

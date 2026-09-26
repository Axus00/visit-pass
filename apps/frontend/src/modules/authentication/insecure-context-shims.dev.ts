import { sha256 } from '@noble/hashes/sha2.js';

/**
 * Lets AuthKit sign in when the dev server is opened over plain HTTP from
 * another device on the LAN (`http://<ip>:<port>`). Browsers only expose
 * `crypto.subtle` in secure contexts (HTTPS or localhost), and AuthKit hashes
 * its PKCE verifier with `crypto.subtle.digest('SHA-256', …)`. Development
 * only: `main.tsx` loads this module behind `import.meta.env.DEV`.
 */
export function installInsecureContextShims() {
  const needsSubtleCrypto = !window.isSecureContext && !crypto.subtle;
  if (!needsSubtleCrypto) return;

  const subtle = {
    digest: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name;

      if (name.toUpperCase() !== 'SHA-256')
        throw new Error('The insecure-context shim only supports SHA-256');

      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);

      return sha256(bytes).slice().buffer;
    },
  };

  Object.defineProperty(crypto, 'subtle', { value: subtle });
}

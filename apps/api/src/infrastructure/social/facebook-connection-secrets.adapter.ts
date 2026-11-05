import { createCipheriv, createHash, randomBytes } from "node:crypto";
import type { FacebookConnectionSecrets } from "@/application/ports/providers/facebook-connection-secrets.port.ts";

export function facebookConnectionSecrets(
  key: Buffer,
): FacebookConnectionSecrets {
  return {
    createState: () => randomBytes(32).toString("base64url"),
    digest: (state) => createHash("sha256").update(state).digest("hex"),
    seal(agentId, pageId, token) {
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, nonce);
      cipher.setAAD(Buffer.from(`facebook-page:v1:${agentId}:${pageId}`));
      const data = Buffer.concat([
        cipher.update(token, "utf8"),
        cipher.final(),
      ]);
      return [
        "v1",
        nonce.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
        data.toString("base64url"),
      ].join(".");
    },
  };
}

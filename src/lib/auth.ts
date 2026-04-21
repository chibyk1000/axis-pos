export async function hashPassword(plain: string): Promise<string> {
  const buffer = new TextEncoder().encode(plain);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return (await hashPassword(plain)) === hash;
}

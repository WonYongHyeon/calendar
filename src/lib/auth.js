// src/lib/auth.js

const encoder = new TextEncoder();

// HEX 문자열을 바이트 배열로 변환
function hexToBytes(hex) {
  if (
    typeof hex !== "string" ||
    hex.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(hex)
  ) {
    throw new Error("Invalid hex");
  }

  return Uint8Array.from(hex.match(/.{2}/g), (byte) => parseInt(byte, 16));
}

// 바이트 배열을 HEX 문자열로 변환
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// 비밀번호 검증
export async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split("$");

    if (parts.length !== 4) return false;

    const [algorithm, iterationsText, saltHex, hashHex] = parts;

    if (algorithm !== "pbkdf2_sha256") return false;

    const iterations = Number(iterationsText);

    if (![600000, 10000].includes(iterations)) return false;

    const salt = hexToBytes(saltHex);
    const expectedHash = hexToBytes(hashHex);

    if (salt.length !== 16 || expectedHash.length !== 32) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      key,
      256,
    );

    const actualHash = new Uint8Array(derivedBits);

    // 해시 비교
    let difference = 0;

    for (let i = 0; i < expectedHash.length; i++) {
      difference |= expectedHash[i] ^ actualHash[i];
    }

    return difference === 0;
  } catch (error) {
    console.error("비밀번호 검증 오류:", error.name, error.message);

    return false;
  }
}

// 로그인 세션 토큰 생성
export function generateSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return bytesToHex(bytes);
}

// 세션 토큰 해시 생성
export async function hashSessionToken(token) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(token));

  return bytesToHex(new Uint8Array(hash));
}

// 새로운 관리자 비밀번호 해시 생성
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 10000,
      hash: "SHA-256",
    },
    key,
    256,
  );

  const hash = new Uint8Array(derivedBits);

  return `pbkdf2_sha256$10000$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

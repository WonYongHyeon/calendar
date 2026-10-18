// src/lib/auth.js

const encoder = new TextEncoder();

// ========================================
// 비밀번호 암호화 설정
// ========================================

const PASSWORD_ALGORITHM = "pbkdf2_sha256";
const PASSWORD_ITERATIONS = 10000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

// ========================================
// HEX 변환
// ========================================

// HEX 문자열 → 바이트 배열
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

// 바이트 배열 → HEX 문자열
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// ========================================
// 비밀번호 검증
// ========================================

export async function verifyPassword(password, storedHash) {
  try {
    if (typeof password !== "string" || typeof storedHash !== "string") {
      return false;
    }

    const parts = storedHash.split("$");

    if (parts.length !== 4) {
      return false;
    }

    const [algorithm, iterationsText, saltHex, hashHex] = parts;

    // 암호화 알고리즘 확인
    if (algorithm !== PASSWORD_ALGORITHM) {
      return false;
    }

    // 반복 횟수 확인
    if (iterationsText !== String(PASSWORD_ITERATIONS)) {
      return false;
    }

    const salt = hexToBytes(saltHex);
    const expectedHash = hexToBytes(hashHex);

    // Salt 및 Hash 길이 확인
    if (salt.length !== SALT_LENGTH || expectedHash.length !== HASH_LENGTH) {
      return false;
    }

    // 비밀번호 키 생성
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );

    // 비밀번호 해시 계산
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: PASSWORD_ITERATIONS,
        hash: "SHA-256",
      },
      key,
      HASH_LENGTH * 8,
    );

    const actualHash = new Uint8Array(derivedBits);

    // 일정한 길이의 해시 비교
    let difference = 0;

    for (let i = 0; i < HASH_LENGTH; i++) {
      difference |= expectedHash[i] ^ actualHash[i];
    }

    return difference === 0;
  } catch (error) {
    console.error("비밀번호 검증 오류:", error.name, error.message);

    return false;
  }
}

// ========================================
// 로그인 세션 토큰 생성
// ========================================

export function generateSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return bytesToHex(bytes);
}

// ========================================
// 세션 토큰 해시 생성
// ========================================

export async function hashSessionToken(token) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(token));

  return bytesToHex(new Uint8Array(hash));
}

// ========================================
// 관리자 비밀번호 해시 생성
// ========================================

export async function hashPassword(password) {
  // 무작위 Salt 생성
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // 비밀번호 키 생성
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  // 비밀번호 해시 계산
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    HASH_LENGTH * 8,
  );

  const hash = new Uint8Array(derivedBits);

  // DB 저장 형식
  return [
    PASSWORD_ALGORITHM,
    PASSWORD_ITERATIONS,
    bytesToHex(salt),
    bytesToHex(hash),
  ].join("$");
}

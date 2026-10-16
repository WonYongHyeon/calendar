import { pbkdf2Sync, randomBytes } from "node:crypto";
import readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const password = await rl.question("관리자 비밀번호 입력: ");

rl.close();

if (password.length < 14) {
  console.error("비밀번호는 14자 이상으로 설정해 주세요.");
  process.exit(1);
}

const salt = randomBytes(16);

const hash = pbkdf2Sync(password, salt, 600000, 32, "sha256");

console.log("\n생성된 비밀번호 해시:\n");

console.log(
  `pbkdf2_sha256$600000$${salt.toString("hex")}$${hash.toString("hex")}`,
);

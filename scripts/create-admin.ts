import { UserRole } from "@prisma/client";
import { hashPassword, normalizeUsername, validatePassword, validateUsername } from "../lib/auth-core";
import { prisma } from "../lib/db";

const username = normalizeUsername(process.env.ADMIN_USERNAME ?? "");
const password = process.env.ADMIN_PASSWORD ?? "";
const displayName = (process.env.ADMIN_DISPLAY_NAME ?? "").trim().slice(0, 24) || null;

async function main() {
  const usernameError = validateUsername(username);
  if (usernameError) throw new Error(`ADMIN_USERNAME 无效：${usernameError}`);

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    const shouldUpdatePassword = password.length > 0;
    if (shouldUpdatePassword) {
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(`ADMIN_PASSWORD 无效：${passwordError}`);
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: UserRole.ADMIN,
        displayName: displayName ?? existingUser.displayName,
        ...(shouldUpdatePassword ? { passwordHash: await hashPassword(password) } : {})
      }
    });
    console.log(`已将用户 ${username} 设置为管理员${shouldUpdatePassword ? "，并更新密码" : ""}。`);
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(`ADMIN_PASSWORD 无效：${passwordError}`);

  await prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash: await hashPassword(password),
      role: UserRole.ADMIN
    }
  });
  console.log(`已创建管理员账号 ${username}。`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

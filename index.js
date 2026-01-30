/**
 * Deno Version of the Argo/Nezha Script (Pure JS Version)
 * * 运行命令:
 * deno run --allow-net --allow-read --allow-write --allow-run --allow-env --unstable main.js
 */

import { exists } from "https://deno.land/std@0.220.0/fs/exists.ts";
import * as path from "https://deno.land/std@0.220.0/path/mod.ts";

// --- 环境变量配置 ---
const UPLOAD_URL = Deno.env.get("UPLOAD_URL") || "";
const PROJECT_URL = Deno.env.get("PROJECT_URL") || "";
const AUTO_ACCESS = Deno.env.get("AUTO_ACCESS") === "true";
const FILE_PATH = Deno.env.get("FILE_PATH") || "./tmp";
const SUB_PATH = Deno.env.get("SUB_PATH") || "sub";
const PORT = Number(Deno.env.get("SERVER_PORT") || Deno.env.get("PORT") || 3000);
const UUID = Deno.env.get("UUID") || "9afd1229-b893-40c1-84dd-51e7ce204913";
const NEZHA_SERVER = Deno.env.get("NEZHA_SERVER") || "";
const NEZHA_PORT = Deno.env.get("NEZHA_PORT") || "";
const NEZHA_KEY = Deno.env.get("NEZHA_KEY") || "";
const ARGO_DOMAIN = Deno.env.get("ARGO_DOMAIN") || "";
const ARGO_AUTH = Deno.env.get("ARGO_AUTH") || "";
const ARGO_PORT = Number(Deno.env.get("ARGO_PORT") || 8001);
const CFIP = Deno.env.get("CFIP") || "cdns.doon.eu.org";
const CFPORT = Number(Deno.env.get("CFPORT") || 443);
const NAME = Deno.env.get("NAME") || "";

// --- 初始化目录 ---
try {
  if (!await exists(FILE_PATH)) {
    await Deno.mkdir(FILE_PATH, { recursive: true });
    console.log(`${FILE_PATH} is created`);
  } else {
    console.log(`${FILE_PATH} already exists`);
  }
} catch (e) {
  console.error(e);
}

// --- 辅助函数 ---

function generateRandomName() {
  const characters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const npmName = generateRandomName();
const webName = generateRandomName();
const botName = generateRandomName();
const phpName = generateRandomName();
const npmPath = path.join(FILE_PATH, npmName);
const phpPath = path.join(FILE_PATH, phpName);
const webPath = path.join(FILE_PATH, webName);
const botPath = path.join(FILE_PATH, botName);
const subPath = path.join(FILE_PATH, "sub.txt");
const listPath = path.join(FILE_PATH, "list.txt");
const bootLogPath = path.join(FILE_PATH, "boot.log");
const configPath = path.join(FILE_PATH, "config.json");

// 删除旧节点
async function deleteNodes() {
  try {
    if (!UPLOAD_URL || !await exists(subPath)) return;

    const fileContent = await Deno.readTextFile(subPath);
    // Base6

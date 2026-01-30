/**
 * Deno Version of the Argo/Nezha Script (Pure JS)
 * * 运行命令:
 * deno run --allow-net --allow-read --allow-write --allow-run --allow-env --unstable index.js
 */

import { exists } from "https://deno.land/std@0.224.0/fs/exists.ts";
import * as path from "https://deno.land/std@0.224.0/path/mod.ts";

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
    const decoded = atob(fileContent);
    const nodes = decoded.split("\n").filter((line) =>
      /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(line)
    );

    if (nodes.length === 0) return;

    await fetch(`${UPLOAD_URL}/api/delete-nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes }),
    }).catch(() => {});
  } catch (_err) {
    // ignore
  }
}

// 清理旧文件
async function cleanupOldFiles() {
  try {
    for await (const entry of Deno.readDir(FILE_PATH)) {
      if (entry.isFile) {
        try {
          await Deno.remove(path.join(FILE_PATH, entry.name));
        } catch (_) {}
      }
    }
  } catch (_err) {}
}

// 生成 Config
async function generateConfig() {
  const config = {
    log: { access: "/dev/null", error: "/dev/null", loglevel: "none" },
    inbounds: [
      {
        port: ARGO_PORT,
        protocol: "vless",
        settings: {
          clients: [{ id: UUID, flow: "xtls-rprx-vision" }],
          decryption: "none",
          fallbacks: [
            { dest: 3001 },
            { path: "/vless-argo", dest: 3002 },
            { path: "/vmess-argo", dest: 3003 },
            { path: "/trojan-argo", dest: 3004 },
          ],
        },
        streamSettings: { network: "tcp" },
      },
      {
        port: 3001,
        listen: "127.0.0.1",
        protocol: "vless",
        settings: { clients: [{ id: UUID }], decryption: "none" },
        streamSettings: { network: "tcp", security: "none" },
      },
      {
        port: 3002,
        listen: "127.0.0.1",
        protocol: "vless",
        settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" },
        streamSettings: {
          network: "ws",
          security: "none",
          wsSettings: { path: "/vless-argo" },
        },
        sniffing: {
          enabled: true,
          destOverride: ["http", "tls", "quic"],
          metadataOnly: false,
        },
      },
      {
        port: 3003,
        listen: "127.0.0.1",
        protocol: "vmess",
        settings: { clients: [{ id: UUID, alterId: 0 }] },
        streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } },
        sniffing: {
          enabled: true,
          destOverride: ["http", "tls", "quic"],
          metadataOnly: false,
        },
      },
      {
        port: 3004,
        listen: "127.0.0.1",
        protocol: "trojan",
        settings: { clients: [{ password: UUID }] },
        streamSettings: {
          network: "ws",
          security: "none",
          wsSettings: { path: "/trojan-argo" },
        },
        sniffing: {
          enabled: true,
          destOverride: ["http", "tls", "quic"],
          metadataOnly: false,
        },
      },
    ],
    dns: { servers: ["https+local://8.8.8.8/dns-query"] },
    outbounds: [
      { protocol: "freedom", tag: "direct" },
      { protocol: "blackhole", tag: "block" },
    ],
  };
  await Deno.writeTextFile(
    path.join(FILE_PATH, "config.json"),
    JSON.stringify(config, null, 2)
  );
}

function getSystemArchitecture() {
  const arch = Deno.build.arch; 
  if (arch === "aarch64") {
    return "arm";
  } else {
    return "amd";
  }
}

// 下载文件
async function downloadFile(fileName, fileUrl) {
  try {
    if (!await exists(FILE_PATH)) {
      await Deno.mkdir(FILE_PATH, { recursive: true });
    }
    const response = await fetch(fileUrl);
    if (!response.body) throw new Error("No response body");

    const file = await Deno.open(fileName, { write: true, create: true });
    await response.body.pipeTo(file.writable);
    console.log(`Download ${path.basename(fileName)} successfully`);
    return fileName;
  } catch (err) {
    const errorMsg = `Download ${path.basename(fileName)} failed: ${err.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

async function downloadFilesAndRun() {
  const architecture = getSystemArchitecture();
  const filesToDownload = getFilesForArchitecture(architecture);

  if (filesToDownload.length === 0) {
    console.log(`Can't find a file for the current architecture`);
    return;
  }

  await Promise.all(
    filesToDownload.map((f) => downloadFile(f.fileName, f.fileUrl))
  );

  // 授权
  const filesToAuthorize = NEZHA_PORT
    ? [npmPath, webPath, botPath]
    : [phpPath, webPath, botPath];
  for (const filePath of filesToAuthorize) {
    if (await exists(filePath)) {
      await Deno.chmod(filePath, 0o775);
      console.log(`Empowerment success for ${filePath}`);
    }
  }

  // 运行 Nezha
  if (NEZHA_SERVER && NEZHA_KEY) {
    if (!NEZHA_PORT) {
      // Nezha V0
      const port = NEZHA_SERVER.includes(":")
        ? NEZHA_SERVER.split(":").pop()
        : "";
      const tlsPorts = new Set(["443", "8443", "2096", "2087", "2083", "2053"]);
      const nezhatls = tlsPorts.has(port || "") ? "true" : "false";

      const configYaml = `
client_secret: ${NEZHA_KEY}
debug: false
disable_auto_update: true
disable_command_execute: false
disable_force_update: true
disable_nat: false
disable_send_query: false
gpu: false
insecure_tls: true
ip_report_period: 1800
report_delay: 4
server: ${NEZHA_SERVER}
skip_connection_count: true
skip_procs_count: true
temperature: false
tls: ${nezhatls}
use_gitee_to_upgrade: false
use_ipv6_country_code: false
uuid: ${UUID}`;

      await Deno.writeTextFile(path.join(FILE_PATH, "config.yaml"), configYaml);

      const cmd = new Deno.Command(phpPath, {
        args: ["-c", `${FILE_PATH}/config.yaml`],
        stdout: "null",
        stderr: "null",
      });
      cmd.spawn();
      console.log(`${phpName} is running`);
    } else {
      // Nezha V1
      let args = [
        "-s",
        `${NEZHA_SERVER}:${NEZHA_PORT}`,
        "-p",
        NEZHA_KEY,
        "--disable-auto-update",
        "--report-delay",
        "4",
        "--skip-conn",
        "--skip-procs",
      ];
      const tlsPorts = ["443", "8443", "2096", "2087", "2083", "2053"];
      if (tlsPorts.includes(NEZHA_PORT)) {
        args.push("--tls");
      }

      const cmd = new Deno.Command(npmPath, {
        args: args,
        stdout: "null",
        stderr: "null",
      });
      cmd.spawn();
      console.log(`${npmName} is running`);
    }
  } else {
    console.log("NEZHA variable is empty, skip running");
  }

  // 运行 Xray
  try {
    const webCmd = new Deno.Command(webPath, {
      args: ["-c", `${FILE_PATH}/config.json`],
      stdout: "null",
      stderr: "null",
    });
    webCmd.spawn();
    console.log(`${webName} is running`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`web running error: ${error}`);
  }

  // 运行 Cloudflared
  if (await exists(botPath)) {
    let args = [];

    if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
      args = [
        "tunnel",
        "--edge-ip-version",
        "auto",
        "--no-autoupdate",
        "--protocol",
        "http2",
        "run",
        "--token",
        ARGO_AUTH,
      ];
    } else if (ARGO_AUTH.match(/TunnelSecret/)) {
      args = [
        "tunnel",
        "--edge-ip-version",
        "auto",
        "--config",
        `${FILE_PATH}/tunnel.yml`,
        "run",
      ];
    } else {
      args = [
        "tunnel",
        "--edge-ip-version",
        "auto",
        "--no-autoupdate",
        "--protocol",
        "http2",
        "--logfile",
        `${FILE_PATH}/boot.log`,
        "--loglevel",
        "info",
        "--url",
        `http://localhost:${ARGO_PORT}`,
      ];
    }

    try {
      const botCmd = new Deno.Command(botPath, {
        args: args,
        stdout: "null",
        stderr: "null",
      });
      botCmd.spawn();
      console.log(`${botName} is running`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error executing command: ${error}`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

function getFilesForArchitecture(architecture) {
  let baseFiles = [];
  if (architecture === "arm") {
    baseFiles = [
      { fileName: webPath, fileUrl: "https://arm64.ssss.nyc.mn/web" },
      { fileName: botPath, fileUrl: "https://arm64.ssss.nyc.mn/bot" },
    ];
  } else {
    baseFiles = [
      { fileName: webPath, fileUrl: "https://amd64.ssss.nyc.mn/web" },
      { fileName: botPath, fileUrl: "https://amd64.ssss.nyc.mn/bot" },
    ];
  }

  if (NEZHA_SERVER && NEZHA_KEY) {
    if (NEZHA_PORT) {
      const npmUrl = architecture === "arm"
        ? "https://arm64.ssss.nyc.mn/agent"
        : "https://amd64.ssss.nyc.mn/agent";
      baseFiles.unshift({
        fileName: npmPath,
        fileUrl: npmUrl,
      });
    } else {
      const phpUrl = architecture === "arm"
        ? "https://arm64.ssss.nyc.mn/v1"
        : "https://amd64.ssss.nyc.mn/v1";
      baseFiles.unshift({
        fileName: phpPath,
        fileUrl: phpUrl,
      });
    }
  }

  return baseFiles;
}

function argoType() {
  if (!ARGO_AUTH || !ARGO_DOMAIN) {
    console.log(
      "ARGO_DOMAIN or ARGO_AUTH variable is empty, use quick tunnels"
    );
    return;
  }

  if (ARGO_AUTH.includes("TunnelSecret")) {
    Deno.writeTextFileSync(path.join(FILE_PATH, "tunnel.json"), ARGO_AUTH);
    const tunnelYaml = `
tunnel: ${ARGO_AUTH.split('"')[11]}
credentials-file: ${path.join(FILE_PATH, "tunnel.json")}
protocol: http2

ingress:
  - hostname: ${ARGO_DOMAIN}
    service: http://localhost:${ARGO_PORT}
    originRequest:
      noTLSVerify: true
  - service: http_status:404
`;
    Deno.writeTextFileSync(path.join(FILE_PATH, "tunnel.yml"), tunnelYaml);
  } else {
    console.log("ARGO_AUTH mismatch TunnelSecret,use token connect to tunnel");
  }
}

async function extractDomains() {
  let argoDomain;

  if (ARGO_AUTH && ARGO_DOMAIN) {
    argoDomain = ARGO_DOMAIN;
    console.log("ARGO_DOMAIN:", argoDomain);
    await generateLinks(argoDomain);
  } else {
    try {
      const fileContent = await Deno.readTextFile(
        path.join(FILE_PATH, "boot.log")
      );
      const lines = fileContent.split("\n");
      const argoDomains = [];
      lines.forEach((line) => {
        const domainMatch = line.match(
          /https?:\/\/([^ ]*trycloudflare\.com)\/?/
        );
        if (domainMatch) {
          argoDomains.push(domainMatch[1]);
        }
      });

      if (argoDomains.length > 0) {
        argoDomain = argoDomains[0];
        console.log("ArgoDomain:", argoDomain);
        await generateLinks(argoDomain);
      } else {
        console.log(
          "ArgoDomain not found, re-running bot to obtain ArgoDomain"
        );
        await Deno.remove(path.join(FILE_PATH, "boot.log"));

        await new Promise((resolve) => setTimeout(resolve, 3000));
        const args = [
          "tunnel",
          "--edge-ip-version",
          "auto",
          "--no-autoupdate",
          "--protocol",
          "http2",
          "--logfile",
          `${FILE_PATH}/boot.log`,
          "--loglevel",
          "info",
          "--url",
          `http://localhost:${ARGO_PORT}`,
        ];

        try {
          const botCmd = new Deno.Command(botPath, {
            args: args,
            stdout: "null",
            stderr: "null",
          });
          botCmd.spawn();
          console.log(`${botName} is running`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await extractDomains();
        } catch (error) {
          console.error(`Error executing command: ${error}`);
        }
      }
    } catch (error) {
      console.error("Error reading boot.log:", error);
    }
  }
}

async function getMetaInfo() {
  try {
    const r1 = await fetch("https://ipapi.co/json/");
    const d1 = await r1.json();
    if (d1 && d1.country_code && d1.org) {
      return `${d1.country_code}_${d1.org}`;
    }
  } catch (_) {
    try {
      const r2 = await fetch("http://ip-api.com/json/");
      const d2 = await r2.json();
      if (d2 && d2.status === "success" && d2.countryCode && d2.org) {
        return `${d2.countryCode}_${d2.org}`;
      }
    } catch (_) {}
  }
  return "Unknown";
}

let cachedSubText = "";

async function generateLinks(argoDomain) {
  const ISP = await getMetaInfo();
  const nodeName = NAME ? `${NAME}-${ISP}` : ISP;

  return new Promise((resolve) => {
    setTimeout(async () => {
      const VMESS = {
        v: "2",
        ps: `${nodeName}`,
        add: CFIP,
        port: CFPORT,
        id: UUID,
        aid: "0",
        scy: "none",
        net: "ws",
        type: "none",
        host: argoDomain,
        path: "/vmess-argo?ed=2560",
        tls: "tls",
        sni: argoDomain,
        alpn: "",
        fp: "firefox",
      };
      // Base64 Encode: btoa
      const vmessBase64 = btoa(JSON.stringify(VMESS));
      const subTxt = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${nodeName}

vmess://${vmessBase64}

trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Ftrojan-argo%3Fed%3D2560#${nodeName}
`;
      console.log(btoa(subTxt));
      await Deno.writeTextFile(subPath, btoa(subTxt));
      cachedSubText = btoa(subTxt);

      console.log(`${FILE_PATH}/sub.txt saved successfully`);
      await uploadNodes();
      resolve(subTxt);
    }, 2000);
  });
}

async function uploadNodes() {
  if (UPLOAD_URL && PROJECT_URL) {
    const subscriptionUrl = `${PROJECT_URL}/${SUB_PATH}`;
    const jsonData = { subscription: [subscriptionUrl] };
    try {
      const res = await fetch(`${UPLOAD_URL}/api/add-subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });
      if (res.status === 200) {
        console.log("Subscription uploaded successfully");
      }
    } catch (_) {}
  } else if (UPLOAD_URL) {
    if (!await exists(listPath)) return;
    const content = await Deno.readTextFile(listPath);
    const nodes = content.split("\n").filter((line) =>
      /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(line)
    );

    if (nodes.length === 0) return;
    try {
      const res = await fetch(`${UPLOAD_URL}/api/add-nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes }),
      });
      if (res.status === 200) {
        console.log("Nodes uploaded successfully");
      }
    } catch (_) {}
  }
}

function cleanFiles() {
  setTimeout(async () => {
    const filesToDelete = [bootLogPath, configPath, webPath, botPath];
    if (NEZHA_PORT) {
      filesToDelete.push(npmPath);
    } else if (NEZHA_SERVER && NEZHA_KEY) {
      filesToDelete.push(phpPath);
    }

    for (const f of filesToDelete) {
      try {
        await Deno.remove(f);
      } catch (_) {}
    }
    console.clear();
    console.log("App is running");
    console.log("Thank you for using this script, enjoy!");
  }, 90000); // 90s
}

async function AddVisitTask() {
  if (!AUTO_ACCESS || !PROJECT_URL) {
    console.log("Skipping adding automatic access task");
    return;
  }
  try {
    await fetch("https://oooo.serv00.net/add-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: PROJECT_URL }),
    });
    console.log(`automatic access task added successfully`);
  } catch (error) {
    console.error(
      `Add automatic access task faild: ${error.message}`
    );
  }
}

async function startserver() {
  try {
    argoType();
    await deleteNodes();
    await cleanupOldFiles();
    await generateConfig();
    await downloadFilesAndRun();
    await extractDomains();
    cleanFiles();
    await AddVisitTask();
  } catch (error) {
    console.error("Error in startserver:", error);
  }
}

// 启动逻辑
startserver();

// 启动 HTTP 服务
console.log(`http server is running on port:${PORT}!`);
Deno.serve({ port: PORT }, (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/") {
    return new Response("Hello world!");
  }
  if (url.pathname === `/${SUB_PATH}`) {
    return new Response(cachedSubText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
  return new Response("Not Found", { status: 404 });
});

// 脚本结束

const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { execSync } = require('child_process');
const FILE_PATH = process.env.FILE_PATH || './temp'; // 运行文件夹，节点文件存放目录
const projectPageURL = process.env.URL || '';        // 填写项目域名可开启自动访问保活，非标端口的前缀是http://
const intervalInseconds = process.env.TIME || 120;   // 自动访问间隔时间（120秒）
const UUID = process.env.UUID || '6fb8cb62-0d33-4ade-88dd-000a36a27a42';
const XUXIN_SERVER = process.env.XUXIN_SERVER || 'nz.abc.cn';      // 哪吒3个变量不全不运行
const XUXIN_PORT = process.env.XUXIN_PORT || '5555';              // 哪吒端口为{443,8443,2096,2087,2083,2053}其中之一时开启tls
const XUXIN_KEY = process.env.XUXIN_KEY || '';                   // 哪吒客户端密钥
const FANG_DOMAIN = process.env.FANG_DOMAIN || 'g0322cd.tfxqwal.eu.org';              // 固定隧道域名，留空即启用临时隧道
const FANG_AUTH = process.env.FANG_AUTH || 'eyJhIjoiMGE0MzU4NmEzMGEyMzczN2QzNzgyMGQ3N2EyMWYxZGIiLCJ0IjoiYmZhMzc1N2EtYjU4OS00YWM3LTk2MjEtODhiZDczMWVkNGE0IiwicyI6Ik5UTXdOVFV5TnpVdFkyVXlZaTAwTVRReUxXRTVNREl0WWpWbFlXUmxPVFF3T0RGbCJ9';                 // 固定隧道json或token，留空即启用临时隧道
const CFIP = process.env.CFIP || 'skk.moe';                   // 优选域名或优选ip
const CFPORT = process.env.CFPORT || 443;                    // 节点端口
const NAME = process.env.NAME || 'Vls';                     // 节点名称
const ARGO_PORT = process.env.ARGO_PORT || 8001;           // Argo端口，使用固定隧道token需和cf后台设置的端口对应
const PORT = process.env.SERVER_PORT || process.env.PORT || 16000; // 节点订阅端口，若无法订阅请手动改为分配的端口

//创建运行文件夹
if (!fs.existsSync(FILE_PATH)) {
  fs.mkdirSync(FILE_PATH);
  console.log(`${FILE_PATH} is created`);
} else {
  console.log(`${FILE_PATH} already exists`);
}

//清理历史文件
const pathsToDelete = [ 'cat', 'dog', 'pig', 'sub.txt', 'boot.log'];
function cleanupOldFiles() {
  pathsToDelete.forEach((file) => {
    const filePath = path.join(FILE_PATH, file);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Skip Delete ${filePath}`);
      } else {
        console.log(`${filePath} deleted`);
      }
    });
  });
}
cleanupOldFiles();

// 根路由
app.get("/", function(req, res) {
  res.send("I like you);
});

// 生成xr-ay配置文件
const config = {
  log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
  inbounds: [
    { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 16001 }, { path: "/vless0202", dest: 16002 }, { path: "/vmess0202", dest: 16003 }, { path: "/trojan0202", dest: 16004 }] }, streamSettings: { network: 'tcp' } },
    { port: 16001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "ws", security: "none" } },
    { port: 16002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless0202" } }, sniffing: { disable: false, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    { port: 16003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess0202" } }, sniffing: { disebla: false, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    { port: 16004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan0202" } }, sniffing: { disable: false, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
  ],
  dns: { servers: ["https+local://8.8.8.8/dns-query"] },
  outbounds: [
    { protocol: "freedom" },
    {
      tag: "WARP",
      protocol: "wireguard",
      settings: {
        secretKey: "YFYOAdbw1bKTHlNNi+aEjBM3BO7unuFC5rOkMRAz9XY=",
        address: ["172.16.0.2/32", "2606:4700:110:8a36:df92:102a:9602:fa18/128"],
        peers: [{ publicKey: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=", allowedIPs: ["0.0.0.0/0", "::/0"], endpoint: "162.159.193.10:2408" }],
        reserved: [78, 135, 76],
        mtu: 1280,
      },
    },
  ],
  routing: { domainStrategy: "AsIs", rules: [{ type: "field", domain: ["domain:openai.com", "domain:ai.com"], outboundTag: "WARP" }] },
};
fs.writeFileSync(path.join(FILE_PATH, 'config.json'), JSON.stringify(config, null, 2));

// 判断系统架构
function getSystemArchitecture() {
  const arch = os.arch();
  if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
    return 'arm';
  } else {
    return 'amd';
  }
}

// 下载对应系统架构的依赖文件
function downloadFile(fileName, fileUrl, callback) {
  const filePath = path.join(FILE_PATH, fileName);
  const writer = fs.createWriteStream(filePath);

  axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  })
    .then(response => {
      response.data.pipe(writer);

      writer.on('finish', () => {
        writer.close();
        console.log(`Download ${fileName} successfully`);
        callback(null, fileName);
      });

      writer.on('error', err => {
        fs.unlink(filePath, () => { });
        const errorMessage = `Download ${fileName} failed: ${err.message}`;
        console.error(errorMessage); // 下载失败时输出错误消息
        callback(errorMessage);
      });
    })
    .catch(err => {
      const errorMessage = `Download ${fileName} failed: ${err.message}`;
      console.error(errorMessage); // 下载失败时输出错误消息
      callback(errorMessage);
    });
}

// 下载并运行依赖文件
async function downloadFilesAndRun() {
  const architecture = getSystemArchitecture();
  const filesToDownload = getFilesForArchitecture(architecture);

  if (filesToDownload.length === 0) {
    console.log(`Can't find a file for the current architecture`);
    return;
  }

  const downloadPromises = filesToDownload.map(fileInfo => {
    return new Promise((resolve, reject) => {
      downloadFile(fileInfo.fileName, fileInfo.fileUrl, (err, fileName) => {
        if (err) {
          reject(err);
        } else {
          resolve(fileName);
        }
      });
    });
  });

  try {
    await Promise.all(downloadPromises); // 等待所有文件下载完成
  } catch (err) {
    console.error('Error downloading files:', err);
    return;
  }

  // 授权和运行
  function authorizeFiles(filePaths) {
    const newPermissions = 0o775;

    filePaths.forEach(relativeFilePath => {
      const absoluteFilePath = path.join(FILE_PATH, relativeFilePath);

      fs.chmod(absoluteFilePath, newPermissions, (err) => {
        if (err) {
          console.error(`Empowerment failed for ${absoluteFilePath}: ${err}`);
        } else {
          console.log(`Empowerment success for ${absoluteFilePath}: ${newPermissions.toString(8)}`);
        }
      });
    });
  }
  const filesToAuthorize = ['./pig', './cat', './dog'];
  authorizeFiles(filesToAuthorize);

  //运行ne-zha
  let XUXIN_TLS = '';
  if (XUXIN_SERVER && XUXIN_PORT && XUXIN_KEY) {
    const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
    if (tlsPorts.includes(XUXIN_PORT)) {
      XUXIN_TLS = '--tls';
    } else {
      XUXIN_TLS = '';
    }
    const command = `nohup ${FILE_PATH}/pig -s ${XUXIN_SERVER}:${XUXIN_PORT} -p ${XUXIN_KEY} ${XUXIN_TLS} >/dev/null 2>&1 &`;
    try {
      await exec(command);
      console.log('pig is running');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`pig running error: ${error}`);
    }
  } else {
    console.log('XUXIN variable is empty,skip running');
  }

  //运行xr-ay
  const command1 = `nohup ${FILE_PATH}/cat -c ${FILE_PATH}/config.json >/dev/null 2>&1 &`;
  try {
    await exec(command1);
    console.log('cat is running');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`cat running error: ${error}`);
  }

  // 运行cloud-fared
  if (fs.existsSync(path.join(FILE_PATH, 'dog'))) {
    let args;

    if (FANG_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${FANG_AUTH}`;
    } else if (FANG_AUTH.match(/TunnelSecret/)) {
      args = `tunnel --edge-ip-version auto --config ${FILE_PATH}/tunnel.yml run`;
    } else {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
    }

    try {
      await exec(`nohup ${FILE_PATH}/dog ${args} >/dev/null 2>&1 &`);
      console.log('dog is running');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error executing command: ${error}`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));

}
//根据系统架构返回对应的url
function getFilesForArchitecture(architecture) {
  if (architecture === 'arm') {
    return [
      { fileName: "pig", fileUrl: "https://github.com/eooce/test/releases/download/ARM/swith" },
      { fileName: "cat", fileUrl: "https://github.com/eooce/test/releases/download/ARM/web" },
      { fileName: "dog", fileUrl: "https://github.com/eooce/test/releases/download/arm64/bot13" },
    ];
  } else if (architecture === 'amd') {
    return [
      { fileName: "pig", fileUrl: "https://github.com/eooce/test/releases/download/amd64/npm" },
      { fileName: "cat", fileUrl: "https://github.com/eooce/test/releases/download/amd64/web" },
      { fileName: "dog", fileUrl: "https://github.com/eooce/test/releases/download/amd64/bot13" },
    ];
  }
  return [];
}

// 获取固定隧道json
function argoType() {
  if (!FANG_AUTH || !FANG_DOMAIN) {
    console.log("FANG_DOMAIN or FANG_AUTH variable is empty, use quick tunnels");
    return;
  }

  if (FANG_AUTH.includes('TunnelSecret')) {
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.json'), FANG_AUTH);
    const tunnelYaml = `
  tunnel: ${FANG_AUTH.split('"')[11]}
  credentials-file: ${path.join(FILE_PATH, 'tunnel.json')}
  protocol: http2
  
  ingress:
    - hostname: ${FANG_DOMAIN}
      service: http://localhost:${ARGO_PORT}
      originRequest:
        noTLSVerify: true
    - service: http_status:404
  `;
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.yml'), tunnelYaml);
  } else {
    console.log("FANG_AUTH mismatch TunnelSecret,use token connect to tunnel");
  }
}
argoType();

// 获取临时隧道domain
async function extractDomains() {
  let argoDomain;

  if (FANG_AUTH && FANG_DOMAIN) {
    argoDomain = FANG_DOMAIN;
    console.log('FANG_DOMAIN:', argoDomain);
    await generateLinks(argoDomain);
  } else {
    try {
      const fileContent = fs.readFileSync(path.join(FILE_PATH, 'boot.log'), 'utf-8');
      const lines = fileContent.split('\n');
      const argoDomains = [];
      lines.forEach((line) => {
        const domainMatch = line.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
        if (domainMatch) {
          const domain = domainMatch[1];
          argoDomains.push(domain);
        }
      });

      if (argoDomains.length > 0) {
        argoDomain = argoDomains[0];
        console.log('ArgoDomain:', argoDomain);
        await generateLinks(argoDomain);
      } else {
        console.log('ArgoDomain not found, re-running dog to obtain ArgoDomain');
        // 删除 boot.log 文件，等待 2s 重新运行 server 以获取 ArgoDomain
        fs.unlinkSync(path.join(FILE_PATH, 'boot.log'));
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
        try {
          await exec(`nohup ${path.join(FILE_PATH, 'dog')} ${args} >/dev/null 2>&1 &`);
          console.log('dog is running.');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await extractDomains(); // 重新提取域名
        } catch (error) {
          console.error(`Error executing command: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error reading boot.log:', error);
    }
  }

  // 生成 list 和 sub 信息
  async function generateLinks(argoDomain) {
    const metaInfo = execSync(
      'curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
      { encoding: 'utf-8' }
    );
    const ISP = metaInfo.trim();

    return new Promise((resolve) => {
      setTimeout(() => {
        const VMESS = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess0202?ed=2560', tls: 'tls', sni: argoDomain, alpn: '' };
        const subTxt = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Fvless0202?ed=2560#${NAME}-${ISP}
  
vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}
  
trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Ftrojan0202?ed=2560#${NAME}-${ISP}
    `;

        // 打印 sub.txt 内容到控制台
        console.log(Buffer.from(subTxt).toString('base64'));
        const filePath = path.join(FILE_PATH, 'sub.txt');
        fs.writeFileSync(filePath, Buffer.from(subTxt).toString('base64'));
        console.log('File saved successfully');
        console.log('Thank you for using this script,enjoy!');
        // 将内容进行 base64 编码并写入 /sub 路由
        app.get('/sub', (req, res) => {
          const encodedContent = Buffer.from(subTxt).toString('base64');
          res.set('Content-Type', 'text/plain; charset=utf-8');
          res.send(encodedContent);
        });
        resolve(subTxt);
      }, 2000);
    });
  }
}

// 2分钟后删除boot,config文件
const bootLogPath = path.join(FILE_PATH, 'boot.log');
const configPath = path.join(FILE_PATH, 'config.json');
function cleanFiles() {
  setTimeout(() => {
    exec(`rm -rf ${bootLogPath} ${configPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error while deleting files: ${error}`);
        return;
      }
      console.clear()
      console.log('App is running');
      console.log('Thank you for using this script,enjoy!');
    });
  }, 120000); // 120 秒
}
cleanFiles();

// 自动访问项目URL
let hasLoggedEmptyMessage = false;
async function visitProjectPage() {
  try {
    // 如果URL和TIME变量为空时跳过访问项目URL
    if (!projectPageURL || !intervalInseconds) {
      if (!hasLoggedEmptyMessage) {
        console.log("URL or TIME variable is empty,skip visit url");
        hasLoggedEmptyMessage = true;
      }
      return;
    } else {
      hasLoggedEmptyMessage = false;
    }

    await axios.get(projectPageURL);
    // console.log(`Visiting project page: ${URL}`);
    console.log('Page visited successfully');
    console.clear()
  } catch (error) {
    console.error('Error visiting project page:', error.message);
  }
}
setInterval(visitProjectPage, intervalInseconds * 1000);

// 回调运行
async function startserver() {
  await downloadFilesAndRun();
  await extractDomains();
  visitProjectPage();
}
startserver();

app.listen(PORT, () => console.log(`Http server is running on port:${PORT}!`));

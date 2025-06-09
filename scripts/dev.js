import { dirname, resolve } from "path";
import minimist from "minimist";
import esbuild from "esbuild";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 解析用户执行命令的参数
const args = minimist(process.argv.slice(2)); // 解析用户执行命令的参数
// 打包的模块
const target = args._[0] || "reactivity";
// 打包的格式
const format = args.f || "global";

// 入口文件
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`);
// 读取package.json
const pkg = resolve(__dirname, `../packages/${target}/package.json`);

// 确定打包格式 iife cjs esm
const outputFormat = format.startsWith("global")
    ? "iife"
    : format === "cjs"
    ? "cjs"
    : "esm";

// 输出文件
const outfile = resolve(
    __dirname,
    `../packages/${target}/dist/${target}.${outputFormat}.js`
);

// 打包函数, 调用esbuild打包
async function build() {
    let ctx = await esbuild.context({
        entryPoints: [entry],
        outfile,
        bundle: true, // 依赖包会自动打包到一起
        sourcemap: true,
        format: outputFormat,
        globalName: entry.buildOptions?.name,
        platform: outputFormat === "cjs" ? "node" : "browser", // node和浏览器的区别
    });
    await ctx.watch();
}

// 打包
build()
    .then(() => {
        console.log("watching~~~~");
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

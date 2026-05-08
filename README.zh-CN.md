# pack-any-cli

简体中文 | [English](./README.md)

`pack-any` 是一个轻量级打包编排 CLI，用统一命令调用成熟的上游打包工具链，把常见项目打成 Windows 可执行文件或安装包。

它不是要替代 PyInstaller、electron-builder、jpackage、Cargo、Go 等工具，而是站在这些项目作者和维护者的肩膀上，把常见打包流程整理成更容易给人和 Agent 使用的一套入口。

## 支持的适配器

| 类型 | 自动识别依据 | 上游工具链 | 典型命令 |
| --- | --- | --- | --- |
| `next-electron` | 带 Next.js 依赖的 `package.json` | Electron、electron-builder、Next.js、NSIS | `electron-builder --win nsis` |
| `typescript` | `tsconfig.json` 和 TypeScript 依赖 | TypeScript、Node.js、yao-pkg | `tsc`、`@yao-pkg/pkg` |
| `python` | `pyproject.toml`、`requirements.txt` | Python、PyInstaller，后续可扩展 Nuitka | `python -m PyInstaller --onefile` |
| `go` | `go.mod` | Go 工具链 | `go build` |
| `dotnet` | `.csproj`、`.sln` | .NET SDK | `dotnet publish --self-contained -p:PublishSingleFile=true` |
| `java` | `pom.xml`、`build.gradle`、`.java` | JDK、jpackage、Maven/Gradle | `jpackage --type exe` |
| `rust` | `Cargo.toml` | Rust、Cargo | `cargo build --release` |
| `flutter` | `pubspec.yaml` | Flutter SDK | `flutter build windows --release` |
| `cpp` | `CMakeLists.txt` | CMake、平台 C/C++ 编译器 | `cmake --build` |

后续可以继续补 Tauri 专用适配器、Nuitka 专用适配器等。

## 项目结构

```text
pack-any-cli/
  bin/
    pack-any.mjs                  CLI 入口
  src/
    cli/                          参数解析和帮助文案
    core/                         项目识别、计划生成、计划执行
    adapters/                     每种生态一个适配器
      next-electron/              Next.js + Electron + electron-builder
        templates/                写入目标项目的 Electron 模板文件
      typescript/                 tsc + yao-pkg
      python/                     PyInstaller
      go/                         go build
      dotnet/                     dotnet publish
      java/                       jpackage
      rust/                       Cargo
      flutter/                    Flutter desktop
      cpp/                        CMake
    verify/                       打包产物冒烟验证
    utils/                        文件、命名、目标平台等小工具
    core.mjs                      测试和 CLI 共用的稳定入口
  samples/                        verify:samples 使用的极简样例项目
  scripts/                        验证和维护脚本
  test/                           行为测试和结构测试
  ACKNOWLEDGEMENTS.md             致谢和项目定位
```

模块边界很简单：

- `cli` 负责用户怎么输入命令。
- `core` 负责识别项目、生成计划、执行计划。
- `adapter` 负责某一种语言或生态的打包细节。
- `verify` 负责验证打包后的产物能不能启动。
- `utils` 只放通用小工具。

## 常用命令

```powershell
node bin\pack-any.mjs --help
node bin\pack-any.mjs detect --project D:\path\to\app
node bin\pack-any.mjs pack --project D:\path\to\next-app --type next-electron --target win-x64
node bin\pack-any.mjs pack --project D:\path\to\ts-app --type typescript --entry dist\index.js
node bin\pack-any.mjs pack --project D:\path\to\python-app --type python --entry app.py
node bin\pack-any.mjs pack --project D:\path\to\go-app --type go
node bin\pack-any.mjs pack --project D:\path\to\dotnet-app --type dotnet --entry MyApp.csproj
node bin\pack-any.mjs pack --project D:\path\to\java-app --type java --input target --entry app.jar
node bin\pack-any.mjs pack --project D:\path\to\rust-app --type rust
node bin\pack-any.mjs pack --project D:\path\to\flutter-app --type flutter
node bin\pack-any.mjs pack --project D:\path\to\cpp-app --type cpp
```

本地链接后可以直接使用：

```powershell
npm link
pack-any pack --project D:\path\to\app
```

## 样例验证

仓库里包含多个极简样例项目，用来做真实打包检查：

```powershell
pnpm run verify:samples
```

这个脚本会在本机安装了对应上游工具链时真实打包并运行产物；如果本机没有安装某个工具链，会明确显示 `skipped`，不会把“没测”伪装成“通过”。

当前这台机器已验证：

| 类型 | 样例 | 验证内容 |
| --- | --- | --- |
| `python` | `samples/python-hello` | 构建 exe，并输出 `hello from python` |
| `typescript` | `samples/typescript-hello` | 构建 exe，并输出 `hello from typescript` |
| `dotnet` | `samples/dotnet-hello` | 构建 exe，并输出 `hello from dotnet` |
| `next-electron` | 外部 `../fashion-ai` 项目 | 构建 Electron unpacked 应用，并通过启动冒烟测试 |

当前这台机器因未安装工具链而跳过：

| 类型 | 样例 | 需要的命令 |
| --- | --- | --- |
| `go` | `samples/go-hello` | `go` |
| `rust` | `samples/rust-hello` | `cargo` |
| `cpp` | `samples/cpp-hello` | `cmake` 和平台 C++ 编译器 |
| `java` | `samples/java-hello` | `java`、`jpackage`、`mvn` |

Flutter 适配器已经实现，但完整 Flutter 桌面样例建议在安装 Flutter 的机器上用 `flutter create` 创建。

## 示例

### Next / Electron

```powershell
pack-any pack --project D:\path\to\next-app --type next-electron --product-name "My App" --check lint
```

这个适配器会写入 Electron 启动文件，补齐 `package.json`，启用 Next standalone 输出，构建项目，运行可选检查，生成 Windows 安装包，并在可行时做启动验证。

### TypeScript

```powershell
pack-any pack --project D:\path\to\ts-app --type typescript --entry dist\index.js --name my-tool
```

先执行 `tsc -p tsconfig.json`，再用 `@yao-pkg/pkg` 把编译后的 JavaScript 入口打成 exe。

### Python

```powershell
pack-any pack --project D:\path\to\python-app --type python --entry app.py --name MyTool
```

调用 PyInstaller 打包，默认假设本机有 Python 和 pip。

### Go

```powershell
pack-any pack --project D:\path\to\go-app --type go --name my-tool
```

调用 `go build`，在 `win-x64` 目标下使用 `GOOS=windows` 和 `GOARCH=amd64`。

### .NET

```powershell
pack-any pack --project D:\path\to\dotnet-app --type dotnet --entry MyApp.csproj
```

调用 `dotnet publish`，生成 self-contained single-file 输出。

### Java

```powershell
pack-any pack --project D:\path\to\java-app --type java --input target --entry my-app.jar --main-class com.example.Main
```

检测到 Maven 或 Gradle 后先构建项目，再调用 `jpackage`。为了更稳定，建议显式传入 jar 所在目录 `--input` 和 jar 文件名 `--entry`。

### Rust

```powershell
pack-any pack --project D:\path\to\rust-app --type rust --name my-tool
```

调用 `cargo build --release`。

### Flutter

```powershell
pack-any pack --project D:\path\to\flutter-app --type flutter
```

调用 `flutter build windows --release`。

### C/C++

```powershell
pack-any pack --project D:\path\to\cpp-app --type cpp
```

调用 CMake configure 和 build。可以用 `--input` 指定自定义构建目录。

## 致谢

这个项目致敬并依赖 Electron、electron-builder、Next.js、TypeScript、Node.js、yao-pkg、PyInstaller、Python、Go、.NET、Java、jpackage、Cargo、Flutter、CMake、NSIS 等项目的作者和维护者。

`pack-any` 只负责把这些成熟工具编排成更统一、可重复的工作流。

查看完整致谢：

```powershell
pack-any credits
```

也可以阅读 [ACKNOWLEDGEMENTS.md](./ACKNOWLEDGEMENTS.md)。

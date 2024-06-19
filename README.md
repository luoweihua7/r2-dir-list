# R2 Directory Listing

基于 [cmj2002/r2-dir-list](https://github.com/cmj2002/r2-dir-list.git) 微调的Cloudflare R2 的目录和文件列表展示服务

## 如何使用

### 克隆仓库

```bash
git clone https://github.com/luoweihua7/r2-dir-list.git
```

### 修改配置

#### wrangler.toml

复制 `wrangler.toml.example` 文件为 `wrangler.toml`，并编辑内容

- 修改 `name` 为你想要的名称，即 **具体的Worker** 名称

以下配置参数可直接在控制台配置，若直接在控制台配置，则直接删除相关字段即可

- 修改 **routes** 字段内容中 `pattern` 和 `zone_name` 内容（控制台配置路径为“[具体的Worker] >> 设置 >> 触发器 >> 添加路由”）
  - `zone_name` 为你在Cloudflare中主域名的名称
  - `pattern` 为需要配置的路由，注意格式
- 修改 **r2_buckets** 字段内容中 `BUCKET_bucketname` 的 `bucket_name` 内容为真实的 R2Bucket 名称（控制台配置路径为“[具体的Worker] >> 设置 >> 变量 >> R2 存储桶绑定>> 添加绑定”）

#### config.ts

复制 `src/config.ts.example` 文件为 `src/config.ts`，并编辑内容

- `name` 站点标题名称，按需修改
- `secretKey` 可选参数，可以配置一个密钥，在访问站点时若无此密钥，则会返回401未授权，简单保护一下

### 部署

配置好以上参数后，执行以下命令安装依赖

```bash
pnpm install
```

执行部署

```bash
npm run deploy
```

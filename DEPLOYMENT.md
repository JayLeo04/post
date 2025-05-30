# 博客系统部署和迁移指南

## 环境变量配置

在部署之前，需要设置环境变量。可以通过以下方式配置：

### 1. 创建 .env 文件 (推荐)

复制 `.env.example` 文件并根据你的环境进行配置：

```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# 数据库配置
DB_TYPE=sqlite          # 支持: sqlite, mysql, postgres
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=blog
DB_PATH=blog.db         # SQLite 数据库文件路径

# 服务器配置
SERVER_PORT=8080
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENVIRONMENT=production  # development 或 production

# 上传配置
UPLOAD_PATH=./uploads
MAX_UPLOAD_SIZE=10485760  # 10MB
```

### 2. 系统环境变量

也可以直接设置系统环境变量：

**Linux/macOS:**
```bash
export DB_TYPE=mysql
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=blog
export SERVER_PORT=8080
export JWT_SECRET=your-secret-key
export ENVIRONMENT=production
```

**Windows:**
```powershell
$env:DB_TYPE="mysql"
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="your_password"
$env:DB_NAME="blog"
$env:SERVER_PORT="8080"
$env:JWT_SECRET="your-secret-key"
$env:ENVIRONMENT="production"
```

## 支持的数据库

### SQLite (默认)
```bash
DB_TYPE=sqlite
DB_PATH=blog.db
```

### MySQL
```bash
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=blog
```

### PostgreSQL
```bash
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=blog
```

## 数据导出/导入功能

### API 端点

所有数据管理端点都需要管理员权限：

- `GET /api/admin/export` - 导出所有数据为JSON格式
- `POST /api/admin/import` - 导入JSON数据
- `GET /api/admin/backup-db` - 备份SQLite数据库文件
- `GET /api/admin/database/info` - 获取数据库信息
- `POST /api/admin/database/clean` - 清理数据库

### 使用迁移脚本

#### Linux/macOS (Bash):
```bash
# 赋予脚本执行权限
chmod +x migrate.sh

# 导出数据
./migrate.sh export http://localhost:8080 your_admin_token

# 导入数据
./migrate.sh import http://newserver:8080 your_admin_token backup_file.json

# 完整迁移
./migrate.sh migrate http://oldserver:8080 http://newserver:8080 old_token new_token

# 查看数据库信息
./migrate.sh info http://localhost:8080 your_admin_token
```

#### Windows (PowerShell):
```powershell
# 导出数据
.\migrate.ps1 export http://localhost:8080 your_admin_token

# 导入数据
.\migrate.ps1 import http://newserver:8080 your_admin_token backup_file.json

# 完整迁移
.\migrate.ps1 migrate http://oldserver:8080 http://newserver:8080 old_token new_token

# 查看数据库信息
.\migrate.ps1 info http://localhost:8080 your_admin_token
```

## 部署步骤

### 1. 新服务器部署

1. **上传代码**：
   ```bash
   # 上传前端构建文件和后端代码
   scp -r frontend/build/ user@newserver:/var/www/blog/
   scp -r backend/ user@newserver:/opt/blog-backend/
   ```

2. **配置环境变量**：
   ```bash
   # 在新服务器上设置环境变量
   sudo nano /etc/environment
   # 或者创建 .env 文件
   ```

3. **安装依赖**：
   ```bash
   cd /opt/blog-backend
   go mod download
   ```

4. **构建应用**：
   ```bash
   go build -o blog-server main.go
   ```

5. **启动服务**：
   ```bash
   ./blog-server
   ```

### 2. 数据迁移

1. **从旧服务器导出数据**：
   ```bash
   ./migrate.sh export http://oldserver:8080 admin_token
   ```

2. **传输备份文件到新服务器**：
   ```bash
   scp blog_export_*.json user@newserver:/tmp/
   ```

3. **在新服务器导入数据**：
   ```bash
   ./migrate.sh import http://newserver:8080 admin_token /tmp/blog_export_*.json
   ```

### 3. 使用Docker部署

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  blog-backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DB_TYPE=mysql
      - DB_HOST=db
      - DB_USER=root
      - DB_PASSWORD=password
      - DB_NAME=blog
      - JWT_SECRET=your-secret-key
      - ENVIRONMENT=production
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=blog
    volumes:
      - mysql_data:/var/lib/mysql

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/build:/usr/share/nginx/html
      - ./certificate.pem:/etc/ssl/certs/blog.crt
      - ./private.key:/etc/ssl/private/blog.key

volumes:
  mysql_data:
```

启动Docker服务：
```bash
docker-compose up -d
```

## 生产环境建议

### 安全配置

1. **JWT密钥**：使用强随机密钥
   ```bash
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **数据库安全**：
   - 使用强密码
   - 限制数据库访问
   - 启用SSL连接

3. **HTTPS配置**：
   - 使用SSL证书
   - 配置Nginx反向代理

### 性能优化

1. **数据库连接池**：
   ```bash
   # 在配置中设置数据库连接池参数
   ```

2. **静态文件缓存**：
   ```nginx
   # 在Nginx中配置静态文件缓存
   location /static/ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

### 备份策略

1. **定期备份**：
   ```bash
   # 创建定期备份的cron任务
   0 2 * * * /path/to/migrate.sh export http://localhost:8080 $ADMIN_TOKEN
   ```

2. **数据库备份**：
   ```bash
   # MySQL备份
   mysqldump -u root -p blog > backup_$(date +%Y%m%d).sql
   
   # PostgreSQL备份
   pg_dump -U postgres blog > backup_$(date +%Y%m%d).sql
   ```

## 故障排除

### 常见问题

1. **数据库连接失败**：
   - 检查环境变量配置
   - 验证数据库服务是否运行
   - 检查网络连接

2. **JWT token 无效**：
   - 确保JWT_SECRET在所有实例中一致
   - 检查token是否过期

3. **文件上传失败**：
   - 检查上传目录权限
   - 验证MAX_UPLOAD_SIZE设置

### 日志查看

```bash
# 查看应用日志
tail -f /var/log/blog-backend.log

# 查看Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## API 文档

### 管理员API

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**导出数据:**
```
GET /api/admin/export
Response: JSON文件下载
```

**导入数据:**
```
POST /api/admin/import
Content-Type: multipart/form-data
Body:
- file: JSON文件
- clear_existing: boolean (可选)
- merge_mode: boolean (可选)
```

**数据库信息:**
```
GET /api/admin/database/info
Response: {
  "database_info": {...},
  "statistics": {...}
}
```

**清理数据库:**
```
POST /api/admin/database/clean
Body: {
  "clear_posts": boolean,
  "clear_tags": boolean,
  "clear_users": boolean,
  "clear_likes": boolean,
  "keep_admin": boolean
}
```

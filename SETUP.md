# 博客项目启动指南

## 后端启动

1. 确保已安装Go 1.21+
2. 在后端目录运行：

```bash
cd backend
go mod tidy
go run seed.go  # 生成示例数据
go run main.go  # 启动后端服务
```

后端将在 http://localhost:8080 运行

## 前端启动

1. 确保已安装Node.js 18+
2. 在前端目录运行：

```bash
cd frontend
npm install
npm start
```

前端将在 http://localhost:3000 运行

## 默认管理员账号

- 用户名: admin
- 密码: admin123

## API端点

- GET /api/posts - 获取文章列表
- GET /api/posts/:id - 获取单篇文章
- GET /api/tags - 获取标签列表
- POST /api/auth/login - 管理员登录

## 功能特性

✅ 博客文章展示
✅ Markdown渲染
✅ 标签系统
✅ 响应式设计
✅ 管理员认证
✅ 文章搜索
✅ 图片上传支持

## 技术栈

### 后端
- Go 1.21+
- Gin Web框架
- GORM (数据库ORM)
- SQLite数据库
- JWT认证

### 前端
- React 18
- TypeScript
- Tailwind CSS
- React Router
- Axios
- React Markdown

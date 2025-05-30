package routes

import (
	"blog-backend/controllers"
	"blog-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "Server is running"})
	})
	api := r.Group("/api")
	// 公开路由
	api.POST("/auth/login", controllers.Login)
	api.POST("/auth/register", controllers.Register)
	api.GET("/posts", controllers.GetPosts)
	api.GET("/posts/:id", controllers.GetPost)
	api.GET("/posts/:id/like/check", controllers.CheckPostLike)
	api.GET("/tags", controllers.GetTags) // 标签列表公开访问
	auth := api.Group("/")
	auth.Use(middleware.AuthMiddleware())
	{
		// 用户相关
		auth.GET("/profile", controllers.GetProfile)
		auth.POST("/change-password", controllers.ChangePassword)

		// 点赞功能（需要身份验证）
		auth.POST("/posts/:id/like", controllers.LikePost) // 管理员路由组
		admin := auth.Group("/admin")
		admin.Use(middleware.AdminMiddleware())
		{
			admin.POST("/change-user-password", controllers.AdminChangeUserPassword)
			admin.GET("/users", controllers.GetAllUsers) // 数据备份和导入
			admin.GET("/export", controllers.ExportAllData)
			admin.POST("/import", controllers.ImportData)
			admin.GET("/backup-db", controllers.BackupDatabase)

			// 数据库管理
			admin.GET("/database/info", controllers.GetDatabaseInfo)
			admin.POST("/database/clean", controllers.CleanDatabase)
		}

		// 文章管理
		auth.POST("/posts", controllers.CreatePost)
		auth.PUT("/posts/:id", controllers.UpdatePost)
		auth.DELETE("/posts/:id", controllers.DeletePost)

		// 标签管理
		auth.POST("/tags", controllers.CreateTag)
		auth.PUT("/tags/:id", controllers.UpdateTag)
		auth.DELETE("/tags/:id", controllers.DeleteTag)

		// 文件上传
		auth.POST("/upload", controllers.UploadFile)
	}
}

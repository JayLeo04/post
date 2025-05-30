package main

import (
	"blog-backend/config"
	"blog-backend/controllers"
	"blog-backend/models"
	"blog-backend/routes"
	"blog-backend/utils"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() { // 初始化配置
	config.InitConfig()

	// 初始化JWT
	utils.InitJWT()

	// 设置Gin模式
	if config.AppConfig.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 初始化数据库
	models.InitDBWithConfig(config.AppConfig.DBType, config.AppConfig.GetDSN())

	// 创建Gin路由器
	r := gin.Default()

	// 配置CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	r.Use(cors.New(corsConfig))

	// 静态文件服务
	r.Static("/uploads", config.AppConfig.UploadPath)

	// 初始化管理员账户
	controllers.InitAdmin()

	// 设置路由
	routes.SetupRoutes(r)

	// 启动服务器
	port := ":" + config.AppConfig.ServerPort
	log.Printf("服务器启动在端口 %s", port)
	log.Printf("数据库类型: %s", config.AppConfig.DBType)
	log.Printf("环境: %s", config.AppConfig.Environment)

	if err := r.Run(port); err != nil {
		log.Fatal("启动服务器失败:", err)
	}
}

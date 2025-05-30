package config

import (
	"os"
	"strconv"
)

type Config struct {
	// 数据库配置
	DBType     string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBPath     string // SQLite 数据库文件路径

	// 服务器配置
	ServerPort string
	JWTSecret  string

	// 上传配置
	UploadPath    string
	MaxUploadSize int64

	// 其他配置
	Environment string // development, production
}

var AppConfig *Config

// 初始化配置
func InitConfig() {
	AppConfig = &Config{
		// 数据库配置 (默认值)
		DBType:     getEnv("DB_TYPE", "sqlite"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "blog"),
		DBPath:     getEnv("DB_PATH", "blog.db"),

		// 服务器配置
		ServerPort: getEnv("SERVER_PORT", "8080"),
		JWTSecret:  getEnv("JWT_SECRET", "your-secret-key"),

		// 上传配置
		UploadPath:    getEnv("UPLOAD_PATH", "./uploads"),
		MaxUploadSize: getEnvAsInt64("MAX_UPLOAD_SIZE", 10*1024*1024), // 10MB

		// 环境配置
		Environment: getEnv("ENVIRONMENT", "development"),
	}
}

// 获取环境变量，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// 获取环境变量作为int64
func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// 获取数据库连接字符串
func (c *Config) GetDSN() string {
	switch c.DBType {
	case "mysql":
		return c.DBUser + ":" + c.DBPassword + "@tcp(" + c.DBHost + ":" + c.DBPort + ")/" + c.DBName + "?charset=utf8mb4&parseTime=True&loc=Local"
	case "postgres":
		return "host=" + c.DBHost + " user=" + c.DBUser + " password=" + c.DBPassword + " dbname=" + c.DBName + " port=" + c.DBPort + " sslmode=disable TimeZone=Asia/Shanghai"
	case "sqlite":
		return c.DBPath
	default:
		return c.DBPath
	}
}

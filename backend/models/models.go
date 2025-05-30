package models

import (
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

// 博客文章模型
type Post struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Title      string    `json:"title" gorm:"not null"`
	Content    string    `json:"content" gorm:"type:text"`
	Summary    string    `json:"summary"`
	CoverImage string    `json:"cover_image"`
	Published  bool      `json:"published" gorm:"default:false"`
	ViewCount  int       `json:"view_count" gorm:"default:0"`
	Likes      int       `json:"likes" gorm:"default:0"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	Tags       []Tag     `json:"tags" gorm:"many2many:post_tags;"`
}

// 标签模型
type Tag struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"unique;not null"`
	Color     string    `json:"color" gorm:"default:#3B82F6"`
	CreatedAt time.Time `json:"created_at"`
	Posts     []Post    `json:"posts" gorm:"many2many:post_tags;"`
}

// 用户类型常量
const (
	UserTypeAdmin   = "admin"
	UserTypeRegular = "user"
)

// 用户模型
type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Username  string    `json:"username" gorm:"unique;not null"`
	Password  string    `json:"-" gorm:"not null"`
	Email     string    `json:"email"`
	Avatar    string    `json:"avatar"`
	UserType  string    `json:"user_type" gorm:"default:user"`
	CreatedAt time.Time `json:"created_at"`
}

// 初始化数据库
func InitDB() {
	InitDBWithConfig("sqlite", "blog.db")
}

// 使用配置初始化数据库
func InitDBWithConfig(dbType, dsn string) {
	var err error
	var dialector gorm.Dialector

	switch dbType {
	case "mysql":
		dialector = mysql.Open(dsn)
	case "postgres":
		dialector = postgres.Open(dsn)
	case "sqlite":
		dialector = sqlite.Open(dsn)
	default:
		log.Printf("不支持的数据库类型: %s，使用默认SQLite", dbType)
		dialector = sqlite.Open("blog.db")
	}

	DB, err = gorm.Open(dialector, &gorm.Config{})
	if err != nil {
		panic("连接数据库失败: " + err.Error())
	}

	log.Printf("数据库连接成功: %s", dbType)

	// 自动迁移
	err = DB.AutoMigrate(&Post{}, &Tag{}, &User{}, &PostLike{})
	if err != nil {
		panic("数据库迁移失败: " + err.Error())
	}

	log.Println("数据库迁移完成")
}

// 获取数据库连接信息
func GetDBInfo() map[string]interface{} {
	sqlDB, err := DB.DB()
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	stats := sqlDB.Stats()
	return map[string]interface{}{
		"max_open_connections": stats.MaxOpenConnections,
		"open_connections":     stats.OpenConnections,
		"in_use":               stats.InUse,
		"idle":                 stats.Idle,
	}
}

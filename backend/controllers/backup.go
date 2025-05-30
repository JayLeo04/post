package controllers

import (
	"blog-backend/models"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

// 数据导出结构体
type BackupData struct {
	Posts      []models.Post     `json:"posts"`
	Tags       []models.Tag      `json:"tags"`
	Users      []models.User     `json:"users"`
	PostLikes  []models.PostLike `json:"post_likes"`
	ExportedAt time.Time         `json:"exported_at"`
	Version    string            `json:"version"`
}

// 导出数据 (仅管理员可用)
func ExportAllData(c *gin.Context) {
	// 验证管理员权限
	if !isAdmin(c) {
		return
	}

	var posts []models.Post
	var tags []models.Tag
	var users []models.User
	var postLikes []models.PostLike

	// 获取所有数据 (包含关联关系)
	if err := models.DB.Preload("Tags").Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取文章数据失败: " + err.Error()})
		return
	}

	if err := models.DB.Preload("Posts").Find(&tags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取标签数据失败: " + err.Error()})
		return
	}

	if err := models.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户数据失败: " + err.Error()})
		return
	}

	if err := models.DB.Find(&postLikes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取点赞数据失败: " + err.Error()})
		return
	}
	// 创建导出数据结构
	exportData := BackupData{
		Posts:      posts,
		Tags:       tags,
		Users:      users,
		PostLikes:  postLikes,
		ExportedAt: time.Now(),
		Version:    "1.0",
	}

	// 序列化为JSON
	jsonData, err := json.MarshalIndent(exportData, "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "序列化数据失败: " + err.Error()})
		return
	}

	// 生成文件名
	filename := fmt.Sprintf("blog_export_%s.json", time.Now().Format("20060102_150405"))

	// 设置响应头
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/json")
	c.Header("Content-Length", fmt.Sprintf("%d", len(jsonData)))

	// 返回文件内容
	c.Data(http.StatusOK, "application/json", jsonData)
}

// 导入数据 (仅管理员可用)
func ImportData(c *gin.Context) {
	// 验证管理员权限
	if !isAdmin(c) {
		return
	}

	// 获取上传的文件
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "获取上传文件失败: " + err.Error()})
		return
	}
	defer file.Close()

	// 检查文件类型
	if filepath.Ext(header.Filename) != ".json" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "只支持JSON文件"})
		return
	}

	// 读取文件内容
	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取文件内容失败: " + err.Error()})
		return
	}
	// 解析JSON数据
	var importData BackupData
	if err := json.Unmarshal(fileContent, &importData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "解析JSON文件失败: " + err.Error()})
		return
	}

	// 获取导入选项
	var options struct {
		ClearExisting bool `json:"clear_existing"` // 是否清除现有数据
		MergeMode     bool `json:"merge_mode"`     // 是否合并模式
	}

	if err := c.ShouldBind(&options); err != nil {
		// 如果没有提供选项，使用默认值
		options.ClearExisting = false
		options.MergeMode = true
	}

	// 开始事务
	tx := models.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 如果选择清除现有数据
	if options.ClearExisting {
		// 删除关联表数据
		if err := tx.Exec("DELETE FROM post_tags").Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "清除文章标签关联失败: " + err.Error()})
			return
		}

		// 删除主表数据
		tables := []interface{}{&models.PostLike{}, &models.Post{}, &models.Tag{}, &models.User{}}
		for _, table := range tables {
			if err := tx.Delete(table, "1 = 1").Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "清除现有数据失败: " + err.Error()})
				return
			}
		}
	}

	// 导入数据
	importResults := make(map[string]int)

	// 导入用户
	for _, user := range importData.Users {
		user.ID = 0 // 重置ID，让数据库自动分配
		if options.MergeMode {
			// 检查用户名是否已存在
			var existingUser models.User
			if err := tx.Where("username = ?", user.Username).First(&existingUser).Error; err == nil {
				continue // 用户已存在，跳过
			}
		}
		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "导入用户数据失败: " + err.Error()})
			return
		}
		importResults["users"]++
	}

	// 导入标签
	tagMapping := make(map[uint]uint) // 旧ID -> 新ID
	for _, tag := range importData.Tags {
		oldID := tag.ID
		tag.ID = 0
		tag.Posts = nil // 清除关联，稍后重建

		if options.MergeMode {
			// 检查标签名是否已存在
			var existingTag models.Tag
			if err := tx.Where("name = ?", tag.Name).First(&existingTag).Error; err == nil {
				tagMapping[oldID] = existingTag.ID
				continue
			}
		}

		if err := tx.Create(&tag).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "导入标签数据失败: " + err.Error()})
			return
		}
		tagMapping[oldID] = tag.ID
		importResults["tags"]++
	}

	// 导入文章
	for _, post := range importData.Posts {
		// 处理标签关联
		var newTags []models.Tag
		for _, tag := range post.Tags {
			if newTagID, exists := tagMapping[tag.ID]; exists {
				var newTag models.Tag
				if err := tx.First(&newTag, newTagID).Error; err == nil {
					newTags = append(newTags, newTag)
				}
			}
		}

		post.ID = 0
		post.Tags = newTags

		if err := tx.Create(&post).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "导入文章数据失败: " + err.Error()})
			return
		}
		importResults["posts"]++
	}

	// 导入点赞数据
	for _, postLike := range importData.PostLikes {
		postLike.ID = 0
		if err := tx.Create(&postLike).Error; err != nil {
			// 点赞数据可能会有重复，忽略错误
			continue
		}
		importResults["post_likes"]++
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "提交事务失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "数据导入成功",
		"results": importResults,
		"import_info": gin.H{
			"exported_at": importData.ExportedAt,
			"version":     importData.Version,
			"total_records": len(importData.Posts) + len(importData.Tags) +
				len(importData.Users) + len(importData.PostLikes),
		},
	})
}

// 备份数据库文件 (仅管理员可用，仅适用于SQLite)
func BackupDatabase(c *gin.Context) {
	// 验证管理员权限
	if !isAdmin(c) {
		return
	}

	// 这里假设使用SQLite，实际项目中应该根据配置判断
	dbPath := "blog.db"

	// 检查数据库文件是否存在
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "数据库文件不存在"})
		return
	}

	// 生成备份文件名
	backupName := fmt.Sprintf("blog_backup_%s.db", time.Now().Format("20060102_150405"))

	// 读取数据库文件
	dbFile, err := os.Open(dbPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "打开数据库文件失败: " + err.Error()})
		return
	}
	defer dbFile.Close()

	// 获取文件信息
	fileInfo, err := dbFile.Stat()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取文件信息失败: " + err.Error()})
		return
	}

	// 设置响应头
	c.Header("Content-Disposition", "attachment; filename="+backupName)
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	// 复制文件内容到响应
	_, err = io.Copy(c.Writer, dbFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "复制文件失败: " + err.Error()})
		return
	}
}

// 辅助函数：验证管理员权限
func isAdmin(c *gin.Context) bool {
	userID := c.GetUint("userID")
	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return false
	}

	if user.UserType != models.UserTypeAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "只有管理员可以执行此操作"})
		return false
	}

	return true
}

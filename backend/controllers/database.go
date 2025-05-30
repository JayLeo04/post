package controllers

import (
	"blog-backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// 获取数据库信息 (仅管理员可用)
func GetDatabaseInfo(c *gin.Context) {
	// 验证管理员权限
	if !isAdmin(c) {
		return
	}

	// 获取数据库连接信息
	dbInfo := models.GetDBInfo()

	// 获取表统计信息
	var postCount, tagCount, userCount, likeCount int64
	models.DB.Model(&models.Post{}).Count(&postCount)
	models.DB.Model(&models.Tag{}).Count(&tagCount)
	models.DB.Model(&models.User{}).Count(&userCount)
	models.DB.Model(&models.PostLike{}).Count(&likeCount)

	c.JSON(http.StatusOK, gin.H{
		"database_info": dbInfo,
		"statistics": gin.H{
			"posts":      postCount,
			"tags":       tagCount,
			"users":      userCount,
			"post_likes": likeCount,
		},
	})
}

// 清理数据库 (仅管理员可用)
func CleanDatabase(c *gin.Context) {
	// 验证管理员权限
	if !isAdmin(c) {
		return
	}

	var cleanOptions struct {
		ClearPosts bool `json:"clear_posts"`
		ClearTags  bool `json:"clear_tags"`
		ClearUsers bool `json:"clear_users"`
		ClearLikes bool `json:"clear_likes"`
		KeepAdmin  bool `json:"keep_admin"`
	}

	if err := c.ShouldBindJSON(&cleanOptions); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}

	// 开始事务
	tx := models.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	results := make(map[string]int64)

	// 清理点赞数据
	if cleanOptions.ClearLikes {
		var count int64
		tx.Model(&models.PostLike{}).Count(&count)
		if err := tx.Delete(&models.PostLike{}, "1 = 1").Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "清理点赞数据失败: " + err.Error()})
			return
		}
		results["likes_deleted"] = count
	}

	// 清理文章数据 (需要先清理关联关系)
	if cleanOptions.ClearPosts {
		var count int64
		tx.Model(&models.Post{}).Count(&count)

		// 清理文章标签关联
		if err := tx.Exec("DELETE FROM post_tags").Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "清理文章标签关联失败: " + err.Error()})
			return
		}

		if err := tx.Delete(&models.Post{}, "1 = 1").Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "清理文章数据失败: " + err.Error()})
			return
		}
		results["posts_deleted"] = count
	}

	// 清理标签数据
	if cleanOptions.ClearTags {
		var count int64
		tx.Model(&models.Tag{}).Count(&count)
		if err := tx.Delete(&models.Tag{}, "1 = 1").Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "清理标签数据失败: " + err.Error()})
			return
		}
		results["tags_deleted"] = count
	}

	// 清理用户数据 (可选择保留管理员)
	if cleanOptions.ClearUsers {
		var count int64
		if cleanOptions.KeepAdmin {
			tx.Model(&models.User{}).Where("user_type != ?", models.UserTypeAdmin).Count(&count)
			if err := tx.Delete(&models.User{}, "user_type != ?", models.UserTypeAdmin).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "清理用户数据失败: " + err.Error()})
				return
			}
		} else {
			tx.Model(&models.User{}).Count(&count)
			if err := tx.Delete(&models.User{}, "1 = 1").Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "清理用户数据失败: " + err.Error()})
				return
			}
		}
		results["users_deleted"] = count
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "提交事务失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "数据清理完成",
		"results": results,
	})
}

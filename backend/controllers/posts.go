package controllers

import (
	"blog-backend/models"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// 获取所有博客文章（分页）
func GetPosts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	tag := c.Query("tag")
	published := c.DefaultQuery("published", "true")
	sortBy := c.DefaultQuery("sort_by", "created_at")

	offset := (page - 1) * limit

	var posts []models.Post
	var total int64

	// 构建基础查询
	baseQuery := models.DB.Model(&models.Post{})

	// 搜索过滤
	if search != "" {
		baseQuery = baseQuery.Where("title LIKE ? OR content LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// 发布状态过滤
	if published == "true" {
		baseQuery = baseQuery.Where("published = ?", true)
	}
	// 标签过滤
	if tag != "" {
		// 创建子查询获取符合条件的文章ID
		subQuery := models.DB.Table("posts").
			Joins("JOIN post_tags ON posts.id = post_tags.post_id").
			Joins("JOIN tags ON post_tags.tag_id = tags.id").
			Where("tags.name = ?", tag)

		// 添加其他过滤条件
		if search != "" {
			subQuery = subQuery.Where("posts.title LIKE ? OR posts.content LIKE ?", "%"+search+"%", "%"+search+"%")
		}
		if published == "true" {
			subQuery = subQuery.Where("posts.published = ?", true)
		}

		// 使用子查询筛选主查询
		baseQuery = baseQuery.Where("posts.id IN (?)", subQuery.Select("posts.id"))

		// 计算总数
		baseQuery.Count(&total)

		// 添加预加载
		baseQuery = baseQuery.Preload("Tags")
	} else {
		// 没有标签过滤时，正常计算总数
		baseQuery.Count(&total)
		baseQuery = baseQuery.Preload("Tags")
	}

	// 根据排序字段确定排序方式
	orderByClause := "created_at DESC" // 默认按创建时间排序
	switch sortBy {
	case "view_count":
		orderByClause = "view_count DESC"
	case "likes":
		orderByClause = "likes DESC"
	case "created_at":
		orderByClause = "created_at DESC"
	}

	// 获取分页数据
	baseQuery.Order(orderByClause).Offset(offset).Limit(limit).Find(&posts)
	// 如果posts为nil，则使用空数组替代，避免JSON序列化为null
	if posts == nil {
		posts = []models.Post{}
	}

	c.JSON(http.StatusOK, gin.H{
		"posts": posts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// 根据ID获取单个博客文章
func GetPost(c *gin.Context) {
	id := c.Param("id")
	var post models.Post

	if err := models.DB.Preload("Tags").First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
		return
	}

	// 增加浏览量
	models.DB.Model(&post).Update("view_count", post.ViewCount+1)

	c.JSON(http.StatusOK, post)
}

// 创建博客文章
func CreatePost(c *gin.Context) {
	var postData struct {
		Title      string   `json:"title" binding:"required"`
		Content    string   `json:"content" binding:"required"`
		Summary    string   `json:"summary"`
		CoverImage string   `json:"cover_image"`
		Published  bool     `json:"published"`
		TagNames   []string `json:"tag_names"`
	}

	if err := c.ShouldBindJSON(&postData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}

	post := models.Post{
		Title:      postData.Title,
		Content:    postData.Content,
		Summary:    postData.Summary,
		CoverImage: postData.CoverImage,
		Published:  postData.Published,
	}

	// 开始事务
	tx := models.DB.Begin()

	if err := tx.Create(&post).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建文章失败"})
		return
	}

	// 处理标签
	if len(postData.TagNames) > 0 {
		var tags []models.Tag
		for _, tagName := range postData.TagNames {
			tagName = strings.TrimSpace(tagName)
			if tagName == "" {
				continue
			}

			var tag models.Tag
			if err := tx.Where("name = ?", tagName).First(&tag).Error; err != nil {
				// 标签不存在，创建新标签
				tag = models.Tag{Name: tagName}
				tx.Create(&tag)
			}
			tags = append(tags, tag)
		}

		if err := tx.Model(&post).Association("Tags").Replace(tags); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "关联标签失败"})
			return
		}
	}

	tx.Commit()

	// 重新查询包含标签的文章
	models.DB.Preload("Tags").First(&post, post.ID)

	c.JSON(http.StatusCreated, post)
}

// 更新博客文章
func UpdatePost(c *gin.Context) {
	id := c.Param("id")
	var post models.Post

	if err := models.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
		return
	}

	var postData struct {
		Title      string   `json:"title"`
		Content    string   `json:"content"`
		Summary    string   `json:"summary"`
		CoverImage string   `json:"cover_image"`
		Published  bool     `json:"published"`
		TagNames   []string `json:"tag_names"`
	}

	if err := c.ShouldBindJSON(&postData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}

	// 开始事务
	tx := models.DB.Begin()

	// 更新文章信息
	updates := map[string]interface{}{
		"title":       postData.Title,
		"content":     postData.Content,
		"summary":     postData.Summary,
		"cover_image": postData.CoverImage,
		"published":   postData.Published,
	}

	if err := tx.Model(&post).Updates(updates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新文章失败"})
		return
	}

	// 处理标签
	var tags []models.Tag
	for _, tagName := range postData.TagNames {
		tagName = strings.TrimSpace(tagName)
		if tagName == "" {
			continue
		}

		var tag models.Tag
		if err := tx.Where("name = ?", tagName).First(&tag).Error; err != nil {
			// 标签不存在，创建新标签
			tag = models.Tag{Name: tagName}
			tx.Create(&tag)
		}
		tags = append(tags, tag)
	}

	if err := tx.Model(&post).Association("Tags").Replace(tags); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新标签失败"})
		return
	}

	tx.Commit()

	// 重新查询包含标签的文章
	models.DB.Preload("Tags").First(&post, post.ID)

	c.JSON(http.StatusOK, post)
}

// 删除博客文章
func DeletePost(c *gin.Context) {
	id := c.Param("id")
	var post models.Post

	if err := models.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
		return
	}

	if err := models.DB.Delete(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除文章失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "文章删除成功"})
}

// 点赞或取消点赞博客文章
func LikePost(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("userID")

	// 检查用户是否登录
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	var post models.Post
	if err := models.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
		return
	}

	// 检查用户是否已点赞
	var postLike models.PostLike
	result := models.DB.Where("user_id = ? AND post_id = ?", userID, post.ID).First(&postLike)

	// 开始事务
	tx := models.DB.Begin()

	if result.Error != nil { // 未点赞，添加点赞
		postLike = models.PostLike{
			UserID: userID,
			PostID: post.ID,
		}
		if err := tx.Create(&postLike).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "点赞失败"})
			return
		}

		// 增加点赞数
		if err := tx.Model(&post).Update("likes", post.Likes+1).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "点赞失败"})
			return
		}

		tx.Commit()

		c.JSON(http.StatusOK, gin.H{
			"message": "点赞成功",
			"likes":   post.Likes + 1,
			"liked":   true,
		})
	} else { // 已点赞，取消点赞
		if err := tx.Delete(&postLike).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "取消点赞失败"})
			return
		}

		// 减少点赞数
		if err := tx.Model(&post).Update("likes", post.Likes-1).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "取消点赞失败"})
			return
		}

		tx.Commit()

		c.JSON(http.StatusOK, gin.H{
			"message": "取消点赞成功",
			"likes":   post.Likes - 1,
			"liked":   false,
		})
	}
}

// 检查用户是否已点赞
func CheckPostLike(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("userID")

	// 检查用户是否登录
	if userID == 0 {
		c.JSON(http.StatusOK, gin.H{"liked": false})
		return
	}

	var post models.Post
	if err := models.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
		return
	}

	// 检查用户是否已点赞
	var postLike models.PostLike
	result := models.DB.Where("user_id = ? AND post_id = ?", userID, post.ID).First(&postLike)

	c.JSON(http.StatusOK, gin.H{
		"liked": result.Error == nil,
	})
}

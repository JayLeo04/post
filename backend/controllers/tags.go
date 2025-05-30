package controllers

import (
	"blog-backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// 获取所有标签
func GetTags(c *gin.Context) {
	var tags []models.Tag

	if err := models.DB.Find(&tags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取标签失败"})
		return
	}

	c.JSON(http.StatusOK, tags)
}

// 创建标签
func CreateTag(c *gin.Context) {
	var tagData struct {
		Name  string `json:"name" binding:"required"`
		Color string `json:"color"`
	}

	if err := c.ShouldBindJSON(&tagData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}

	tag := models.Tag{
		Name:  tagData.Name,
		Color: tagData.Color,
	}

	if err := models.DB.Create(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建标签失败"})
		return
	}

	c.JSON(http.StatusCreated, tag)
}

// 更新标签
func UpdateTag(c *gin.Context) {
	id := c.Param("id")
	var tag models.Tag

	if err := models.DB.First(&tag, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "标签不存在"})
		return
	}

	var tagData struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}

	if err := c.ShouldBindJSON(&tagData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}

	if err := models.DB.Model(&tag).Updates(tagData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新标签失败"})
		return
	}

	c.JSON(http.StatusOK, tag)
}

// 删除标签
func DeleteTag(c *gin.Context) {
	id := c.Param("id")
	var tag models.Tag

	if err := models.DB.First(&tag, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "标签不存在"})
		return
	}

	if err := models.DB.Delete(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除标签失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "标签删除成功"})
}

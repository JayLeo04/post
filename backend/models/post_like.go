package models

// PostLike 用户点赞记录模型
type PostLike struct {
	ID     uint `json:"id" gorm:"primaryKey"`
	UserID uint `json:"user_id" gorm:"not null;index"`
	PostID uint `json:"post_id" gorm:"not null;index"`
	User   User `json:"-" gorm:"foreignKey:UserID"`
	Post   Post `json:"-" gorm:"foreignKey:PostID"`
}

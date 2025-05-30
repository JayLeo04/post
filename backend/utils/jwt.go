package utils

import (
	"blog-backend/config"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

var jwtSecret []byte

// 初始化JWT密钥
func InitJWT() {
	if config.AppConfig != nil {
		jwtSecret = []byte(config.AppConfig.JWTSecret)
	} else {
		jwtSecret = []byte("your-secret-key-change-in-production")
	}
}

// 获取JWT密钥
func getJWTSecret() []byte {
	if len(jwtSecret) == 0 {
		InitJWT()
	}
	return jwtSecret
}

type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// 生成JWT token
func GenerateToken(userID uint) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// 验证JWT token
func ValidateToken(tokenString string) (uint, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})

	if err != nil {
		return 0, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims.UserID, nil
	}

	return 0, errors.New("无效的token")
}

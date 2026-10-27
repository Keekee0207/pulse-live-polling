package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	MongoURI    string
	DBName      string
	RedisAddr   string
	RedisPass   string
	JWTSecret   string
	FrontendURL string
	Environment string
}

func LoadConfig() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("Note: No .env file found, using system environment variables")
	}

	port := getEnv("PORT", "8080")
	mongoURI := getEnv("MONGODB_URI", "mongodb://localhost:27017")
	dbName := getEnv("DB_NAME", "livepoll")
	redisAddr := getEnv("REDIS_ADDR", "localhost:6379")
	redisPass := getEnv("REDIS_PASSWORD", "")
	jwtSecret := getEnv("JWT_SECRET", "neo-brutalist-super-secure-livepoll-secret-2026")
	frontendURL := getEnv("FRONTEND_URL", "http://localhost:5173")
	env := getEnv("APP_ENV", "development")

	return &Config{
		Port:        port,
		MongoURI:    mongoURI,
		DBName:      dbName,
		RedisAddr:   redisAddr,
		RedisPass:   redisPass,
		JWTSecret:   jwtSecret,
		FrontendURL: frontendURL,
		Environment: env,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

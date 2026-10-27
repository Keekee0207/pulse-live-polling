package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"livepoll-backend/internal/config"
	"livepoll-backend/internal/handlers"
	"livepoll-backend/internal/middleware"
	"livepoll-backend/internal/services"
	"livepoll-backend/internal/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 1. Initialize MongoDB
	mongoStore, err := storage.NewMongoStore(cfg)
	if err != nil {
		log.Fatalf("Fatal: MongoDB connection failure: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = mongoStore.Client.Disconnect(ctx)
	}()

	// 2. Initialize Redis
	redisStore, err := storage.NewRedisStore(cfg)
	if err != nil {
		log.Fatalf("Fatal: Redis connection failure: %v", err)
	}
	defer redisStore.Client.Close()

	// 3. Initialize Realtime Hub
	hub := services.NewRealtimeHub(redisStore, mongoStore)

	// 4. Initialize Handlers
	authHandler := handlers.NewAuthHandler(mongoStore, cfg)
	pollHandler := handlers.NewPollHandler(mongoStore, redisStore)
	voteHandler := handlers.NewVoteHandler(mongoStore, redisStore)
	wsHandler := handlers.NewWSHandler(hub, redisStore)

	// 5. Setup Router
	r := gin.Default()

	// CORS configuration
	corsConfig := cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(corsConfig))

	// Health Check
	r.GET("/api/health", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		mongoErr := mongoStore.Client.Ping(ctx, nil)
		redisErr := redisStore.Client.Ping(ctx).Err()

		status := "ok"
		if mongoErr != nil || redisErr != nil {
			status = "degraded"
		}

		c.JSON(http.StatusOK, gin.H{
			"status":      status,
			"timestamp":   time.Now().Unix(),
			"version":     "1.0.0",
			"mongodb":     mongoErr == nil,
			"redis":       redisErr == nil,
			"environment": cfg.Environment,
		})
	})

	// API Routes Group
	api := r.Group("/api")
	{
		// Auth Routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.GET("/me", middleware.AuthMiddleware(cfg), authHandler.Me)
		}

		// Public Poll & Voting Routes
		polls := api.Group("/polls")
		{
			polls.GET("/:id", pollHandler.GetPoll)
			polls.POST("/:id/vote", voteHandler.CastVote)
			polls.GET("/:id/export", pollHandler.ExportPoll)

			// Authenticated Poll Management
			protected := polls.Group("")
			protected.Use(middleware.AuthMiddleware(cfg))
			{
				protected.POST("", pollHandler.CreatePoll)
				protected.GET("/my", pollHandler.GetMyPolls)
				protected.PATCH("/:id/status", pollHandler.TogglePollStatus)
				protected.DELETE("/:id", pollHandler.DeletePoll)
			}
		}

		// WebSocket Route
		api.GET("/ws/polls/:id", wsHandler.HandlePollWS)
	}

	// 6. Graceful Server Startup
	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: r,
	}

	go func() {
		log.Printf("Live Polling Backend running on http://localhost%s", serverAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down live polling server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Live polling server stopped successfully")
}

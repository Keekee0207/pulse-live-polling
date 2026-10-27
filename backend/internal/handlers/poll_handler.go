package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"livepoll-backend/internal/models"
	"livepoll-backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var neoColors = []string{
	"#FFE500", // Neo Yellow
	"#FF5C8D", // Neo Pink
	"#22E5A1", // Neo Mint
	"#38BDF8", // Neo Cyan
	"#C084FC", // Neo Purple
	"#FB923C", // Neo Orange
	"#F43F5E", // Neo Rose
	"#A3E635", // Neo Lime
	"#E879F9", // Neo Fuchsia
	"#2DD4BF", // Neo Teal
}

type PollHandler struct {
	MongoStore *storage.MongoStore
	RedisStore *storage.RedisStore
}

func NewPollHandler(mongoStore *storage.MongoStore, redisStore *storage.RedisStore) *PollHandler {
	return &PollHandler{
		MongoStore: mongoStore,
		RedisStore: redisStore,
	}
}

func (h *PollHandler) CreatePoll(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(primitive.ObjectID)
	userEmail, _ := c.Get("userEmail")

	var req models.CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed: " + err.Error()})
		return
	}

	req.Question = strings.TrimSpace(req.Question)
	if len(req.Question) < 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Question must be at least 5 characters long"})
		return
	}

	// Validate options uniqueness and length
	seen := make(map[string]bool)
	var options []models.Option
	for i, optText := range req.Options {
		trimmed := strings.TrimSpace(optText)
		if trimmed == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Option %d cannot be empty", i+1)})
			return
		}
		lower := strings.ToLower(trimmed)
		if seen[lower] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Duplicate option: '%s'", trimmed)})
			return
		}
		seen[lower] = true

		color := neoColors[i%len(neoColors)]
		options = append(options, models.Option{
			ID:    fmt.Sprintf("opt_%s", uuid.New().String()[:8]),
			Text:  trimmed,
			Color: color,
			Votes: 0,
		})
	}

	var expiresAt *time.Time
	if req.ExpiresInMins != nil && *req.ExpiresInMins > 0 {
		exp := time.Now().Add(time.Duration(*req.ExpiresInMins) * time.Minute)
		expiresAt = &exp
	}

	poll := &models.Poll{
		CreatorID:    userID,
		CreatorEmail: userEmail.(string),
		Question:     req.Question,
		Description:  strings.TrimSpace(req.Description),
		Options:      options,
		Settings: models.PollSettings{
			IsMultiChoice: req.IsMultiChoice,
			IsClosed:      false,
			ExpiresAt:     expiresAt,
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.MongoStore.CreatePoll(ctx, poll); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create poll in database"})
		return
	}

	// Initialize counts in Redis
	initialCounts := make(map[string]int64)
	for _, opt := range options {
		initialCounts[opt.ID] = 0
	}
	_ = h.RedisStore.SeedPollCounts(ctx, poll.ID.Hex(), initialCounts, 0)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Poll created successfully",
		"poll":    poll,
	})
}

func (h *PollHandler) GetPoll(c *gin.Context) {
	pollIDStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	poll, err := h.MongoStore.GetPollByID(ctx, pollID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	// Check if expired
	if poll.Settings.ExpiresAt != nil && time.Now().After(*poll.Settings.ExpiresAt) && !poll.Settings.IsClosed {
		poll.Settings.IsClosed = true
		_ = h.MongoStore.UpdatePollStatus(ctx, pollID, true)
	}

	// Retrieve fast live counts from Redis
	counts, err := h.RedisStore.GetPollCounts(ctx, pollIDStr)
	if err != nil || len(counts) == 0 {
		// Cache miss / warm from DB
		counts, _, _ = h.MongoStore.AggregateCounts(ctx, pollID)
		if counts == nil {
			counts = make(map[string]int64)
		}
	}

	totalVotes, _ := h.RedisStore.GetTotalVotes(ctx, pollIDStr)
	if totalVotes == 0 && len(counts) > 0 {
		for _, v := range counts {
			totalVotes += v
		}
	}

	// Merge votes into options
	for i := range poll.Options {
		poll.Options[i].Votes = counts[poll.Options[i].ID]
	}
	poll.TotalVotes = totalVotes

	// Check voter status if voter_id provided
	voterID := c.Query("voter_id")
	hasVoted := false
	if voterID != "" {
		hasVoted, _ = h.RedisStore.CheckIfVoted(ctx, pollIDStr, voterID)
		if !hasVoted {
			hasVoted, _ = h.MongoStore.HasUserVoted(ctx, pollID, voterID)
		}
	}

	viewers, _ := h.RedisStore.GetViewers(ctx, pollIDStr)

	c.JSON(http.StatusOK, gin.H{
		"poll":      poll,
		"has_voted": hasVoted,
		"viewers":   viewers,
	})
}

func (h *PollHandler) GetMyPolls(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(primitive.ObjectID)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	polls, err := h.MongoStore.GetPollsByCreator(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch polls"})
		return
	}

	// Populate counts from Redis
	for idx := range polls {
		pID := polls[idx].ID.Hex()
		counts, _ := h.RedisStore.GetPollCounts(ctx, pID)
		total, _ := h.RedisStore.GetTotalVotes(ctx, pID)

		if total == 0 && len(counts) > 0 {
			for _, v := range counts {
				total += v
			}
		}

		for oIdx := range polls[idx].Options {
			polls[idx].Options[oIdx].Votes = counts[polls[idx].Options[oIdx].ID]
		}
		polls[idx].TotalVotes = total
	}

	c.JSON(http.StatusOK, gin.H{"polls": polls})
}

func (h *PollHandler) TogglePollStatus(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(primitive.ObjectID)

	pollIDStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	poll, err := h.MongoStore.GetPollByID(ctx, pollID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	if poll.CreatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the creator can modify poll status"})
		return
	}

	newStatus := !poll.Settings.IsClosed
	if err := h.MongoStore.UpdatePollStatus(ctx, pollID, newStatus); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update poll status"})
		return
	}

	counts, _ := h.RedisStore.GetPollCounts(ctx, pollIDStr)
	total, _ := h.RedisStore.GetTotalVotes(ctx, pollIDStr)
	viewers, _ := h.RedisStore.GetViewers(ctx, pollIDStr)

	// Broadcast live status change over Redis PubSub
	event := &models.LiveUpdateEvent{
		Type:       "POLL_STATUS",
		PollID:     pollIDStr,
		Counts:     counts,
		TotalVotes: total,
		Viewers:    viewers,
		IsClosed:   newStatus,
		Timestamp:  time.Now().UnixMilli(),
	}
	_ = h.RedisStore.PublishEvent(ctx, pollIDStr, event)

	c.JSON(http.StatusOK, gin.H{
		"message":   "Poll status updated",
		"is_closed": newStatus,
	})
}

func (h *PollHandler) DeletePoll(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(primitive.ObjectID)

	pollIDStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.MongoStore.DeletePoll(ctx, pollID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Poll deleted successfully"})
}

func (h *PollHandler) ExportPoll(c *gin.Context) {
	pollIDStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	poll, err := h.MongoStore.GetPollByID(ctx, pollID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	votes, err := h.MongoStore.GetVotesForPoll(ctx, pollID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve votes"})
		return
	}

	counts, _ := h.RedisStore.GetPollCounts(ctx, pollIDStr)
	total, _ := h.RedisStore.GetTotalVotes(ctx, pollIDStr)

	c.JSON(http.StatusOK, gin.H{
		"poll":        poll,
		"counts":      counts,
		"total_votes": total,
		"votes":       votes,
	})
}

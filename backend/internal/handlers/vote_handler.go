package handlers

import (
	"context"
	"net/http"
	"time"

	"livepoll-backend/internal/models"
	"livepoll-backend/internal/storage"
	"livepoll-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VoteHandler struct {
	MongoStore *storage.MongoStore
	RedisStore *storage.RedisStore
}

func NewVoteHandler(mongoStore *storage.MongoStore, redisStore *storage.RedisStore) *VoteHandler {
	return &VoteHandler{
		MongoStore: mongoStore,
		RedisStore: redisStore,
	}
}

func (h *VoteHandler) CastVote(c *gin.Context) {
	pollIDStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	var req models.CastVoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed: Please select at least one option"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Fetch Poll & Validate Settings
	poll, err := h.MongoStore.GetPollByID(ctx, pollID)
	if err != nil || poll == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	if poll.Settings.IsClosed {
		c.JSON(http.StatusForbidden, gin.H{"error": "This poll is now closed and no longer accepting votes"})
		return
	}

	if poll.Settings.ExpiresAt != nil && time.Now().After(*poll.Settings.ExpiresAt) {
		_ = h.MongoStore.UpdatePollStatus(ctx, pollID, true)
		c.JSON(http.StatusForbidden, gin.H{"error": "This poll has expired"})
		return
	}

	if !poll.Settings.IsMultiChoice && len(req.OptionIDs) > 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This poll only allows selecting a single option"})
		return
	}

	// Validate selected option IDs exist in poll
	validOptIDs := make(map[string]bool)
	for _, opt := range poll.Options {
		validOptIDs[opt.ID] = true
	}
	for _, id := range req.OptionIDs {
		if !validOptIDs[id] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid option selected: " + id})
			return
		}
	}

	// 2. Anti-Spam / Anti-Duplicate Verification via Fingerprint & Redis Set
	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	voterHash := utils.GenerateVoterFingerprint(req.VoterID, clientIP, userAgent)

	// Check if already voted in Redis or MongoDB
	hasVotedRedis, _ := h.RedisStore.CheckIfVoted(ctx, pollIDStr, voterHash)
	if hasVotedRedis {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already cast your vote on this poll!"})
		return
	}

	hasVotedMongo, _ := h.MongoStore.HasUserVoted(ctx, pollID, voterHash)
	if hasVotedMongo {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already cast your vote on this poll!"})
		return
	}

	// 3. Atomically Record Vote in Redis (HINCRBY + INCR + SADD)
	success, updatedCounts, totalVotes, err := h.RedisStore.RecordVoteAtomic(ctx, pollIDStr, voterHash, req.OptionIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Realtime voting service encountered an error"})
		return
	}
	if !success {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already voted on this poll!"})
		return
	}

	// 4. Record Persistent Vote in MongoDB
	vote := &models.Vote{
		PollID:    pollID,
		OptionIDs: req.OptionIDs,
		VoterHash: voterHash,
		IP:        clientIP,
		UserAgent: userAgent,
	}
	go func(v *models.Vote) {
		bgCtx, bgCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer bgCancel()
		_ = h.MongoStore.RecordVote(bgCtx, v)
	}(vote)

	// 5. Broadcast Realtime Event via Redis Pub/Sub
	viewers, _ := h.RedisStore.GetViewers(ctx, pollIDStr)
	event := &models.LiveUpdateEvent{
		Type:       "VOTE_UPDATE",
		PollID:     pollIDStr,
		Counts:     updatedCounts,
		TotalVotes: totalVotes,
		Viewers:    viewers,
		IsClosed:   poll.Settings.IsClosed,
		Timestamp:  time.Now().UnixMilli(),
	}
	_ = h.RedisStore.PublishEvent(ctx, pollIDStr, event)

	c.JSON(http.StatusOK, gin.H{
		"message":     "Vote recorded successfully!",
		"counts":      updatedCounts,
		"total_votes": totalVotes,
	})
}

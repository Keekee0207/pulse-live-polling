package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"livepoll-backend/internal/models"
	"livepoll-backend/internal/services"
	"livepoll-backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for dev/prod cross-domain WS connections
		return true
	},
}

type WSHandler struct {
	Hub        *services.RealtimeHub
	RedisStore *storage.RedisStore
}

func NewWSHandler(hub *services.RealtimeHub, redisStore *storage.RedisStore) *WSHandler {
	return &WSHandler{
		Hub:        hub,
		RedisStore: redisStore,
	}
}

func (h *WSHandler) HandlePollWS(c *gin.Context) {
	pollID := c.Param("id")
	if pollID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Poll ID required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	room := h.Hub.GetOrCreateRoom(pollID)
	client := &services.Client{
		PollID: pollID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}

	room.Register <- client

	// Send current state to newly connected client immediately
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		counts, _ := h.RedisStore.GetPollCounts(ctx, pollID)
		total, _ := h.RedisStore.GetTotalVotes(ctx, pollID)
		viewers, _ := h.RedisStore.GetViewers(ctx, pollID)

		initEvent := &models.LiveUpdateEvent{
			Type:       "INITIAL_STATE",
			PollID:     pollID,
			Counts:     counts,
			TotalVotes: total,
			Viewers:    viewers,
			Timestamp:  time.Now().UnixMilli(),
		}

		if data, err := json.Marshal(initEvent); err == nil {
			client.Send <- data
		}
	}()

	go client.WritePump()
	go client.ReadPump(room)
}

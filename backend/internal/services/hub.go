package services

import (
	"context"
	"sync"
	"time"

	"livepoll-backend/internal/models"
	"livepoll-backend/internal/storage"

	"github.com/gorilla/websocket"
)

type Client struct {
	PollID string
	Conn   *websocket.Conn
	Send   chan []byte
}

type PollRoom struct {
	PollID     string
	Clients    map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte
	StopSub    chan struct{}
}

type RealtimeHub struct {
	Rooms      map[string]*PollRoom
	RoomsMu    sync.RWMutex
	RedisStore *storage.RedisStore
	MongoStore *storage.MongoStore
}

func NewRealtimeHub(redisStore *storage.RedisStore, mongoStore *storage.MongoStore) *RealtimeHub {
	return &RealtimeHub{
		Rooms:      make(map[string]*PollRoom),
		RedisStore: redisStore,
		MongoStore: mongoStore,
	}
}

func (h *RealtimeHub) GetOrCreateRoom(pollID string) *PollRoom {
	h.RoomsMu.Lock()
	defer h.RoomsMu.Unlock()

	room, exists := h.Rooms[pollID]
	if !exists {
		room = &PollRoom{
			PollID:     pollID,
			Clients:    make(map[*Client]bool),
			Register:   make(chan *Client),
			Unregister: make(chan *Client),
			Broadcast:  make(chan []byte, 100),
			StopSub:    make(chan struct{}),
		}
		h.Rooms[pollID] = room
		go h.runRoom(room)
		go h.subscribeRedisEvents(room)
	}

	return room
}

func (h *RealtimeHub) runRoom(room *PollRoom) {
	for {
		select {
		case client := <-room.Register:
			room.Clients[client] = true
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			viewers, _ := h.RedisStore.AddViewer(ctx, room.PollID)
			cancel()

			// Broadcast updated viewer count
			h.broadcastViewerUpdate(room.PollID, viewers)

		case client := <-room.Unregister:
			if _, ok := room.Clients[client]; ok {
				delete(room.Clients, client)
				close(client.Send)
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				viewers, _ := h.RedisStore.RemoveViewer(ctx, room.PollID)
				cancel()

				h.broadcastViewerUpdate(room.PollID, viewers)

				// If room is empty, remove it after a delay
				h.RoomsMu.Lock()
				if len(room.Clients) == 0 {
					close(room.StopSub)
					delete(h.Rooms, room.PollID)
					h.RoomsMu.Unlock()
					return
				}
				h.RoomsMu.Unlock()
			}

		case message := <-room.Broadcast:
			for client := range room.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(room.Clients, client)
				}
			}
		}
	}
}

// subscribeRedisEvents listens to the Redis channel for this poll and passes to WebSocket clients
func (h *RealtimeHub) subscribeRedisEvents(room *PollRoom) {
	pubsub := h.RedisStore.Subscribe(context.Background(), room.PollID)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for {
		select {
		case <-room.StopSub:
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			room.Broadcast <- []byte(msg.Payload)
		}
	}
}

func (h *RealtimeHub) broadcastViewerUpdate(pollID string, viewers int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	counts, _ := h.RedisStore.GetPollCounts(ctx, pollID)
	total, _ := h.RedisStore.GetTotalVotes(ctx, pollID)

	event := &models.LiveUpdateEvent{
		Type:       "VIEWER_UPDATE",
		PollID:     pollID,
		Counts:     counts,
		TotalVotes: total,
		Viewers:    viewers,
		Timestamp:  time.Now().UnixMilli(),
	}

	_ = h.RedisStore.PublishEvent(ctx, pollID, event)
}

func (c *Client) ReadPump(room *PollRoom) {
	defer func() {
		room.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Flush queued messages to the frame
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

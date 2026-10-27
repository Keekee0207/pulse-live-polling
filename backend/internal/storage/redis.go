package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"livepoll-backend/internal/config"
	"livepoll-backend/internal/models"

	"github.com/redis/go-redis/v9"
)

type RedisStore struct {
	Client *redis.Client
}

func NewRedisStore(cfg *config.Config) (*RedisStore, error) {
	opts, err := redis.ParseURL(cfg.RedisAddr)
	var client *redis.Client
	if err == nil {
		// Redis URL parsed successfully (e.g. redis:// or rediss://)
		client = redis.NewClient(opts)
	} else {
		// Plain host:port format
		client = redis.NewClient(&redis.Options{
			Addr:     cfg.RedisAddr,
			Password: cfg.RedisPass,
			DB:       0,
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Printf("Successfully connected to Redis (%s)", cfg.RedisAddr)
	return &RedisStore{Client: client}, nil
}

func (r *RedisStore) countsKey(pollID string) string {
	return fmt.Sprintf("poll:%s:counts", pollID)
}

func (r *RedisStore) totalKey(pollID string) string {
	return fmt.Sprintf("poll:%s:total", pollID)
}

func (r *RedisStore) votersKey(pollID string) string {
	return fmt.Sprintf("poll:%s:voters", pollID)
}

func (r *RedisStore) viewersKey(pollID string) string {
	return fmt.Sprintf("poll:%s:viewers", pollID)
}

func (r *RedisStore) ChannelName(pollID string) string {
	return fmt.Sprintf("poll:%s:events", pollID)
}

// CheckIfVoted checks whether voterKey is present in the Redis set
func (r *RedisStore) CheckIfVoted(ctx context.Context, pollID string, voterKey string) (bool, error) {
	return r.Client.SIsMember(ctx, r.votersKey(pollID), voterKey).Result()
}

// RecordVoteAtomic applies atomic vote updates:
// 1. Adds voterKey to voters set (returns false if already voted)
// 2. Increments option counts via HINCRBY
// 3. Increments total votes via INCR
func (r *RedisStore) RecordVoteAtomic(ctx context.Context, pollID string, voterKey string, optionIDs []string) (bool, map[string]int64, int64, error) {
	// Attempt to add voter to set
	added, err := r.Client.SAdd(ctx, r.votersKey(pollID), voterKey).Result()
	if err != nil {
		return false, nil, 0, err
	}
	if added == 0 {
		// Voter already voted
		return false, nil, 0, nil
	}

	pipe := r.Client.Pipeline()
	for _, optID := range optionIDs {
		pipe.HIncrBy(ctx, r.countsKey(pollID), optID, 1)
	}
	totalCmd := pipe.IncrBy(ctx, r.totalKey(pollID), int64(len(optionIDs)))

	_, err = pipe.Exec(ctx)
	if err != nil {
		// Rollback voter presence if pipeline failed
		_ = r.Client.SRem(ctx, r.votersKey(pollID), voterKey).Err()
		return false, nil, 0, err
	}

	total := totalCmd.Val()
	counts, err := r.GetPollCounts(ctx, pollID)
	if err != nil {
		return true, make(map[string]int64), total, nil
	}

	return true, counts, total, nil
}

// GetPollCounts retrieves option counts from Redis
func (r *RedisStore) GetPollCounts(ctx context.Context, pollID string) (map[string]int64, error) {
	res, err := r.Client.HGetAll(ctx, r.countsKey(pollID)).Result()
	if err != nil {
		return nil, err
	}

	counts := make(map[string]int64)
	for k, v := range res {
		c, _ := strconv.ParseInt(v, 10, 64)
		counts[k] = c
	}
	return counts, nil
}

// GetTotalVotes retrieves total votes count from Redis
func (r *RedisStore) GetTotalVotes(ctx context.Context, pollID string) (int64, error) {
	val, err := r.Client.Get(ctx, r.totalKey(pollID)).Result()
	if err != nil {
		if err == redis.Nil {
			return 0, nil
		}
		return 0, err
	}
	return strconv.ParseInt(val, 10, 64)
}

// SeedPollCounts initialises or restores Redis keys from DB data
func (r *RedisStore) SeedPollCounts(ctx context.Context, pollID string, counts map[string]int64, total int64) error {
	pipe := r.Client.Pipeline()
	pipe.Del(ctx, r.countsKey(pollID))
	for optID, count := range counts {
		pipe.HSet(ctx, r.countsKey(pollID), optID, count)
	}
	pipe.Set(ctx, r.totalKey(pollID), total, 0)
	_, err := pipe.Exec(ctx)
	return err
}

// PublishEvent publishes a live update event to Redis Pub/Sub
func (r *RedisStore) PublishEvent(ctx context.Context, pollID string, event *models.LiveUpdateEvent) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return r.Client.Publish(ctx, r.ChannelName(pollID), payload).Err()
}

// Subscribe returns a Redis PubSub subscription for a poll
func (r *RedisStore) Subscribe(ctx context.Context, pollID string) *redis.PubSub {
	return r.Client.Subscribe(ctx, r.ChannelName(pollID))
}

// Active Viewer Counter
func (r *RedisStore) AddViewer(ctx context.Context, pollID string) (int64, error) {
	return r.Client.Incr(ctx, r.viewersKey(pollID)).Result()
}

func (r *RedisStore) RemoveViewer(ctx context.Context, pollID string) (int64, error) {
	count, err := r.Client.Decr(ctx, r.viewersKey(pollID)).Result()
	if err != nil {
		return 0, err
	}
	if count < 0 {
		_ = r.Client.Set(ctx, r.viewersKey(pollID), 0, 0).Err()
		return 0, nil
	}
	return count, nil
}

func (r *RedisStore) GetViewers(ctx context.Context, pollID string) (int64, error) {
	val, err := r.Client.Get(ctx, r.viewersKey(pollID)).Result()
	if err != nil {
		if err == redis.Nil {
			return 0, nil
		}
		return 0, err
	}
	return strconv.ParseInt(val, 10, 64)
}

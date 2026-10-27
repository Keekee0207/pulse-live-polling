package storage

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"livepoll-backend/internal/config"
	"livepoll-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoStore struct {
	Client   *mongo.Client
	Database *mongo.Database
	Users    *mongo.Collection
	Polls    *mongo.Collection
	Votes    *mongo.Collection
}

func NewMongoStore(cfg *config.Config) (*MongoStore, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(cfg.MongoURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	db := client.Database(cfg.DBName)
	store := &MongoStore{
		Client:   client,
		Database: db,
		Users:    db.Collection("users"),
		Polls:    db.Collection("polls"),
		Votes:    db.Collection("votes"),
	}

	if err := store.ensureIndexes(ctx); err != nil {
		log.Printf("Warning: failed to build MongoDB indexes: %v", err)
	}

	log.Printf("Successfully connected to MongoDB (%s)", cfg.DBName)
	return store, nil
}

func (s *MongoStore) ensureIndexes(ctx context.Context) error {
	// Unique index on users.email
	userIndex := mongo.IndexModel{
		Keys:    bson.M{"email": 1},
		Options: options.Index().SetUnique(true),
	}
	if _, err := s.Users.Indexes().CreateOne(ctx, userIndex); err != nil {
		return err
	}

	// Index on polls.creator_id
	pollIndex := mongo.IndexModel{
		Keys: bson.M{"creator_id": 1},
	}
	if _, err := s.Polls.Indexes().CreateOne(ctx, pollIndex); err != nil {
		return err
	}

	// Compound index on votes: poll_id + voter_hash
	voteIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "poll_id", Value: 1},
			{Key: "voter_hash", Value: 1},
		},
	}
	_, err := s.Votes.Indexes().CreateOne(ctx, voteIndex)
	return err
}

// User Methods
func (s *MongoStore) CreateUser(ctx context.Context, user *models.User) error {
	user.CreatedAt = time.Now()
	res, err := s.Users.InsertOne(ctx, user)
	if err != nil {
		return err
	}
	user.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) FindUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := s.Users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (s *MongoStore) FindUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	err := s.Users.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// Poll Methods
func (s *MongoStore) CreatePoll(ctx context.Context, poll *models.Poll) error {
	now := time.Now()
	poll.CreatedAt = now
	poll.UpdatedAt = now
	res, err := s.Polls.InsertOne(ctx, poll)
	if err != nil {
		return err
	}
	poll.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) GetPollByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error) {
	var poll models.Poll
	err := s.Polls.FindOne(ctx, bson.M{"_id": id}).Decode(&poll)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &poll, nil
}

func (s *MongoStore) GetPollsByCreator(ctx context.Context, creatorID primitive.ObjectID) ([]models.Poll, error) {
	cursor, err := s.Polls.Find(ctx, bson.M{"creator_id": creatorID}, options.Find().SetSort(bson.M{"created_at": -1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []models.Poll
	if err := cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	return polls, nil
}

func (s *MongoStore) UpdatePollStatus(ctx context.Context, id primitive.ObjectID, isClosed bool) error {
	_, err := s.Polls.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"settings.is_closed": isClosed,
			"updated_at":         time.Now(),
		},
	})
	return err
}

func (s *MongoStore) DeletePoll(ctx context.Context, id primitive.ObjectID, creatorID primitive.ObjectID) error {
	res, err := s.Polls.DeleteOne(ctx, bson.M{"_id": id, "creator_id": creatorID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return errors.New("poll not found or unauthorized")
	}
	// Clean up related votes
	_, _ = s.Votes.DeleteMany(ctx, bson.M{"poll_id": id})
	return nil
}

// Vote Methods
func (s *MongoStore) RecordVote(ctx context.Context, vote *models.Vote) error {
	vote.CreatedAt = time.Now()
	res, err := s.Votes.InsertOne(ctx, vote)
	if err != nil {
		return err
	}
	vote.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) HasUserVoted(ctx context.Context, pollID primitive.ObjectID, voterHash string) (bool, error) {
	count, err := s.Votes.CountDocuments(ctx, bson.M{
		"poll_id":    pollID,
		"voter_hash": voterHash,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *MongoStore) GetVotesForPoll(ctx context.Context, pollID primitive.ObjectID) ([]models.Vote, error) {
	cursor, err := s.Votes.Find(ctx, bson.M{"poll_id": pollID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var votes []models.Vote
	if err := cursor.All(ctx, &votes); err != nil {
		return nil, err
	}
	return votes, nil
}

func (s *MongoStore) AggregateCounts(ctx context.Context, pollID primitive.ObjectID) (map[string]int64, int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"poll_id": pollID}}},
		{{Key: "$unwind", Value: "$option_ids"}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$option_ids",
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := s.Votes.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		ID    string `bson:"_id"`
		Count int64  `bson:"count"`
	}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, 0, err
	}

	counts := make(map[string]int64)
	var total int64 = 0
	for _, r := range results {
		counts[r.ID] = r.Count
		total += r.Count
	}

	return counts, total, nil
}

package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name         string             `bson:"name" json:"name" binding:"required,min=2,max=50"`
	Email        string             `bson:"email" json:"email" binding:"required,email"`
	PasswordHash string             `bson:"password_hash" json:"-"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
}

type AuthRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type Option struct {
	ID    string `bson:"id" json:"id"`
	Text  string `bson:"text" json:"text"`
	Color string `bson:"color,omitempty" json:"color,omitempty"`
	Votes int64  `bson:"-" json:"votes"`
}

type PollSettings struct {
	IsMultiChoice bool       `bson:"is_multi_choice" json:"is_multi_choice"`
	IsClosed      bool       `bson:"is_closed" json:"is_closed"`
	ExpiresAt     *time.Time `bson:"expires_at,omitempty" json:"expires_at,omitempty"`
}

type Poll struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CreatorID    primitive.ObjectID `bson:"creator_id" json:"creator_id"`
	CreatorEmail string             `bson:"creator_email,omitempty" json:"creator_email,omitempty"`
	Question     string             `bson:"question" json:"question"`
	Description  string             `bson:"description,omitempty" json:"description,omitempty"`
	Options      []Option           `bson:"options" json:"options"`
	Settings     PollSettings       `bson:"settings" json:"settings"`
	TotalVotes   int64              `bson:"-" json:"total_votes"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}

type CreatePollRequest struct {
	Question      string       `json:"question" binding:"required,min=5,max=255"`
	Description   string       `json:"description" binding:"max=1000"`
	Options       []string     `json:"options" binding:"required,min=2,max=10,dive,required,min=1,max=120"`
	IsMultiChoice bool         `json:"is_multi_choice"`
	ExpiresInMins *int         `json:"expires_in_mins,omitempty"`
}

type CastVoteRequest struct {
	OptionIDs []string `json:"option_ids" binding:"required,min=1"`
	VoterID   string   `json:"voter_id" binding:"required"`
}

type Vote struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID    primitive.ObjectID `bson:"poll_id" json:"poll_id"`
	OptionIDs []string           `bson:"option_ids" json:"option_ids"`
	VoterHash string             `bson:"voter_hash" json:"voter_hash"`
	IP        string             `bson:"ip" json:"ip"`
	UserAgent string             `bson:"user_agent" json:"user_agent"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

type LiveUpdateEvent struct {
	Type       string           `json:"type"`
	PollID     string           `json:"poll_id"`
	Counts     map[string]int64 `json:"counts"`
	TotalVotes int64            `json:"total_votes"`
	Viewers    int64            `json:"viewers"`
	IsClosed   bool             `json:"is_closed"`
	Timestamp  int64            `json:"timestamp"`
}

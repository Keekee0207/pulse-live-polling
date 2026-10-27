package utils

import (
	"crypto/sha256"
	"encoding/hex"

	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateVoterFingerprint computes a SHA-256 fingerprint from voter ID, client IP, and UserAgent
func GenerateVoterFingerprint(voterID, ip, userAgent string) string {
	hasher := sha256.New()
	hasher.Write([]byte(voterID + ":" + ip + ":" + userAgent))
	return hex.EncodeToString(hasher.Sum(nil))
}

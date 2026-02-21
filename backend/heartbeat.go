package main

import (
	"context"
	"encoding/json" // Need this to convert your struct to a string
	"fmt"
	"time"
	"github.com/gofiber/fiber/v2"
)

// Add Status and UpdatedAt so the frontend gets everything it needs
type HeartbeatReq struct {
    DeviceID    string    `json:"device_id"`
    Battery     int       `json:"battery"`
    Temperature int       `json:"temperature"`
    Status      string    `json:"status"`
    UpdatedAt   time.Time `json:"updated_at"`
}

func HeartbeatHandler(c *fiber.Ctx) error {
    var req HeartbeatReq

    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid format"})
    }

    // 1. Force the status and timestamp to be correct for the current pulse
    req.Status = "online"
    req.UpdatedAt = time.Now()

    ctx := context.Background()
    redisKey := "pulse:" + req.DeviceID

    // 2. Convert the entire Go struct back into a JSON string
    deviceJSON, err := json.Marshal(req)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Failed to encode device data"})
    }

    // 3. Save the full JSON string to Redis, not just the word "online"
    err = RDB.Set(ctx, redisKey, deviceJSON, 30*time.Second).Err()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Redis ingestion failed"})
    }

    fmt.Printf("💓 Pulse Saved: [%s] | Temp: %d°C | Battery: %d%%\n", req.DeviceID, req.Temperature, req.Battery)

    return c.Status(200).JSON(fiber.Map{
        "status": "alive",
        "ttl":    "30s",
    })
}
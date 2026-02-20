package main

import (
	"context"
	"fmt"
	"time"
	"github.com/gofiber/fiber/v2"
)

type HeartbeatReq struct {
	DeviceID    string `json:"device_id"`
	Battery     int    `json:"battery"`
	Temperature int    `json:"temperature"`
}

func HeartbeatHandler(c *fiber.Ctx) error {
	var req HeartbeatReq

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid format"})
	}


	ctx := context.Background()


	redisKey := "pulse:" + req.DeviceID


	err := RDB.Set(ctx, redisKey, "online", 30*time.Second).Err()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Redis ingestion failed"})
	}

	fmt.Printf("💓 Pulse: [%s] | Temp: %d°C | Battery: %d%%\n", req.DeviceID, req.Temperature, req.Battery)


	return c.Status(200).JSON(fiber.Map{
		"status": "alive",
		"ttl":    "30s",
	})
}
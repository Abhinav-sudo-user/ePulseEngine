package main

import (
	"context"
	"encoding/json"
	"log"
	"github.com/gofiber/fiber/v2"
)

func SyncStatusesToPostgres() {
	var devices []Device
	
	// Fetch all devices from Supabase
	if err := DB.Find(&devices).Error; err != nil {
		log.Println("Worker Error: Could not fetch from DB")
		return
	}

	ctx := context.Background()

	for _, dev := range devices {
		redisKey := "pulse:" + dev.DeviceID
		
		// Check if it is alive in Redis
		pulseExists, _ := RDB.Exists(ctx, redisKey).Result()

		// Logic: If Supabase says "online", but Redis says it's DEAD
		if pulseExists == 0 && dev.Status == "online" {
			// Update Supabase to "offline"
			DB.Model(&dev).Update("status", "offline")
			log.Printf("🚨 SWEPPER: Device [%s] died. Updated Supabase to offline.", dev.DeviceID)
			go SendSlackAlert(dev.DeviceID)
			go SendEmailAlert("deveshrawat2126@gmail.com", dev.DeviceID)

		} else if pulseExists > 0 && dev.Status == "offline" {
			// Update Supabase to "online"
			DB.Model(&dev).Update("status", "online")
			log.Printf("✅ SWEPPER: Device [%s] recovered. Updated Supabase to online.", dev.DeviceID)
		}
	}
}

func GetAllDevicesHandler(c *fiber.Ctx) error {
	var devices []Device

	if err := DB.Find(&devices).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch from Postgres"})
	}

	ctx := context.Background()

	for i := range devices {
		redisKey := "pulse:" + devices[i].DeviceID

		// Fetch the JSON string from Redis
		val, err := RDB.Get(ctx, redisKey).Result()
		
		if err == nil && val != "" {
			var freshData struct {
				Battery     int `json:"battery"`
				Temperature int `json:"temperature"`
			}

			// Unmarshal the Redis JSON into our temp struct
			if err := json.Unmarshal([]byte(val), &freshData); err == nil {
				// ✅ Use the correct variable 'freshData'
				devices[i].Battery = freshData.Battery
				devices[i].Temperature = freshData.Temperature
				devices[i].Status = "online"
			}
		} else {
			devices[i].Status = "offline"
		}
	}

	return c.Status(200).JSON(devices)
}

func SendSlackAlert(deviceID string) {
	webhookURL := "https://hooks.slack.com/services/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"

	// 1. Create the payload using fiber.Map (super easy!)
	payload := fiber.Map{
		"text": "🚨 *CRITICAL ALERT*: PulseEngine node `" + deviceID + "` has dropped offline. Redis heartbeat lost.",
	}

	// 2. Use Fiber's built-in Agent to make the POST request
	agent := fiber.Post(webhookURL)
	agent.JSON(payload) // Fiber automatically converts the map to JSON!

	// 3. Execute the request
	statusCode, _, errs := agent.Bytes()
	
	if len(errs) > 0 {
		log.Printf("Slack Error: Could not send alert: %v", errs[0])
		return
	}

	if statusCode != 200 {
		log.Printf("Slack Error: Slack rejected the message. Status: %d", statusCode)
		return
	}

	log.Printf("🔔 SLACK ALERT FIRED for device: %s", deviceID)
}


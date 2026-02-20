package main

import (
	"context"
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


		pulseExists, err := RDB.Exists(ctx, redisKey).Result()
		
		if err == nil && pulseExists > 0 {
			devices[i].Status = "online"
		} else {
			devices[i].Status = "offline" 
		}
	}

	return c.Status(200).JSON(devices)
}
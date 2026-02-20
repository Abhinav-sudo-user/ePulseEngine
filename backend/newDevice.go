package main

import (
	"time"
	"github.com/gofiber/fiber/v2"
)

func RegisterDeviceHandler(c *fiber.Ctx) error {
	device := new(Device)

	if err := c.BodyParser(device); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request format"})
	}

	device.LastPing = time.Now()

	if device.Status == "" {
		device.Status = "online"
	}
	if err := DB.Create(&device).Error; err != nil {
		return c.Status(409).JSON(fiber.Map{
			"error": "Device registration failed. ID might already exist.",
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"message":   "Device registered successfully",
		"device_id": device.DeviceID,
	})
}
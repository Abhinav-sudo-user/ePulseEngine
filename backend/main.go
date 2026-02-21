package main

import (
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB
var RDB *redis.Client


// Device matches your uploaded SQL schema exactly
type Device struct {
	ID          uint      `gorm:"primaryKey;column:id"`
	DeviceID    string    `json:"device_id" gorm:"column:device_id;unique;not null"`
	LastPing    time.Time `json:"last_ping" gorm:"column:last_ping;not null"`
	Battery     int       `json:"battery" gorm:"column:battery"`
	Temperature int       `json:"temperature" gorm:"column:temperature"`
	Status      string    `json:"status" gorm:"column:status;default:'online'"`
	CreatedAt   time.Time `json:"created_at" gorm:"column:created_at;default:now()"`
}


func initDB() {
	dsn := "postgresql://postgres:Devesh@2126@db.mwwvlplqblnyxfklhlbp.supabase.co:5432/postgres"
	
	var err error
    DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal(" GORM failed to open connection:", err)
    }


    sqlDB, err := DB.DB()
    if err != nil {
        log.Fatal(" Failed to get sql.DB instance:", err)
    }

    if err := sqlDB.Ping(); err != nil {
        log.Fatal(" Database is unreachable! Check your password/WiFi:", err)
    }

    log.Println(" Supabase is connected and ready!")
    

    DB.AutoMigrate(&Device{})
}

func initRedis() {

	RDB = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", 
		Password: "",               
		DB:       0,              
	})

	log.Println("⚡ Redis Cache Connected Successfully")
}



func main() {
	initDB()
    initRedis()

	SendSlackAlert("TEST-NODE-001")
	go SendEmailAlert("deveshrawat2126@gmail.com", "TEST-100")

	app := fiber.New()
	app.Use(cors.New())

    go func() {
		ticker := time.NewTicker(10 * time.Second) // Run every 10 seconds
		for range ticker.C {
			SyncStatusesToPostgres()
		}
	}()

    app.Get("/", func(c *fiber.Ctx) error {

    dir, err := os.Getwd()
    if err != nil {
        return c.Status(500).SendString("Server Error: Cannot find directory")
    }

    return c.SendFile(dir + "\\index.html") 
})

	app.Post("/api/register", RegisterDeviceHandler)
    app.Post("/api/heartbeat", HeartbeatHandler)
    app.Get("/api/devices", GetAllDevicesHandler)
	log.Fatal(app.Listen(":8080"))
}


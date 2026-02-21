package main

import (
	"os"
	"strconv"
	"gopkg.in/gomail.v2"
)

func SendEmailAlert(targetEmail string, deviceID string) error {
	smtpHost := "smtp.resend.com" 
	smtpPort, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")

	m := gomail.NewMessage()
	m.SetHeader("From", "alerts@pulseengine.io")
	m.SetHeader("To", targetEmail)
	m.SetHeader("Subject", "🚨 Critical Alert: Device Offline")
	
	// You can use HTML to make it look like your Dashboard theme
	m.SetBody("text/html", `
		<div style="font-family: sans-serif; background: #0f1117; color: #e2e8f0; padding: 20px; border-radius: 10px;">
			<h2 style="color: #ef4444;">PulseEngine Alert</h2>
			<p>Node <strong>`+deviceID+`</strong> has stopped sending heartbeats.</p>
			<a href="https://your-dashboard.com" style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
		</div>
	`)

	d := gomail.NewDialer(smtpHost, smtpPort, smtpUser, smtpPass)

	return d.DialAndSend(m)
}
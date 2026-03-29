# SafeCity

> Empowering citizens. Informing municipalities. Making Algiers safer — one report at a time.

SafeCity is a civic tech platform that bridges the gap between citizens and their local municipality through the power of AI. Built for Algiers, SafeCity allows citizens to report urban incidents — broken streetlights, gas leaks, aggressions, road damage — through a simple conversational chatbot, while giving municipal authorities a real-time intelligent dashboard to visualize, prioritize, and act on those reports.

## How it works

A citizen opens the app, picks their neighborhood from a list of Algiers communes, and describes what they see in natural language. An AI model extracts the key information — incident type, description, and urgency — and saves it to the database. Behind the scenes, an automated workflow reads all reported incidents, clusters them by zone, and scores each area with a danger level: Low, Medium, or High. The municipality sees a live heatmap of the city, updated every 30 seconds, with AI-generated intervention recommendations for each danger zone.

## Built with

- **Node.js / Express** — REST API backend
- **PostgreSQL (Neon)** — cloud database
- **AI Model** — trained on Algerian urban data for incident extraction and zone analysis
- **n8n** — automated workflow engine
- **React + Leaflet.js** — interactive heatmap frontend
- **JWT** — secure authentication for citizens and municipality agents
## Backend Structure
```
backend/
├── src/
│   ├── config/
│   │   └── db.js                  # PostgreSQL connection (Neon)
│   ├── controllers/
│   │   ├── authController.js      # register, login, me, refresh
│   │   └── chatController.js      # chat, zones, incidents, stats
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT protect + restrictTo
│   ├── models/
│   │   ├── usermodel.js           # users CRUD
│   │   ├── incidentmodel.js       # incidents CRUD + stats
│   │   ├── quartiermodel.js       # quartiers lookup
│   │   ├── zonedangermodel.js     # zones_danger upsert
│   │   └── chatsessionmodel.js   # chat session state
│   ├── routes/
│   │   ├── authRoutes.js          # /api/auth/*
│   │   └── chatRoutes.js          # /api/chat, /api/zones, /api/incidents
│   └── validators/
│       └── app.js                 # Express app entry point
├── testes/
│   └── server.js                  # server bootstrap
└── seed.js                        # populate quartiers table (run once)
```
## AI Implementation
The user can use the chatbot to :
- Report an incident or an event in your city -Citizen Interface
  * open the chatbot
  * express the event in naturel language
  * incase of insufficiant informations the bot will ask you to complete them, necessary Informations include : (Description, Localisation)
  * the bot will then access the event based on three levels of danger (High,Medium,Low)
  * it will send these information to the admin dashboard
  * and finally reassure the user that his worries will be taken care of as soon as possible and ask if it needs any more assistance


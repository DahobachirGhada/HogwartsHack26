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

## SafeCity — API Reference
Complete list of all backend endpoints
# Base URL: https://hogwartshack26.onrender.com
# 1. Authentication
All protected routes require a Bearer token in the Authorization header:
Authorization: Bearer <token>

# Method	Endpoint	Auth	Description
POST	/api/auth/register	Public	Create a new citoyen account (name, email, password, phone, wilaya)

POST	/api/auth/login	Public	Login and receive JWT token + refresh token

GET	/api/auth/me	JWT	Get current logged-in user profile

POST	/api/auth/refresh	Public	Get a new access token using refresh token

# 2. Chat — Incident Reporting (Citoyen)
The chatbot flow: citizen selects a quartier → starts a session → chats with Gemini AI → incident is saved automatically when all info is collected.

# Method	Endpoint	Auth	Description
GET	/api/quartiers	Public	Get all available quartiers (id, nom, lat, lng)

POST	/api/chat/start	citoyen	Start a new chat session — body: { quartier_id }

POST	/api/chat	citoyen	Send a message to the chatbot — body: { message, image_url? }


When AI MODEL collects type + description + danger_level, the incident is saved automatically and classifyZones() is triggered to update the heatmap.

# 3. Incidents & Zones
Method	Endpoint	Auth	Description
GET	/api/incidents	Public	Get all incidents — query: ?quartier=&type=&date=

GET	/api/zones	Public	Get all danger zones for the heatmap (nom, lat, lng, score, recommandation)

GET	/api/stats	Public	Dashboard stats: signalements_ouverts, en_cours, resolus_aujourdhui, alertes_critiques...

GET	/api/home	citoyen	Home stats for citizen: weekly_reports, total_incidents

POST	/api/ingest	Public	Trigger Vectra RAG re-ingestion (PDFs + quartiers DB)

# 4. Analytics (Mairie)
Query parameter: ?period=week | month | year

Method	Endpoint	Auth	Description

GET	/api/analytics	Public	Signalements par jour, répartition par catégorie, top quartiers, taux de résolution


Response includes: by_day [ date, total, resolved ], by_category [ category, total, percentage ], by_quartier [ quartier, total, high_count ], stats [ resolution_rate, open, in_progress, resolved ]

# 5. Emergency Alerts (Mairie)
Alerts are incidents with danger_level = High and status != resolved.


Method	Endpoint	Auth	Description

GET	/api/alerts	Public	Get all active critical alerts (High danger_level, unresolved)

GET	/api/alerts/history	Public	Get history of resolved incidents


# 6. AI Priorities (Mairie)
Gemini analyzes all open incidents and returns a prioritized briefing with scores and recommendations per zone.

Method	Endpoint	Auth	Description

POST	/api/priorities	Public	AI briefing — body: { currentIncidents, patterns } OR auto-fetched from DB

PUT	/api/priorities/:id/resolve	Public	Mark an incident as resolved — status becomes 'resolved'


Response includes: summary (city state in one sentence), top_priorities [ id, nom, lat, lng, score, recommandation ]

# 7. AI Table
Method	Endpoint	Auth	Description

GET	/api/aitable	Public	Get latest 3 AI-generated priority entries


# 8. Roles & Access
Method	Endpoint	Auth	Description

citoyen	Default role	—	Can register, login, start chat, report incidents, view home stats

mairie	Admin role	—	Can view all incidents, stats, analytics, alerts, priorities, resolve incidents


# 9. Key Technical Notes
• PostgreSQL on Neon — tables: users, roles, incidents, quartiers, zones_danger, chat_sessions

• Vectra RAG — local vector index built from PDFs + quartiers DB via scripts/ingest.js
• classifyZones() — auto-runs after each incident save, updates zones_danger table
• Nominatim (OpenStreetMap) — free geocoding to convert quartier name to lat/lng
• JWT auth — access token (7d) + refresh token (30d)



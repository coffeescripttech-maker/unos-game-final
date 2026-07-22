# UNOS: Birth of the Typhoon
## Technical Requirements & Game Features (Phaser Edition)

## Overview
A 2D educational browser game where players learn how tropical cyclones form through interactive mini-games. Built with a modern web stack using Phaser 3 for gameplay and React + RetroUI for the application interface.

## Technology Stack
- Game Engine: Phaser 3
- Language: TypeScript
- Build Tool: Vite
- UI Framework: React
- Design System: RetroUI + Tailwind CSS
- Backend: Node.js + Express
- Multiplayer: Socket.IO
- Authentication: Firebase Auth
- Database: Firebase Firestore or MySQL
- Audio: Howler.js
- Version Control: Git + GitHub

## Architecture
- React manages authentication, dashboard, profile, settings, achievements, leaderboard, and multiplayer lobby.
- Phaser manages gameplay scenes, animations, particles, input, and HUD.
- Node.js + Socket.IO synchronizes multiplayer sessions.
- Firebase/MySQL stores users, progress, achievements, rooms, and leaderboards.

## Core Gameplay
1. Tutorial
2. Evaporation – generate water vapor by heating the ocean.
3. Condensation – connect vapor particles into clouds.
4. Air Pressure – arrange pressure systems and wind flow.
5. Rotation – create cyclonic rotation.
6. Typhoon Formation – combine all weather elements.
7. Boss Challenge – survive dynamic weather events.

## Educational Features
- Science facts after every level.
- Progressive learning objectives.
- Weather terminology and real-world concepts.
- Performance-based feedback.

## Game Features
- Single-player campaign
- Optional cooperative multiplayer (up to 4 players)
- Leaderboards
- Achievements
- Save/load progress
- Power-ups
- Dynamic weather effects
- Animated world map
- Results and statistics
- Accessibility settings

## UI / UX
- Neo-Brutalist style using RetroUI.
- Bold cards, thick borders, vibrant colors.
- Responsive React interface.
- Consistent Phaser HUD matching RetroUI.

## Phaser Scenes
- Boot
- Preload
- Main Menu
- World Map
- Tutorial
- Evaporation
- Condensation
- Pressure
- Rotation
- Typhoon
- Boss
- Results

## Suggested Project Structure
```
client/
  src/
    game/
      scenes/
      objects/
      managers/
      ui/
    components/
    pages/
server/
assets/
shared/
```

## Core Managers
- GameManager
- SceneManager
- WeatherManager
- AudioManager
- SaveManager
- MultiplayerManager
- AchievementManager
- PowerupManager

## Database Entities
- Users
- Progress
- Leaderboards
- Achievements
- Multiplayer Rooms
- Game History

## Development Phases
1. Planning & GDD
2. UI/UX Design
3. Core Gameplay
4. Advanced Mechanics
5. Backend & Multiplayer
6. Testing & Optimization
7. Deployment & Documentation

## Future Enhancements
- Seasonal events
- Additional weather phenomena
- Teacher dashboard
- Analytics
- Mobile optimization
- Localization

## Goal
Deliver a polished educational web game that teaches typhoon formation through engaging gameplay while demonstrating modern web development, software architecture, and game design practices suitable for a capstone project.

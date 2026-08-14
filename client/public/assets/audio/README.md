# CIVIKA Audio Assets

This directory contains all audio assets for the CIVIKA game.

## Directory Structure

```
public/assets/audio/
├── menu-theme.mp3              # Main menu background music
├── barangay-theme.mp3          # Level 1 (Barangay) background music
├── city-theme.mp3              # Level 2 (City) background music
├── quiz-theme.mp3              # Quiz/Mission music
├── mission-theme.mp3           # Mission briefing music
├── button-click.wav            # UI button click sound
├── mission-complete.wav        # Mission completion sound
├── quiz-correct.wav            # Correct quiz answer sound
├── quiz-wrong.wav              # Wrong quiz answer sound
├── level-up.wav                # Level up achievement sound
├── coin-collect.wav            # Coin collection sound
├── badge-earned.wav            # Badge earned sound
├── npc-interact.wav            # NPC interaction sound
├── menu-open.wav               # Menu open sound
└── menu-close.wav              # Menu close sound
```

## Audio Requirements

### Music Files

-   **Format**: MP3 or OGG
-   **Quality**: 128-192 kbps for web optimization
-   **Duration**:
    -   Background music: 2-5 minutes (loopable)
    -   Menu music: 1-3 minutes (loopable)
-   **Style**: Medieval/fantasy themed to match the UI

### Sound Effects

-   **Format**: WAV or MP3
-   **Quality**: 44.1 kHz, 16-bit
-   **Duration**: 0.1-2 seconds
-   **Style**: Clear, non-intrusive UI sounds

## Level-Specific Music Themes

### Main Menu (`menu-theme.mp3`)

-   Welcoming, orchestral theme
-   Medieval/fantasy style
-   Represents the adventure beginning

### Barangay Level (`barangay-theme.mp3`)

-   Community-focused, peaceful theme
-   Folk instruments mixed with modern elements
-   Represents local governance and community spirit

### City Level (`city-theme.mp3`)

-   More sophisticated, urban theme
-   Building on the barangay theme but with added complexity
-   Represents municipal governance and larger-scale civic duty

### Quiz Music (`quiz-theme.mp3`)

-   Focused, thoughtful background music
-   Less prominent to avoid distraction
-   Encourages concentration and learning

### Mission Music (`mission-theme.mp3`)

-   Motivational and engaging
-   Represents civic action and community service
-   Similar to quiz music but slightly more energetic

## Implementation Notes

-   All audio files should be placed in their respective folders
-   The AudioManager will automatically load and play level-specific music
-   Sound effects are preloaded for instant playback
-   Volume levels are controlled through the Settings menu
-   Audio respects user preferences (mute, volume levels)

## Licensing

Ensure all audio assets are:

-   Royalty-free or properly licensed
-   Suitable for educational use
-   Credit original creators if required

## Testing

Test all audio files:

-   In different browsers (Chrome, Firefox, Safari, Edge)
-   On different devices (desktop, mobile, tablet)
-   With various volume settings
-   With audio disabled/enabled settings

# GFIT Assets Folder

## Video Background Setup

To add the video background for the welcome screen:

1. **Download the BSF website video:**
   - Go to: https://bensstaminafactory.com/
   - Look for the main video on the homepage
   - Download it and save as `bsf-background.mp4`

2. **Place the video file:**
   - Save `bsf-background.mp4` in this `assets` folder
   - The video should be in MP4 format
   - Recommended resolution: 1920x1080 or 1280x720
   - Keep file size under 50MB for better app performance

3. **Video Requirements:**
   - Format: MP4
   - Codec: H.264
   - Resolution: 1280x720 or 1920x1080
   - Duration: 10-30 seconds (will loop continuously)
   - File size: Under 50MB

4. **Alternative:**
   - If you can't get the website video, use any fitness/gym related video
   - Or create a simple animated background using the fallback gradient

## Current Assets:
- `Ben's Stamina Factory_Logo.png` - Company logo
- `bsf-background.mp4` - Background video (to be added)

## Notes:
- The video will loop continuously in the background
- It's muted by default for better user experience
- If video fails to load, a gradient fallback will be shown
- Video uses `ResizeMode.COVER` to fill the entire screen

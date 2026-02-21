# Testing Guide for Custom Spots Feature

This guide provides instructions for testing the new custom spots functionality with Leaflet map integration.

## Prerequisites

1. Backend server running with MongoDB
2. Chrome browser with the extension loaded
3. Test accounts:
   - FREE account (can add 1 spot)
   - PREMIUM account (can add unlimited spots)

## Test Scenarios

### 1. Test FREE User Spot Limit

**Steps:**
1. Open extension popup
2. Click "Criar conta FREE" and register a new account
3. Click "📍 Os Meus Spots" to expand the section
4. Click "🗺️ Adicionar no Mapa"
5. Click anywhere on the map to select a location
6. Enter a spot name (e.g., "Meu Spot Secreto")
7. Click "Guardar Spot"

**Expected Result:**
- Spot is successfully added
- The spot appears in the "Os Meus Spots" list
- A warning message appears: "👤 FREE: 1 spot máximo. Upgrade para Premium para spots ilimitados."

**Steps (continued):**
8. Try to add a second spot by clicking "🗺️ Adicionar no Mapa" again
9. Select a location and try to save

**Expected Result:**
- Error message appears: "Utilizadores FREE podem adicionar apenas 1 spot. Faz upgrade para Premium para spots ilimitados."
- Second spot is NOT added

### 2. Test Coordinate Input

**Steps:**
1. Open extension popup (logged in as FREE or PREMIUM)
2. Click "📍 Os Meus Spots"
3. Click "📌 Adicionar por Coordenadas"
4. Enter:
   - Nome: "Praia do Norte"
   - Latitude: 39.602
   - Longitude: -9.070
5. Click "Guardar Spot"

**Expected Result:**
- Spot is successfully added with the provided coordinates
- Spot appears in the list with correct coordinates displayed

### 3. Test Invalid Coordinates

**Steps:**
1. Click "📌 Adicionar por Coordenadas"
2. Try invalid inputs:
   - Latitude: 95 (>90)
   - Longitude: -200 (<-180)
   - Non-numeric values: "abc"

**Expected Result:**
- Appropriate error messages for out-of-range or invalid coordinates
- Spot is NOT added

### 4. Test Spot Selection and Forecast

**Steps:**
1. Add a custom spot (if not already added)
2. Click on the custom spot in the "Os Meus Spots" list

**Expected Result:**
- Spot is highlighted with blue border
- Forecast data loads for that spot location
- Spot name appears in the header
- Mare, Ondas, Vento, and Solunar data are displayed

### 5. Test Spot Removal

**Steps:**
1. In the "Os Meus Spots" list, click the "✕" button next to a spot
2. Confirm the removal in the dialog

**Expected Result:**
- Spot is removed from the list
- Success message appears
- Spot no longer appears in the list

### 6. Test PREMIUM User (Unlimited Spots)

**Setup:**
1. Create a FREE account
2. Click "Upgrade" and complete the Stripe checkout process
3. Return to extension after payment

**Steps:**
1. Click "📍 Os Meus Spots"
2. Add multiple spots (try adding 5+ spots)
3. Each time, click "🗺️ Adicionar no Mapa" or "📌 Adicionar por Coordenadas"

**Expected Result:**
- All spots are successfully added
- No limit warning appears
- All spots appear in the list
- Each spot can be selected to view its forecast

### 7. Test Map Interaction

**Steps:**
1. Click "🗺️ Adicionar no Mapa"
2. Verify map displays centered on Portugal
3. Click different locations on the map
4. Observe that:
   - A marker appears at clicked location
   - Lat/Lng coordinates update in the display
   - Marker moves when clicking a new location

**Expected Result:**
- Map is interactive and responsive
- Coordinates are accurate to 6 decimal places
- Marker placement is precise

### 8. Test Persistence

**Steps:**
1. Add custom spots
2. Close the extension popup
3. Reopen the extension popup
4. Click "📍 Os Meus Spots"

**Expected Result:**
- All previously added spots are still there
- Spots load from the backend correctly

### 9. Test Unauthenticated Access

**Steps:**
1. Log out or use extension without logging in
2. Click "📍 Os Meus Spots"

**Expected Result:**
- Message appears: "Faz login para gerir os teus spots"
- No add buttons are functional

### 10. Test Mixed Predefined and Custom Spots

**Steps:**
1. Use the regular spot dropdown to select a predefined spot (e.g., "Ericeira")
2. View forecast for that spot
3. Now select a custom spot from "Os Meus Spots"
4. View forecast for custom spot
5. Switch back to predefined spot

**Expected Result:**
- Both types of spots work seamlessly
- Forecasts load correctly for both
- UI updates appropriately for each selection

## API Testing (Backend)

### Test Custom Spots API Endpoints

Using curl or Postman:

```bash
# Get custom spots (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5005/api/spots/personalizados

# Add custom spot (FREE user - first spot)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Test Spot","lat":38.5,"lng":-9.0}' \
  http://localhost:5005/api/spots/personalizados

# Try to add second spot as FREE user (should fail)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Second Spot","lat":39.0,"lng":-8.5}' \
  http://localhost:5005/api/spots/personalizados

# Remove custom spot
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5005/api/spots/personalizados/1000

# Get forecast for custom spot
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5005/api/previsao?spotId=1000&lat=38.5&lng=-9.0"

# Get forecast using only coordinates
curl "http://localhost:5005/api/previsao?lat=38.5&lng=-9.0"
```

## Validation Checklist

- [ ] FREE users can add exactly 1 custom spot
- [ ] PREMIUM users can add unlimited custom spots
- [ ] Coordinate validation works correctly
- [ ] Map interaction is smooth and responsive
- [ ] Spot selection loads correct forecast data
- [ ] Spot removal works correctly
- [ ] Spots persist across sessions
- [ ] UI updates correctly for different user states
- [ ] Error messages are clear and helpful
- [ ] No console errors in browser
- [ ] Backend API endpoints respond correctly
- [ ] Authentication is properly enforced
- [ ] No security vulnerabilities (CodeQL passed)

## Known Limitations

1. Map requires internet connection to load tiles from OpenStreetMap
2. Forecast APIs require the spot coordinates to be valid locations
3. Custom spot IDs start at 1000 to avoid conflicts with predefined spots (1-999)

## Troubleshooting

### Map doesn't load
- Check internet connection
- Verify Leaflet CDN is accessible
- Check browser console for errors

### Can't add spots
- Verify user is logged in
- Check if FREE user already has 1 spot
- Verify backend is running
- Check network tab for API errors

### Forecast doesn't load for custom spot
- Verify coordinates are within valid range
- Check if external forecast APIs are accessible
- Verify backend logs for API errors

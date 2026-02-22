# MetroNear — Detailed Product Requirements Document (PRD)

## 1. Product Overview

### 1.1 Product Name

MetroNear

### 1.2 Product Vision

MetroNear aims to simplify metro accessibility by automatically recommending the best metro station to reach a destination using real road travel distance and time.

The product removes the need for users to manually compare multiple metro stations across mapping applications.

### 1.3 Product Summary

MetroNear is a lightweight web application where users:

- Enter a destination in Bangalore.
- The system calculates road-based travel routes to nearby metro stations.
- Stations are ranked by travel time.
- The fastest station is recommended instantly.

### 1.4 Core Idea (One-Line Definition)

MetroNear answers: "Which metro station should I go to for this destination?"

## 2. Problem Statement

### 2.1 Current User Pain

When traveling to a destination via metro, users must:

- Search destination in Google Maps
- Manually check nearby metro stations
- Compare travel time to each station
- Decide which station is best

This process is repetitive and inefficient.

### 2.2 Limitations of Existing Solutions

| Platform | Limitation |
|----------|------------|
| Google Maps | Requires manual comparison between stations |
| Transit Apps | Designed for full journeys, not station optimization |
| Namma Metro App | Static information, no intelligent recommendation |

### 2.3 Opportunity

There is no dedicated tool that performs automatic metro station optimization using real-world travel routes.

## 3. Goals & Objectives

### 3.1 Primary Goals

- Automatically recommend best metro station
- Reduce decision-making time
- Provide accurate road-based results

### 3.2 Secondary Goals

- Improve commuting efficiency
- Provide intuitive visual experience
- Enable quick metro accessibility planning

### 3.3 Success Criteria

| Metric | Target |
|--------|--------|
| Recommendation accuracy | >95% vs Google Maps comparison |
| Result response time | < 3 seconds |
| User interaction steps | Single search |
| Mobile usability | Lighthouse score > 90 |

## 4. Target Users

| Segment | Needs |
|---------|-------|
| Daily commuters | Fast metro entry decisions |
| Students | Affordable travel planning |
| Office workers | Daily commute optimization |
| Tourists | Navigation assistance |
| Ride-share users | Cab/auto → metro transfers |

## 5. User Flow

1. User opens MetroNear website.
2. User enters destination in search bar.
3. Autocomplete suggests locations.
4. User selects destination.
5. Location converted to coordinates.
6. Nearby metro stations identified.
7. Road routes calculated.
8. Stations ranked by travel time.
9. Best station displayed with alternatives.

## 6. Functional Requirements

### 6.1 Location Search

- Autocomplete search input
- Accurate place suggestions
- Selection returns latitude & longitude

**APIs**
- Google Places Autocomplete OR
- LocationIQ Autocomplete

### 6.2 Metro Station Dataset

Static dataset containing:
- Station name
- Metro line
- Latitude
- Longitude

**Scope:**
- Operational Namma Metro stations
- Purple Line
- Green Line

**Stored as:**
- metro_stations.json

### 6.3 Nearby Station Filtering (Optimization Layer)

Before routing calculations:
- Compute straight-line distance (Haversine formula)
- Keep stations within 5 km radius

**Purpose:**
- Reduce API calls
- Improve performance
- Prevent rate-limit issues

### 6.4 Road Distance & ETA Calculation (Core Engine)

System sends coordinates to routing API.
Calculates:
- Road distance
- Travel time

**API:**
- OpenRouteService Matrix API

**Transport mode (MVP):**
- Walking (default)

### 6.5 Station Ranking Algorithm

Stations ranked using:
- **Primary Metric**
  - Travel time (minutes)
- **Secondary Metric**
  - Road distance (km)

**Algorithm:**
- Receive ETA for all nearby stations
- Sort ascending by travel time
- Select top 3 stations

**Output:**
- Recommended station
- Alternative options

### 6.6 Results Display

UI shows:
- 🏆 Recommended station (highlighted)
- Station name
- Metro line color
- Road distance
- Estimated travel time
- Alternative stations
- Map visualization

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Performance | <3 sec response |
| Reliability | Graceful API failure handling |
| Scalability | Support multi-city later |
| Accessibility | Mobile-first UI |
| Compatibility | Modern browsers |

## 8. Technical Architecture (MVP)

```
User Browser
     ↓
Frontend (HTML + JS)
     ↓
External APIs
   • Autocomplete API
   • OpenRouteService
     ↓
Static JSON Dataset
```

### 8.1 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript |
| Map | Leaflet.js |
| Map Tiles | OpenStreetMap |
| Routing | OpenRouteService |
| Data | Static JSON |
| Hosting | Vercel / GitHub Pages |

### 8.2 Architecture Decision Rationale

- Only ~60 stations → database unnecessary
- Client-side logic reduces complexity
- Static hosting enables fast deployment
- Free APIs minimize cost

## 9. Error Handling

| Scenario | Behavior |
|----------|----------|
| Destination outside Bangalore | Show supported-area message |
| Routing API failure | Fall back to straight-line distance |
| No nearby stations | Inform user clearly |
| Autocomplete fails | Allow retry |

## 10. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| API rate limits | Haversine pre-filter |
| API downtime | Fallback distance |
| Dataset outdated | Manual JSON update |
| Coordinate errors | Verify via Google Maps |

## 11. Data Sources

Metro station coordinates sourced from:
- Wikipedia station lists
- Google Maps verification
- Dataset maintained manually.

## 12. Future Enhancements (Phase 2+)

| Feature | Description |
|---------|-------------|
| GPS input | Use current location |
| Map click input | Select destination directly |
| Metro route planner | Station-to-station routing |
| Traffic-aware ETA | Real-time traffic |
| Multi-city support | Delhi, Hyderabad, Chennai |
| AI optimization | Predict best station using patterns |
| Voice search | Speech-based input |
| PWA | Installable mobile app |

## 13. Competitive Advantage

| Feature | MetroNear | Google Maps |
|---------|-----------|-------------|
| Automatic station selection | ✅ | ❌ |
| Metro-specific optimization | ✅ | ❌ |
| Real road distance ranking | ✅ | Partial |
| Single-purpose simplicity | ✅ | ❌ |

MetroNear focuses on one decision and solves it better.

## 14. MVP Development Timeline

| Week | Work |
|------|------|
| Week 1 | Dataset + Map + Search |
| Week 2 | Routing API integration |
| Week 3 | Ranking + UI |
| Week 4 | Testing + Deployment |

## 15. Legal & Compliance Considerations

### 15.1 API Usage Rights

MetroNear MVP is intended for educational and demonstration purposes and complies with OpenRouteService free-tier licensing.

Commercial usage may require paid plans, but current scope is non-commercial.

### 15.2 Attribution Requirements

App includes required attribution:

© OpenStreetMap contributors
Routing powered by OpenRouteService

This satisfies license requirements for OSM-based services.

## 16. Dataset Maintenance Strategy

### 16.1 Current Approach (MVP)

- Static metro_stations.json dataset
- Manual updates when new stations open
- Coordinates verified via official Namma Metro sources and Google Maps
- Small dataset (~60 stations) makes manual maintenance feasible (<5 minutes per update)

### 16.2 Future Scalability (Phase 2+)

- Backend database for auto-updates
- Public transport API integration
- Auto-sync with official metro data

## 17. Feature Prioritization

### 17.1 MVP Scope

- Destination-based search only
- GPS input deferred to Phase 2
- Focus on core recommendation engine

### 17.2 Phase 2 Features

- GPS-based current location detection
- Enhanced mobile experience
- Advanced routing options (traffic-aware, multi-modal)

## 18. Portfolio Value

This project demonstrates:

- Geospatial computation
- API orchestration
- Optimization logic
- Real-world system design
- Performance-aware engineering
- Legal compliance awareness

✅ PRD Status

Version: 1.1
Product: MetroNear
Type: MVP Product Requirements Document
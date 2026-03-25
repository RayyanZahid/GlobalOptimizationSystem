# GOS — The Impossible Feature: LinkedIn-to-Footprint Pipeline

## The Pitch
"Paste your LinkedIn and we'll show you your material footprint in 10 seconds."
Nobody has ever turned a LinkedIn URL into a material footprint. Every data point sourced and cited — not AI hallucination.

## Prerequisites
- [ ] Firecrawl API key
- [ ] Test LinkedIn URL (your own profile for demo)

---

## Phase 1: Firecrawl Data Pipeline

### 1.1 LinkedIn Profile Scrape
- [ ] Create `/api/linkedin-scan` route
- [ ] Firecrawl the LinkedIn URL → extract:
  - Name, headline, current job title
  - Current company
  - Location (city, state)
  - Industry
  - Education (university)
  - Job history (for lifetime accumulation estimate)
- [ ] Parse into structured `ProfileSignals` type

### 1.2 Company ESG Cascade
- [ ] From company name → Firecrawl company website / ESG report
  - Scope 1/2/3 emissions
  - Employee count
  - Per-employee work attribution (tonnes CO2e/yr)
- [ ] Fallback: industry-average ESG data if no report found

### 1.3 Salary Estimation Cascade
- [ ] From job title + company + location → Firecrawl levels.fyi or Glassdoor
  - Median compensation for role/metro
  - Better income estimate than Census median
- [ ] Fallback: Census ACS median for zip code (already have this)

### 1.4 Location Enrichment (already partially built)
- [ ] IP geolocation → lat/lon (already have)
- [ ] Census ACS data (already have: income, housing, commute, heating)
- [ ] Open-Meteo weather API (NEW) → heating/cooling degree days → energy demand
- [ ] Local utility grid mix via Firecrawl (more accurate than eGRID averages)

### 1.5 Client-Side Passive Signals (NEW)
- [ ] Collect from browser (no permissions needed):
  - `navigator.hardwareConcurrency` — CPU cores → device class
  - `navigator.deviceMemory` — RAM → device tier
  - `navigator.maxTouchPoints` — desktop vs mobile
  - `navigator.language` / `navigator.languages` — diet pattern signal
  - `screen.width/height` + `devicePixelRatio` — device class
  - `navigator.platform` / User-Agent — OS/device
  - `Intl.DateTimeFormat().resolvedOptions().timeZone`
  - `navigator.connection?.effectiveType` — connectivity
- [ ] Send as `ClientSignals` payload with the LinkedIn URL
- [ ] Use device signals as income proxy / consumption correlate

---

## Phase 2: Enhanced Estimation Engine

### 2.1 New Signal Types
- [ ] `EmployerProfile` — ESG data, employee count, industry
- [ ] `SalaryEstimate` — role/company/metro compensation
- [ ] `WeatherProfile` — HDD/CDD from Open-Meteo
- [ ] `DeviceSignals` — client-side hardware/browser data
- [ ] `DietInference` — from Accept-Language / regional patterns

### 2.2 Updated Computation
- [ ] Integrate employer work-attribution into footprint
- [ ] Use salary estimate (when available) over Census median
- [ ] Add weather-based HVAC energy calculation
- [ ] Add device ownership footprint (from device signals)
- [ ] Add Accept-Language → regional diet model
- [ ] Confidence scoring: each signal source adds to confidence %

---

## Phase 3: The Reveal UI

### 3.1 LinkedIn Input Page
- [ ] New page or mode: paste LinkedIn URL input
- [ ] "GO" button triggers the cascade
- [ ] Alternative: social login (LinkedIn OAuth) for one-click

### 3.2 Streaming Dossier Animation
- [ ] Each data source appears as a line item, streaming in real-time:
  ```
  Reading profile...                          [check]
    Jordan Toledo — Software Engineer
    Austin, TX

  Researching employer...                     [check]
    [Company] — 2024 ESG Report found
    Your work attribution: 3.75 t/yr

  Estimating compensation...                  [check]
    SWE in Austin: $152,000 median

  Analyzing location...                       [check]
    Grid: ERCOT — 0.39 kg CO2/kWh
    Climate: HIGH cooling demand
    Housing: house (5.8 rooms median)
    Commute: 78% drive alone
  ```
- [ ] Each line animates in with a slight delay (typewriter / fade-in)
- [ ] Sources cited inline as data arrives
- [ ] Confidence meter fills as signals accumulate (0% → 84%)

### 3.3 The Punchline
- [ ] Final reveal: silhouette fills with elements
- [ ] Big number: "YOUR MATERIAL FOOTPRINT: 87.6 tonnes/yr"
- [ ] The kicker line: "You weigh 75 kg. You MOVE 87,600 kg/yr. That's 1,168x your body weight."
- [ ] Planetary boundary badge: "2.8x over limit"
- [ ] All sources listed at bottom

### 3.4 Transition to Dashboard
- [ ] "Explore your elements" button → goes to existing dashboard
- [ ] All inferred data pre-populates the profile (no quiz needed)
- [ ] Confidence is already 70-85% before they answer a single question

---

## Phase 4: Product Scanner Upgrade (if time)
- [ ] When user types a product name, Firecrawl:
  - Manufacturer's sustainability report (e.g., Apple Environment page)
  - iFixit teardown data for actual component weights
  - Real bill of materials instead of Claude guessing
- [ ] Claude synthesizes real data instead of hallucinating estimates

---

## Demo Script
1. Open the app — landing page
2. "Let me show you what this can do." Paste LinkedIn URL.
3. Watch the dossier build in real-time (10-15 seconds)
4. Hit them with the punchline number
5. "Every data point you just saw is real, sourced, cited. Zero questions asked."
6. Slide into the dashboard — "Now let's explore what you're made of."
7. Scale slider: person → city → country → planet
8. Product scanner: "What about your phone?" → real teardown data
9. Swap marketplace: "What if you changed one thing?"
10. What-If simulator: "What if a billion people did this?"

## The Line
"Carbon calculators ask you 50 questions and give you one number. We ask you zero questions and show you every atom."

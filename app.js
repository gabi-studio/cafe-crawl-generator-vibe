// app.js - Vanilla JS Cafe Crawl Generator

// Add Google Fonts for whimsy
const head = document.querySelector('head');
const quicksand = document.createElement('link');
quicksand.rel = 'stylesheet';
quicksand.href = 'https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@400;600&display=swap';
head.appendChild(quicksand);

const defaultCenter = { lat: 43.6532, lng: -79.3832 }; // Toronto
const funInstructions = [
  "Order something you've never tried before!",
  "Ask the barista for their favorite pastry.",
  "Take a selfie with your drink.",
  "Compliment someone at the cafe.",
  "Try a non-coffee beverage at this stop!",
  "Take some time to read a book or sketch.",
  "Chat with a stranger about their favorite cafe."
];

let map, placesService, directionsService, directionsRenderer;
let cafes = [];

function getRandomInstructions(index) {
  return funInstructions[index % funInstructions.length];
}

function initMap(center = defaultCenter) {
  map = new google.maps.Map(document.getElementById("map"), {
    center,
    zoom: 15,
  });
  placesService = new google.maps.places.PlacesService(map);
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  map.addListener("click", (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    map.setCenter({ lat, lng });
    fetchCafes({ lat, lng });
  });

  // Enable the button now that the map is ready
  document.getElementById("generateBtn").disabled = false;
}

function fetchCafes(center) {
  // Safety: ensure map and center are valid
  if (!map) {
    alert("Map is not initialized yet.");
    return;
  }
  if (!center) {
    const mapCenter = map.getCenter();
    if (!mapCenter) {
      alert("Map center is not available.");
      return;
    }
    center = mapCenter.toJSON();
  }
  const numStops = parseInt(document.getElementById("numStops").value, 10);
  const radius = parseInt(document.getElementById("radius").value, 10);
  document.getElementById("generateBtn").disabled = true;
  document.getElementById("generateBtn").textContent = "Generating...";
  document.getElementById("itinerary").innerHTML = "";

  const cafeTypes = [
    "cafe",
    "coffee_shop",
    "bakery",
    "tea_house",
    "cat_cafe",
    "dog_cafe",
    "acai_shop",
    "bagel_shop",
    "brunch_restaurant",
    "breakfast_restaurant",
    "dessert_shop",
    "dessert_restaurant",
    "juice_shop",
    "chocolate_shop",
    "confectionery",
    "deli",
    "donut_shop",
    "ice_cream_shop"
    // Optionally include: cafeteria, wine_bar, bar, pub
  ];
  const request = {
    location: center,
    radius,
    type: cafeTypes,
  };

  placesService.nearbySearch(request, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
      // Filter cafes with at least 4 stars
      const filtered = results.filter(cafe => cafe.rating && cafe.rating >= 4);
      if (filtered.length === 0) {
        alert("No cafes with 4+ stars found in this area.");
        document.getElementById("generateBtn").disabled = false;
        document.getElementById("generateBtn").textContent = "Generate Crawl";
        return;
      }
      // Shuffle and pick random cafes
      const shuffled = filtered.sort(() => 0.5 - Math.random());
      cafes = shuffled.slice(0, numStops);
      renderMarkers();
      if (cafes.length > 1) {
        buildRoute();
      } else {
        document.getElementById("generateBtn").disabled = false;
        document.getElementById("generateBtn").textContent = "Generate Crawl";
      }
      renderItinerary();
    } else {
      alert("No cafes found in this area.");
      document.getElementById("generateBtn").disabled = false;
      document.getElementById("generateBtn").textContent = "Generate Crawl";
    }
  });
}

function renderMarkers() {
  // Remove previous markers by re-rendering the map
  directionsRenderer.set('directions', null);
  cafes.forEach((cafe, idx) => {
    new google.maps.Marker({
      map,
      position: cafe.geometry.location,
      label: `${idx + 1}`,
    });
  });
}

function buildRoute() {
  const waypoints = cafes.slice(1, -1).map(cafe => ({
    location: cafe.geometry.location,
    stopover: true,
  }));
  directionsService.route(
    {
      origin: cafes[0].geometry.location,
      destination: cafes[cafes.length - 1].geometry.location,
      waypoints,
      travelMode: google.maps.TravelMode.WALKING,
    },
    (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
      }
      document.getElementById("generateBtn").disabled = false;
      document.getElementById("generateBtn").textContent = "Generate Crawl";
    }
  );
}

function renderItinerary() {
  const itinerary = document.getElementById("itinerary");
  if (!cafes.length) {
    itinerary.classList.remove('visible');
    itinerary.innerHTML = '';
    return;
  }
  itinerary.classList.add('visible');
  // Build itinerary text for copy
  const crawlText = cafes.map((cafe, idx) => `${idx + 1}. ${cafe.name} — ${cafe.vicinity} (${cafe.rating ? cafe.rating + '★' : 'No rating'})\n  - ${getRandomInstructions(idx)}`).join("\n");

  // Google Maps directions URL
  let gmapsUrl = '';
  if (cafes.length > 1) {
    const waypoints = cafes.slice(1, -1).map(cafe => `${cafe.geometry.location.lat()},${cafe.geometry.location.lng()}`).join('|');
    gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${cafes[0].geometry.location.lat()},${cafes[0].geometry.location.lng()}&destination=${cafes[cafes.length-1].geometry.location.lat()},${cafes[cafes.length-1].geometry.location.lng()}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=walking`;
  }

  itinerary.innerHTML = `
    <button class="refresh-btn" id="refreshBtn">🔄 New Suggestions</button>
    <button class="copy-btn" id="copyBtn">📋 Copy Itinerary</button>
    ${gmapsUrl ? `<a href="${gmapsUrl}" target="_blank" class="gmaps-btn" id="gmapsBtn">🗺️ Open in Google Maps</a>` : ''}
    <h2>Your Cafe Crawl Itinerary</h2>
    <ol>${cafes
      .map(
        (cafe, idx) =>
          `<li><strong>${cafe.name}</strong> — ${cafe.vicinity} ${cafe.rating ? `(${cafe.rating}★)` : ''}<div class="inst">${getRandomInstructions(idx)}</div></li>`
      )
      .join("")}</ol>
  `;

  // Copy to clipboard
  document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(crawlText).then(() => {
      document.getElementById('copyBtn').textContent = '✅ Copied!';
      setTimeout(() => {
        document.getElementById('copyBtn').textContent = '📋 Copy Itinerary';
      }, 1200);
    });
  };

  // Refresh suggestions
  document.getElementById('refreshBtn').onclick = () => {
    // Just call fetchCafes with the current center
    fetchCafes();
  };
}

window.onload = () => {
  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  let night = false;
  themeBtn.onclick = () => {
    night = !night;
    document.body.classList.toggle('nightmode', night);
    themeBtn.textContent = night ? '☀️ Light Mode' : '🌙 Night Mode';
  };

  // Dynamically load Google Maps API with callback to initMap
  const script = document.createElement('script');
  script.src =
    'https://maps.googleapis.com/maps/api/js?key=AIzaSyDeQYgbR6zhrVpfpPQISPE4qetMO7fF2Yk&libraries=places&callback=initMap';
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);

  // Style and group controls
  const controlsDiv = document.querySelector('.controls');
  controlsDiv.innerHTML = '';

  // Top group: stops, radius, generate button
  const topGroup = document.createElement('div');
  topGroup.className = 'top-group';

  const stopsLabel = document.createElement('label');
  stopsLabel.textContent = 'Stops:';
  const stopsInput = document.createElement('input');
  stopsInput.type = 'number';
  stopsInput.id = 'numStops';
  stopsInput.min = 3;
  stopsInput.max = 5;
  stopsInput.value = 4;
  stopsLabel.appendChild(stopsInput);
  topGroup.appendChild(stopsLabel);

  const radiusLabel = document.createElement('label');
  radiusLabel.textContent = 'Radius (meters):';
  const radiusInput = document.createElement('input');
  radiusInput.type = 'number';
  radiusInput.id = 'radius';
  radiusInput.min = 500;
  radiusInput.max = 3000;
  radiusInput.step = 100;
  radiusInput.value = 1000;
  radiusLabel.appendChild(radiusInput);
  topGroup.appendChild(radiusLabel);

  const genBtn = document.createElement('button');
  genBtn.id = 'generateBtn';
  genBtn.textContent = 'Generate Crawl';
  topGroup.appendChild(genBtn);

  controlsDiv.appendChild(topGroup);

  // Address group
  const addressGroup = document.createElement('div');
  addressGroup.className = 'field-group';
  const addressInput = document.createElement('input');
  addressInput.type = 'text';
  addressInput.id = 'addressInput';
  addressInput.placeholder = 'Enter address...';
  addressGroup.appendChild(addressInput);
  const addressBtn = document.createElement('button');
  addressBtn.textContent = 'Use Address';
  addressGroup.appendChild(addressBtn);
  controlsDiv.appendChild(addressGroup);

  // Geolocation group
  const geoGroup = document.createElement('div');
  geoGroup.className = 'field-group';
  const geoBtn = document.createElement('button');
  geoBtn.textContent = 'Use My Location';
  geoGroup.appendChild(geoBtn);
  controlsDiv.appendChild(geoGroup);

  // Event listeners
  genBtn.disabled = true;
  genBtn.addEventListener('click', () => fetchCafes());

  addressBtn.addEventListener('click', () => {
    const address = addressInput.value.trim();
    if (!address) {
      alert('Please enter an address.');
      return;
    }
    if (!window.google || !window.google.maps) {
      alert('Google Maps API not loaded yet.');
      return;
    }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        map.setCenter(loc);
        fetchCafes(loc.toJSON());
      } else {
        alert('Address not found.');
      }
    });
  });

  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    geoBtn.disabled = true;
    geoBtn.textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const loc = { lat, lng };
        map.setCenter(loc);
        fetchCafes(loc);
        geoBtn.disabled = false;
        geoBtn.textContent = 'Use My Location';
      },
      (err) => {
        alert('Unable to retrieve your location.');
        geoBtn.disabled = false;
        geoBtn.textContent = 'Use My Location';
      }
    );
  });
};

// Google Maps API will call window.initMap

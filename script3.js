
const API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

/* -----------------------------------------------------
   2. DOM REFERENCES
   ----------------------------------------------------- */
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchError = document.getElementById("searchError");
const loadingEl = document.getElementById("loading");

const weatherCard = document.getElementById("weatherCard");
const cityNameEl = document.getElementById("cityName");
const countryNameEl = document.getElementById("countryName");
const currentDateEl = document.getElementById("currentDate");
const currentTimeEl = document.getElementById("currentTime");
const weatherIconEl = document.getElementById("weatherIcon");
const temperatureEl = document.getElementById("temperature");
const feelsLikeEl = document.getElementById("feelsLike");
const weatherDescriptionEl = document.getElementById("weatherDescription");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("windSpeed");
const pressureEl = document.getElementById("pressure");
const visibilityEl = document.getElementById("visibility");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");

const extraDetails = document.getElementById("extraDetails");
const maxTempEl = document.getElementById("maxTemp");
const minTempEl = document.getElementById("minTemp");
const cloudPercentEl = document.getElementById("cloudPercent");
const uvIndexEl = document.getElementById("uvIndex");

const forecastSection = document.getElementById("forecastSection");
const forecastGrid = document.getElementById("forecastGrid");

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

let clockInterval = null;

/* -----------------------------------------------------
   3. UTILITIES
   ----------------------------------------------------- */

// Converts a unix timestamp (seconds) + timezone offset (seconds) into a Date object
function toLocalTime(unixSeconds, timezoneOffsetSeconds) {
  return new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
}

function formatTime(date) {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDay(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getUTCDay()];
}

function showLoading() {
  loadingEl.classList.add("show");
  weatherCard.classList.remove("show");
  extraDetails.classList.remove("show");
  forecastSection.classList.remove("show");
}

function hideLoading() {
  loadingEl.classList.remove("show");
}

function showError(message) {
  searchError.textContent = message;
}

function clearError() {
  searchError.textContent = "";
}

/* -----------------------------------------------------
   4. LIVE CLOCK FOR SELECTED CITY
   ----------------------------------------------------- */
function startCityClock(timezoneOffsetSeconds) {
  if (clockInterval) clearInterval(clockInterval);

  function tick() {
    const now = new Date();
    const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
    const cityDate = new Date(utcMillis + timezoneOffsetSeconds * 1000);

    currentTimeEl.textContent = cityDate.toLocaleTimeString("en-US", { hour12: true });
    currentDateEl.textContent = cityDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  tick();
  clockInterval = setInterval(tick, 1000);
}

/* -----------------------------------------------------
   5. RENDER FUNCTIONS
   ----------------------------------------------------- */
function renderCurrentWeather(data) {
  cityNameEl.textContent = data.name;
  countryNameEl.textContent = data.sys.country;

  weatherIconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  weatherIconEl.alt = data.weather[0].description;

  temperatureEl.textContent = `${Math.round(data.main.temp)}°C`;
  feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}°C`;
  weatherDescriptionEl.textContent = data.weather[0].description;

  humidityEl.textContent = `${data.main.humidity}%`;
  windSpeedEl.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
  pressureEl.textContent = `${data.main.pressure} hPa`;
  visibilityEl.textContent = `${(data.visibility / 1000).toFixed(1)} km`;

  const sunrise = toLocalTime(data.sys.sunrise, data.timezone);
  const sunset = toLocalTime(data.sys.sunset, data.timezone);
  sunriseEl.textContent = formatTime(sunrise);
  sunsetEl.textContent = formatTime(sunset);

  maxTempEl.textContent = `${Math.round(data.main.temp_max)}°C`;
  minTempEl.textContent = `${Math.round(data.main.temp_min)}°C`;
  cloudPercentEl.textContent = `${data.clouds.all}%`;
  uvIndexEl.textContent = "--"; // Requires a separate One Call API request; left as optional

  startCityClock(data.timezone);

  weatherCard.classList.add("show");
  extraDetails.classList.add("show");
}

function renderForecast(forecastList) {
  forecastGrid.innerHTML = "";

  // The 5-day/3-hour API returns 40 entries (every 3 hours).
  // Pick one entry per day, closest to midday, for a clean 5-day summary.
  const dailyData = {};

  forecastList.forEach((entry) => {
    const date = entry.dt_txt.split(" ")[0];
    const hour = entry.dt_txt.split(" ")[1];

    if (!dailyData[date] || hour === "12:00:00") {
      dailyData[date] = entry;
    }
  });

  const days = Object.keys(dailyData).slice(0, 5);

  days.forEach((day) => {
    const entry = dailyData[day];
    const dateObj = new Date(entry.dt_txt.replace(" ", "T"));

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <p class="forecast-day">${formatDay(dateObj)}</p>
      <img src="https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png" alt="${entry.weather[0].description}" />
      <p class="forecast-temp">${Math.round(entry.main.temp)}°C</p>
      <p class="forecast-desc">${entry.weather[0].description}</p>
    `;
    forecastGrid.appendChild(card);
  });

  forecastSection.classList.add("show");
}

/* -----------------------------------------------------
   6. API CALLS (Fetch + Async/Await + Error Handling)
   ----------------------------------------------------- */
async function fetchWeatherData(city) {
  if (!API_KEY || API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
    showError("Please add your OpenWeatherMap API key in script.js to enable live data.");
    return;
  }

  clearError();
  showLoading();

  try {
    const currentResponse = await fetch(
      `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
    );

    if (!currentResponse.ok) {
      if (currentResponse.status === 404) {
        throw new Error("City not found. Please check the spelling and try again.");
      }
      throw new Error("Something went wrong while fetching weather data.");
    }

    const currentData = await currentResponse.json();

    const forecastResponse = await fetch(
      `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
    );

    if (!forecastResponse.ok) {
      throw new Error("Unable to load the 5-day forecast right now.");
    }

    const forecastData = await forecastResponse.json();

    renderCurrentWeather(currentData);
    renderForecast(forecastData.list);
  } catch (error) {
    // Distinguish a network failure from an API/validation error
    if (error instanceof TypeError) {
      showError("No internet connection. Please check your network and try again.");
    } else {
      showError(error.message);
    }
    weatherCard.classList.remove("show");
    extraDetails.classList.remove("show");
    forecastSection.classList.remove("show");
  } finally {
    hideLoading();
  }
}

/* -----------------------------------------------------
   7. EVENT LISTENERS
   ----------------------------------------------------- */
searchForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const city = cityInput.value.trim();

  if (!city) {
    showError("Please enter a city name.");
    return;
  }

  fetchWeatherData(city);
});

/* -----------------------------------------------------
   8. DARK MODE TOGGLE
   ----------------------------------------------------- */
function loadTheme() {
  const savedTheme = localStorage.getItem("weatherapp_theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeIcon.textContent = "☀️";
  }
}

themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("weatherapp_theme", isDark ? "dark" : "light");
});

/* -----------------------------------------------------
   9. INITIALIZATION
   ----------------------------------------------------- */
function init() {
  loadTheme();
  fetchWeatherData("London"); // Default city shown on first load
}

init();
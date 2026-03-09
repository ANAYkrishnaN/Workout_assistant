/**
 * Weather for hydration: OpenWeather when NEXT_PUBLIC_OPENWEATHER_API_KEY exists,
 * else Open-Meteo (no key). Try/catch for all calls.
 */

/**
 * Fetch current temp (°C) and humidity (%) for hydration.
 * Uses OpenWeather when NEXT_PUBLIC_OPENWEATHER_API_KEY exists (by city or lat/lon);
 * else Open-Meteo by lat/lon. Try/catch on all calls.
 * @param {{ city?: string, latitude?: number, longitude?: number }} options
 * @returns {Promise<{ temperature: number, humidity: number } | null>}
 */
export async function fetchWeatherForHydration(options = {}) {
    const apiKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY : undefined;
    const { city, latitude, longitude } = options;

    if (apiKey) {
        try {
            let url;
            if (city && String(city).trim()) {
                url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(String(city).trim())}&appid=${apiKey}&units=metric`;
            } else if (latitude != null && longitude != null) {
                url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
            } else {
                return null;
            }
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            const temp = data?.main?.temp;
            const humidity = data?.main?.humidity;
            if (temp == null || humidity == null) return null;
            return {
                temperature: Math.round(Number(temp)),
                humidity: Math.round(Number(humidity)),
            };
        } catch (e) {
            console.warn("OpenWeather fetch error:", e);
            return null;
        }
    }

    if (latitude != null && longitude != null) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            const temp = data?.current?.temperature_2m;
            const humidity = data?.current?.relative_humidity_2m;
            if (temp == null || humidity == null) return null;
            return {
                temperature: Math.round(Number(temp)),
                humidity: Math.round(Number(humidity)),
            };
        } catch (e) {
            console.warn("Open-Meteo fetch error:", e);
            return null;
        }
    }

    return null;
}

export default fetchWeatherForHydration;

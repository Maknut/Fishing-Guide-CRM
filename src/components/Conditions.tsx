// Weather readout for a trip day: one-line forecast plus temperature, wind and rain.
import { CloudRain, Thermometer, Wind } from "lucide-react";
import type { WeatherSnapshot } from "@/lib/weather";
import { tempRange, windText } from "@/lib/conditions";

export function Conditions({ weather }: { weather: WeatherSnapshot }) {
  const temp = tempRange(weather), wind = windText(weather);
  return (
    <div>
      {weather.shortForecast && <p className="cond-summary">{weather.shortForecast}</p>}
      <div className="conditions">
        {temp && (
          <div className="cond">
            <div className="k"><Thermometer size={14} aria-hidden="true" />{weather.tempLow != null && weather.tempHigh != null ? "Low, high" : "Temp"}</div>
            <div className="v">{temp}<small>F</small></div>
          </div>
        )}
        {wind && (
          <div className="cond">
            <div className="k"><Wind size={14} aria-hidden="true" />Wind</div>
            <div className="v">{wind} <small>mph</small></div>
          </div>
        )}
        <div className="cond">
          <div className="k"><CloudRain size={14} aria-hidden="true" />Rain</div>
          <div className="v">{weather.precipPct ?? 0}<small>%</small></div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';

import {
  Search,
  Mic,
  RotateCw,
  Bell,
  User,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  Calendar,
  Moon
} from 'lucide-react';

export default function Header({ pageTitle, onRefresh, isRefreshing }) {

  // ============================================================
  // DATE & TIME
  // ============================================================

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = currentDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });


  // ============================================================
  // SEARCH
  // ============================================================

  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);


  // ============================================================
  // WEATHER STATE
  // ============================================================

  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);


  // ============================================================
  // FETCH REAL WEATHER
  // ============================================================

  const fetchWeather = async () => {

    try {

      setWeatherLoading(true);
      setWeatherError(false);

      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/weather/current'
      );

      if (!response.ok) {
        throw new Error(
          `Weather API returned ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.data) {
        throw new Error(
          'Invalid weather response'
        );
      }

      setWeather(result.data);

    } catch (error) {

      console.error(
        'Unable to fetch weather:',
        error
      );

      setWeatherError(true);

    } finally {

      setWeatherLoading(false);

    }
  };


  // ============================================================
  // INITIAL WEATHER LOAD + AUTO REFRESH
  // ============================================================

  useEffect(() => {

    fetchWeather();

    // Refresh weather every 10 minutes
    const weatherTimer = setInterval(() => {
      fetchWeather();
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(weatherTimer);
    };

  }, []);


  // ============================================================
  // WEATHER ICON
  // ============================================================

  const getWeatherIcon = () => {

    // Loading state
    if (weatherLoading) {

      return (
        <CloudSun
          className="
            w-5
            h-5
            text-[#A3B18A]
            animate-pulse
          "
        />
      );

    }


    // Error state
    if (weatherError || !weather) {

      return (
        <Cloud
          className="
            w-5
            h-5
            text-[#7A8F59]
          "
        />
      );

    }


    const code = weather.weather_code;
    const isDay = weather.is_day === 1;


    // Clear sky
    if (code === 0) {

      if (!isDay) {

        return (
          <Moon
            className="
              w-5
              h-5
              text-[#6366F1]
            "
          />
        );

      }

      return (
        <Sun
          className="
            w-5
            h-5
            text-[#EAB308]
          "
        />
      );

    }


    // Mainly clear / partly cloudy
    if (
      code === 1 ||
      code === 2
    ) {

      return (
        <CloudSun
          className="
            w-5
            h-5
            text-[#EAB308]
          "
        />
      );

    }


    // Overcast
    if (code === 3) {

      return (
        <Cloud
          className="
            w-5
            h-5
            text-[#7A8F59]
          "
        />
      );

    }


    // Fog
    if (
      code === 45 ||
      code === 48
    ) {

      return (
        <Cloud
          className="
            w-5
            h-5
            text-[#94A3B8]
          "
        />
      );

    }


    // Drizzle / rain
    if (
      (code >= 51 && code <= 67) ||
      (code >= 80 && code <= 82)
    ) {

      return (
        <CloudRain
          className="
            w-5
            h-5
            text-[#4F8CC9]
          "
        />
      );

    }


    // Thunderstorm
    if (
      code >= 95
    ) {

      return (
        <CloudLightning
          className="
            w-5
            h-5
            text-[#6366F1]
          "
        />
      );

    }


    // Default
    return (
      <CloudSun
        className="
          w-5
          h-5
          text-[#EAB308]
        "
      />
    );
  };


  // ============================================================
  // WEATHER TEMPERATURE
  // ============================================================

  const temperature =
    weather?.temperature !== undefined
      ? Math.round(weather.temperature)
      : '--';


  // ============================================================
  // VOICE SEARCH
  // ============================================================

  const handleVoiceSearch = () => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

      alert(
        'Voice search is not supported in this browser. Please use Google Chrome or Microsoft Edge.'
      );

      return;
    }


    const recognition =
      new SpeechRecognition();

    recognition.lang = 'en-IN';

    recognition.continuous = false;

    recognition.interimResults = false;


    recognition.onstart = () => {

      console.log(
        'Agro-Buddy voice search started'
      );

      setIsListening(true);

    };


    recognition.onresult = (event) => {

      const transcript =
        event.results[0][0].transcript;

      console.log(
        'Voice search:',
        transcript
      );

      setSearchQuery(transcript);

    };


    recognition.onerror = (event) => {

      console.error(
        'Voice search error:',
        event.error
      );

      setIsListening(false);


      if (event.error === 'not-allowed') {

        alert(
          'Microphone permission was denied. Please allow microphone access in your browser settings.'
        );

      } else if (event.error === 'no-speech') {

        console.log(
          'No speech detected.'
        );

      } else {

        alert(
          'Unable to use the microphone. Please try again.'
        );

      }

    };


    recognition.onend = () => {

      console.log(
        'Agro-Buddy voice search ended'
      );

      setIsListening(false);

    };


    recognition.start();

  };


  // ============================================================
  // SEARCH SUBMIT
  // ============================================================

  const handleSearch = (event) => {

    event.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    console.log(
      'Agro-Buddy search:',
      searchQuery
    );

  };


  // ============================================================
  // UI
  // ============================================================

  return (

    <header
      className="
        bg-white
        border-b
        border-[#5B7B10]/15
        shadow-[0_2px_12px_rgba(54,78,0,0.06)]
        px-6
        py-3.5
        sticky
        top-0
        z-10
      "
    >

      <div
        className="
          flex
          items-center
          justify-between
          gap-6
        "
      >


        {/* ======================================================
            LEFT — PAGE TITLE
        ======================================================= */}

        <div className="min-w-[220px]">

          <h2
            className="
              text-2xl
              font-bold
              font-['Outfit']
              text-[#1F2E0A]
              tracking-tight
            "
          >
            {pageTitle}
          </h2>


          <div
            className="
              flex
              items-center
              gap-2
              mt-1
            "
          >

            {/* Green status dot */}

            <span
              className="
                w-2
                h-2
                rounded-full
                bg-[#22C55E]
                shadow-[0_0_0_3px_rgba(34,197,94,0.12)]
              "
            ></span>


            <span
              className="
                text-xs
                font-semibold
                text-[#5B7B10]
              "
            >
              State Agriculture Command Center
            </span>

          </div>

        </div>


        {/* ======================================================
            CENTER — SEARCH
        ======================================================= */}

        <form
          onSubmit={handleSearch}
          className="
            flex-1
            max-w-2xl
            hidden
            md:flex
            items-center
            relative
          "
        >

          <Search
            className="
              w-5
              h-5
              text-[#6B7C4B]
              absolute
              left-4
              pointer-events-none
            "
          />


          <input
            type="text"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search crop, mandi, district or ask a query..."
            className="
              w-full
              h-11
              bg-[#F8FAF3]
              border
              border-[#5B7B10]/20
              rounded-full
              pl-12
              pr-12
              text-sm
              text-[#1F2E0A]
              placeholder-[#7A8F59]
              shadow-sm
              focus:outline-none
              focus:ring-2
              focus:ring-[#5B7B10]/25
              focus:border-[#5B7B10]/40
              transition-all
            "
          />


          {/* Microphone */}

          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`
              absolute
              right-3
              p-1.5
              rounded-full
              transition-all

              ${
                isListening
                  ? 'text-red-500 bg-red-50 animate-pulse'
                  : 'text-[#7A8F59] hover:text-[#364E00] hover:bg-[#EEF3E3]'
              }
            `}
            aria-label="Voice search"
            title={
              isListening
                ? 'Listening...'
                : 'Voice search'
            }
          >

            <Mic
              className="
                w-5
                h-5
              "
            />

          </button>

        </form>


        {/* ======================================================
            RIGHT — WEATHER + DATE + CONTROLS
        ======================================================= */}

        <div
          className="
            flex
            items-center
            gap-5
          "
        >


          {/* Weather + Date */}

          <div
            className="
              hidden
              lg:flex
              flex-col
              items-end
            "
          >

            {/* Weather */}

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              {getWeatherIcon()}

              <span
                className="
                  text-sm
                  font-semibold
                  text-[#2A3B0F]
                "
              >
                {temperature}°C
              </span>

            </div>


            {/* Date + Time */}

            <div
              className="
                flex
                items-center
                gap-1.5
                mt-1
                text-xs
                text-[#6B7C4B]
              "
            >

              <Calendar
                className="
                  w-3.5
                  h-3.5
                  text-[#5B7B10]
                "
              />

              <span>
                {formattedDate}
              </span>

              <span className="text-[#5B7B10]/40">
                •
              </span>

              <span>
                {formattedTime}
              </span>

            </div>

          </div>


          {/* Divider */}

          <div
            className="
              hidden
              lg:block
              h-9
              w-px
              bg-[#5B7B10]/15
            "
          ></div>


          {/* Refresh */}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="
              p-2
              rounded-full
              text-[#5B7B10]
              hover:bg-[#EEF3E3]
              transition-colors
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
            aria-label="Refresh dashboard"
            title="Refresh"
          >

            <RotateCw
              className={`
                w-5
                h-5

                ${
                  isRefreshing
                    ? 'animate-spin'
                    : ''
                }
              `}
            />

          </button>


          {/* Notifications */}

          <button
            type="button"
            className="
              relative
              p-2
              rounded-full
              text-[#5B7B10]
              hover:bg-[#EEF3E3]
              transition-colors
            "
            aria-label="Notifications"
            title="Notifications"
          >

            <Bell
              className="
                w-5
                h-5
              "
            />

            <span
              className="
                absolute
                top-1.5
                right-1.5
                w-1.5
                h-1.5
                rounded-full
                bg-red-500
                border-2
                border-white
              "
            ></span>

          </button>


          {/* ==================================================
              USER PROFILE
          =================================================== */}

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <button
              type="button"
              className="
                flex
                items-center
                justify-center
                w-9
                h-9
                rounded-full
                bg-[#5B7B10]
                text-white
                hover:bg-[#4A670D]
                transition-colors
              "
              aria-label="User profile"
              title="Profile"
            >

              <User
                className="
                  w-5
                  h-5
                "
              />

            </button>


            <div
              className="
                hidden
                sm:flex
                flex-col
                leading-tight
              "
            >

              <span
                className="
                  text-xs
                  font-semibold
                  text-[#2A3B0F]
                "
              >
                BOARD ADMIN
              </span>

              <span
                className="
                  text-[10px]
                  text-[#7A8F59]
                "
              >
                Administrator
              </span>

            </div>

          </div>

        </div>

      </div>

    </header>
  );
}
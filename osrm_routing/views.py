import math
from datetime import datetime, timedelta, timezone

import requests
from geopy.distance import geodesic
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class OSRMRouteView(APIView):
    OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving/"
    WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

    SAMPLING_OPTIONS = (10, 25, 50)

    RISK_MAP = {
        "Low": 1,
        "Moderate": 2,
        "High": 3,
        "Severe": 4,
        "No Travel": 5,
        "Unknown": 6,
    }

    def post(self, request):
        start_coords = request.data.get("start")
        end_coords = request.data.get("end")

        try:
            load_weight = float(request.data.get("load_weight", 0))
            sampling_miles = float(
                request.data.get("sampling_miles", 25)
            )

            if not math.isfinite(load_weight) or load_weight < 0:
                raise ValueError(
                    "'load_weight' trebuie să fie pozitiv sau zero."
                )

            if (
                not math.isfinite(sampling_miles)
                or sampling_miles not in self.SAMPLING_OPTIONS
            ):
                raise ValueError(
                    "'sampling_miles' trebuie să fie 10, 25 sau 50."
                )

        except (TypeError, ValueError) as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_coords is None or end_coords is None:
            return Response(
                {
                    "error": (
                        "Câmpurile 'start' și 'end' sunt obligatorii. "
                        "Folosește formatul 'lng,lat' sau [lng, lat]."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_lng, start_lat = self.parse_coordinates(start_coords)
            end_lng, end_lat = self.parse_coordinates(end_coords)
            departure_time = self.parse_departure_time(
                request.data.get("departure_time")
            )
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sampling_km = sampling_miles * 1.609344

        osrm_url = (
            f"{self.OSRM_BASE_URL}"
            f"{start_lng},{start_lat};{end_lng},{end_lat}"
        )

        params = {
            "overview": "full",
            "geometries": "geojson",
            "alternatives": "3",
            "steps": "true",
        }

        try:
            response = requests.get(
                osrm_url,
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

        except requests.exceptions.Timeout:
            return Response(
                {"error": "Serverul OSRM nu a răspuns în 30 de secunde."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except requests.exceptions.RequestException as exc:
            return Response(
                {"error": f"Eroare la conectarea cu OSRM: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError:
            return Response(
                {"error": "Serverul OSRM a returnat un JSON invalid."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if data.get("code") != "Ok":
            return Response(
                {
                    "error": "OSRM nu a putut calcula ruta.",
                    "osrm_code": data.get("code"),
                    "details": data.get("message"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        osrm_routes = data.get("routes", [])

        if not osrm_routes:
            return Response(
                {"error": "OSRM nu a returnat nicio rută."},
                status=status.HTTP_404_NOT_FOUND,
            )

        formatted_routes = []

        with requests.Session() as weather_session:
            for index, route in enumerate(osrm_routes):
                duration_secs = route["duration"]
                distance_meters = route["distance"]
                geometry = route.get("geometry", {})
                geojson_coords = geometry.get("coordinates", [])

                if not geojson_coords:
                    continue

                checkpoints, geometry_distance_km = (
                    self.build_checkpoints(
                        geojson_coords,
                        sampling_km,
                    )
                )

                for checkpoint in checkpoints:
                    distance_km = checkpoint.pop(
                        "_distance_from_start_km"
                    )

                    if geometry_distance_km > 0:
                        elapsed_secs = (
                            distance_km / geometry_distance_km
                        ) * duration_secs
                    else:
                        elapsed_secs = 0

                    checkpoint["eta_seconds_from_start"] = int(
                        elapsed_secs
                    )

                    checkpoint_time = departure_time + timedelta(
                        seconds=elapsed_secs
                    )

                    checkpoint["eta_formatted"] = (
                        checkpoint_time.strftime("%Y-%m-%d %H:%M UTC")
                    )

                    weather = self.get_weather(
                        session=weather_session,
                        lat=checkpoint["lat"],
                        lng=checkpoint["lng"],
                        target_time=checkpoint_time,
                    )

                    checkpoint["weather"] = weather
                    checkpoint["risk_level"] = self.calculate_risk(
                        wind=weather["wind_mph"],
                        rain=weather["rain_in_hr"],
                        snow=weather["snow_in_hr"],
                        load_weight=load_weight,
                    )

                severe_miles = 0.0
                high_miles = 0.0
                total_risk_score = 0
                max_route_risk = "Low"

                for cp_index, checkpoint in enumerate(checkpoints):
                    risk = checkpoint["risk_level"]
                    risk_score = self.RISK_MAP[risk]
                    total_risk_score += risk_score

                    if risk_score > self.RISK_MAP[max_route_risk]:
                        max_route_risk = risk

                    # Riscul checkpoint-ului se aplică segmentului
                    # până la următorul checkpoint.
                    if cp_index + 1 < len(checkpoints):
                        next_checkpoint = checkpoints[cp_index + 1]

                        segment_miles = max(
                            0.0,
                            next_checkpoint[
                                "distance_from_start_miles"
                            ]
                            - checkpoint["distance_from_start_miles"],
                        )
                    else:
                        segment_miles = 0.0

                    if risk == "Severe":
                        severe_miles += segment_miles
                    elif risk == "High":
                        high_miles += segment_miles

                avg_risk_score = (
                    total_risk_score / len(checkpoints)
                    if checkpoints
                    else 0
                )

                formatted_routes.append(
                    {
                        "route_index": index + 1,
                        "is_primary": index == 0,
                        "is_recommended": False,
                        "distance_km": round(
                            distance_meters / 1000, 2
                        ),
                        "distance_miles": round(
                            distance_meters / 1609.344, 2
                        ),
                        "duration_mins": round(
                            duration_secs / 60, 2
                        ),
                        "duration_hours": round(
                            duration_secs / 3600, 2
                        ),
                        "geometry": geometry,
                        "checkpoints": checkpoints,
                        "risk_summary": {
                            "max_risk_level": max_route_risk,
                            "avg_risk_score": round(
                                avg_risk_score, 2
                            ),
                            "severe_miles": round(severe_miles, 2),
                            "high_miles": round(high_miles, 2),
                        },
                    }
                )

        if not formatted_routes:
            return Response(
                {"error": "Nu s-au putut genera rute valide."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        recommended_route = min(
            formatted_routes,
            key=lambda item: (
                item["risk_summary"]["severe_miles"],
                item["risk_summary"]["high_miles"],
                item["risk_summary"]["avg_risk_score"],
                item["duration_hours"],
            ),
        )
        recommended_route["is_recommended"] = True

        formatted_routes.sort(key=lambda item: item["route_index"])

        return Response(
            {
                "status": "success",
                "departure_time": departure_time.strftime(
                    "%Y-%m-%d %H:%M UTC"
                ),
                "load_weight_lbs": load_weight,
                "sampling_interval_miles": sampling_miles,
                "routes_count": len(formatted_routes),
                "routes": formatted_routes,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def parse_coordinates(coords):
        if isinstance(coords, str):
            parts = coords.split(",")
        elif isinstance(coords, (list, tuple)):
            parts = coords
        else:
            raise ValueError(
                "Coordonatele trebuie să fie 'lng,lat' "
                "sau [lng, lat]."
            )

        if len(parts) != 2:
            raise ValueError(
                "Sunt necesare exact două valori: lng și lat."
            )

        try:
            lng = float(parts[0])
            lat = float(parts[1])
        except (TypeError, ValueError):
            raise ValueError(
                "Longitudinea și latitudinea trebuie să fie numere."
            )

        if not math.isfinite(lng) or not -180 <= lng <= 180:
            raise ValueError(
                "Longitudinea trebuie să fie între -180 și 180."
            )

        if not math.isfinite(lat) or not -90 <= lat <= 90:
            raise ValueError(
                "Latitudinea trebuie să fie între -90 și 90."
            )

        return lng, lat

    @staticmethod
    def parse_departure_time(value):
        if not value:
            return datetime.now(timezone.utc)

        if not isinstance(value, str):
            raise ValueError(
                "'departure_time' trebuie să fie un șir ISO 8601."
            )

        try:
            parsed = datetime.fromisoformat(
                value.replace("Z", "+00:00")
            )
        except ValueError:
            raise ValueError(
                "'departure_time' trebuie să fie o dată ISO 8601 validă."
            )

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed.astimezone(timezone.utc)

    @staticmethod
    def build_checkpoints(coords, sampling_km):
        first_coord = coords[0]

        cumulative_km = 0.0
        distance_since_checkpoint = 0.0

        checkpoints = [
            {
                "lat": first_coord[1],
                "lng": first_coord[0],
                "distance_from_start_miles": 0.0,
                "_distance_from_start_km": 0.0,
            }
        ]

        previous_coord = (first_coord[1], first_coord[0])

        for index in range(1, len(coords)):
            coord = coords[index]
            current_coord = (coord[1], coord[0])

            segment_km = geodesic(
                previous_coord,
                current_coord,
            ).km

            cumulative_km += segment_km
            distance_since_checkpoint += segment_km
            previous_coord = current_coord

            is_last = index == len(coords) - 1

            if (
                distance_since_checkpoint >= sampling_km
                or is_last
            ):
                checkpoints.append(
                    {
                        "lat": current_coord[0],
                        "lng": current_coord[1],
                        "distance_from_start_miles": round(
                            cumulative_km / 1.609344,
                            2,
                        ),
                        "_distance_from_start_km": cumulative_km,
                    }
                )
                distance_since_checkpoint = 0.0

        return checkpoints, cumulative_km

    def get_weather(self, session, lat, lng, target_time):
        params = {
            "latitude": lat,
            "longitude": lng,
            "hourly": "rain,snowfall,wind_speed_10m",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "snowfall_unit": "inch",
            "timezone": "UTC",
            "forecast_days": 7,
        }

        unavailable = {
            "available": False,
            "wind_mph": None,
            "rain_in_hr": None,
            "snow_in_hr": None,
        }

        try:
            response = session.get(
                self.WEATHER_URL,
                params=params,
                timeout=8,
            )
            response.raise_for_status()
            data = response.json()

            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            target_hour = target_time.strftime("%Y-%m-%dT%H:00")

            try:
                hour_index = times.index(target_hour)
            except ValueError:
                return unavailable.copy()

            wind_values = hourly.get("wind_speed_10m", [])
            rain_values = hourly.get("rain", [])
            snow_values = hourly.get("snowfall", [])

            wind = wind_values[hour_index]
            rain = rain_values[hour_index]
            snow = snow_values[hour_index]

            if wind is None or rain is None or snow is None:
                return unavailable.copy()

            return {
                "available": True,
                "wind_mph": wind,
                "rain_in_hr": rain,
                "snow_in_hr": snow,
            }

        except (
            requests.exceptions.RequestException,
            ValueError,
            KeyError,
            IndexError,
            TypeError,
        ):
            return unavailable.copy()

    def calculate_risk(self, wind, rain, snow, load_weight):
        if wind is None or rain is None or snow is None:
            return "Unknown"

        if wind >= 55 or rain > 1.00 or snow > 3.0:
            risk = "No Travel"
        elif wind >= 45 or rain >= 0.50 or snow >= 2.0:
            risk = "Severe"
        elif wind >= 35 or rain >= 0.25 or snow >= 1.0:
            risk = "High"
        elif wind >= 25 or rain >= 0.10 or snow >= 0.5:
            risk = "Moderate"
        else:
            risk = "Low"

        # Reguli speciale pentru greutatea încărcăturii.
        if wind >= 55:
            return "No Travel"

        if 45 <= wind < 55 and load_weight > 30000:
            return "No Travel"

        if 35 <= wind < 45 and load_weight > 40000:
            return "Severe"

        return risk
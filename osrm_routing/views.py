
import requests

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class OSRMRouteView(APIView):
    """
    Primește coordonatele de start și de final și returnează
    rutele disponibile de la OSRM, inclusiv alternativele.
    """

    OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving/"

    def post(self, request):
        start_coords = request.data.get("start")
        end_coords = request.data.get("end")

        # Verificăm dacă ambele coordonate au fost trimise.
        if not start_coords or not end_coords:
            return Response(
                {
                    "error": (
                        "Câmpurile 'start' și 'end' sunt obligatorii. "
                        "Folosește formatul 'lng,lat'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Acceptăm coordonatele în format string: "lng,lat"
        # sau listă: [lng, lat].
        def parse_coordinates(coords):
            if isinstance(coords, str):
                parts = coords.split(",")
            elif isinstance(coords, (list, tuple)):
                parts = coords
            else:
                raise ValueError(
                    "Coordonatele trebuie să fie un șir 'lng,lat' "
                    "sau o listă [lng, lat]."
                )

            if len(parts) != 2:
                raise ValueError(
                    "Fiecare coordonată trebuie să conțină "
                    "exact două valori: longitudine și latitudine."
                )

            try:
                lng, lat = float(parts[0]), float(parts[1])
            except (TypeError, ValueError):
                raise ValueError(
                    "Longitudinea și latitudinea trebuie să fie numere."
                )

            if not (-180 <= lng <= 180):
                raise ValueError("Longitudinea trebuie să fie între -180 și 180.")

            if not (-90 <= lat <= 90):
                raise ValueError("Latitudinea trebuie să fie între -90 și 90.")

            return f"{lng},{lat}"

        try:
            start = parse_coordinates(start_coords)
            end = parse_coordinates(end_coords)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # URL-ul corect OSRM.
        osrm_url = f"{self.OSRM_BASE_URL}{start};{end}"

        params = {
            "overview": "full",
            "geometries": "geojson",
            "alternatives": "true",
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

        except requests.exceptions.RequestException as e:
            return Response(
                {"error": f"Eroare la conectarea cu serverul OSRM: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError:
            return Response(
                {"error": "Serverul OSRM a returnat un răspuns JSON invalid."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if data.get("code") != "Ok":
            return Response(
                {
                    "error": "OSRM nu a putut calcula ruta pentru aceste coordonate.",
                    "osrm_code": data.get("code"),
                    "details": data.get("message"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        osrm_routes = data.get("routes", [])
        formatted_routes = []

        for index, route in enumerate(osrm_routes):
            formatted_routes.append(
                {
                    "route_index": index + 1,
                    "is_primary": index == 0,
                    "distance_km": round(route["distance"] / 1000, 2),
                    "duration_mins": round(route["duration"] / 60, 2),
                    "geometry": route["geometry"],
                }
            )

        return Response(
            {
                "status": "success",
                "routes_count": len(formatted_routes),
                "routes": formatted_routes,
            },
            status=status.HTTP_200_OK,
        )

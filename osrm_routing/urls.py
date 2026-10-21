from django.urls import path
from .views import OSRMRouteView

urlpatterns = [
    path('', OSRMRouteView.as_view(), name='get_osrm_route'),
]

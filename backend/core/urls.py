from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, TicketViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = router.urls

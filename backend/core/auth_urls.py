from django.urls import path

from .auth_views import LoginView, LogoutView, MeView, RegisterView, StaffListView, TokenRefreshCookieView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='token-refresh'),
    path('staff/', StaffListView.as_view(), name='auth-staff'),
]

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .auth_serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    StaffUserSerializer,
    UserProfileSerializer,
    _user_data,
)
from .models import User


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Реєстрація нового користувача. Повертає токени одразу після реєстрації.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Видати токени одразу
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': _user_data(user),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Вхід через username + password. Повертає access + refresh токени та дані користувача.
    """

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Анулювання refresh токена.
    Body: { "refresh": "<refresh_token>" }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({'detail': 'refresh токен обов\'язковий.'}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            # Якщо blacklist не налаштований — просто повертаємо 200
            pass
        return Response({'detail': 'Успішно вийшли.'}, status=status.HTTP_200_OK)


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/me/  — отримати профіль поточного користувача
    PATCH /api/auth/me/ — оновити first_name, last_name, email
    """

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class TokenRefreshCookieView(TokenRefreshView):
    """
    POST /api/auth/token/refresh/
    Оновлення access токена через refresh токен.
    """

    permission_classes = [permissions.AllowAny]


class StaffListView(generics.ListAPIView):
    """
    GET /api/auth/staff/
    Список співробітників підтримки (для призначення виконавця).
    Доступно тільки авторизованим користувачам.
    """

    serializer_class = StaffUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(
            role__in=(User.Role.SUPPORT, User.Role.ADMIN)
        ).order_by('last_name', 'first_name')

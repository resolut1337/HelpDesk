from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """Серіалізатор реєстрації нового користувача."""

    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label='Підтвердження пароля')

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'department', 'password', 'password2')
        extra_kwargs = {
            'email': {'required': True},
            'role': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'phone': {'required': False},
            'department': {'required': False},
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Користувач з таким email вже існує.')
        return value.lower()

    def validate_role(self, value):
        # Клієнт може реєструватися лише з роллю CLIENT
        # Роль SUPPORT/ADMIN призначається тільки адміністратором
        if value in (User.Role.SUPPORT, User.Role.ADMIN):
            raise serializers.ValidationError(
                'Роль "Співробітник підтримки" або "Адміністратор" може бути призначена лише адміністратором.'
            )
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Паролі не співпадають.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT токен з додатковими даними користувача."""

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = _user_data(user)
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Профіль поточного користувача."""

    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    is_support = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'is_staff', 'is_support',
            'phone', 'department', 'avatar', 'bio',
            'date_joined', 'last_login',
        )
        read_only_fields = ('id', 'username', 'role', 'is_staff', 'date_joined', 'last_login')

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserShortSerializer(serializers.ModelSerializer):
    """Скорочений серіалізатор користувача (для вкладень у заявки)."""

    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'full_name', 'email', 'role', 'role_display')
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class StaffUserSerializer(serializers.ModelSerializer):
    """Серіалізатор для списку співробітників (для призначення виконавця)."""

    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'full_name', 'email', 'role', 'role_display', 'department')
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


def _user_data(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'full_name': user.get_full_name() or user.username,
        'role': user.role,
        'role_display': user.get_role_display(),
        'is_staff': user.is_staff,
        'is_support': user.is_support,
        'phone': user.phone,
        'department': user.department,
        'avatar': user.avatar,
    }

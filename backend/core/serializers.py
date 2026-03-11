from django.conf import settings
from rest_framework import serializers

from .auth_serializers import UserShortSerializer
from .models import Category, Ticket, TicketAttachment, TicketComment


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class AttachmentSerializer(serializers.ModelSerializer):
    """Серіалізатор для читання вкладень."""

    url = serializers.SerializerMethodField()
    size_kb = serializers.IntegerField(read_only=True)
    uploaded_by = UserShortSerializer(read_only=True)

    class Meta:
        model = TicketAttachment
        fields = ('id', 'original_name', 'mime_type', 'size_bytes', 'size_kb', 'url', 'uploaded_by', 'created_at')
        read_only_fields = fields

    def get_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class AttachmentUploadSerializer(serializers.ModelSerializer):
    """Серіалізатор для завантаження файлу."""

    file = serializers.FileField()

    class Meta:
        model = TicketAttachment
        fields = ('id', 'file')
        read_only_fields = ('id',)

    def validate_file(self, value):
        max_size = getattr(settings, 'TICKET_ATTACHMENT_MAX_SIZE_MB', 10) * 1024 * 1024
        allowed_types = getattr(settings, 'TICKET_ATTACHMENT_ALLOWED_TYPES', [])

        if value.size > max_size:
            raise serializers.ValidationError(
                f'Файл завеликий. Максимальний розмір: {max_size // (1024 * 1024)} МБ.'
            )

        mime = value.content_type or ''
        if allowed_types and mime not in allowed_types:
            raise serializers.ValidationError(
                f'Недозволений тип файлу: {mime}. '
                f'Дозволені: {", ".join(allowed_types)}'
            )
        return value

    def create(self, validated_data):
        file = validated_data['file']
        ticket = self.context['ticket']
        uploader = self.context['request'].user
        return TicketAttachment.objects.create(
            ticket=ticket,
            file=file,
            original_name=file.name,
            mime_type=file.content_type or '',
            size_bytes=file.size,
            uploaded_by=uploader,
        )


class CommentSerializer(serializers.ModelSerializer):
    """Серіалізатор для читання коментарів."""

    author = UserShortSerializer(read_only=True)

    class Meta:
        model = TicketComment
        fields = ('id', 'body', 'is_internal', 'author', 'created_at', 'updated_at')
        read_only_fields = ('id', 'author', 'created_at', 'updated_at')


class CommentCreateSerializer(serializers.ModelSerializer):
    """Серіалізатор для створення/редагування коментаря."""

    class Meta:
        model = TicketComment
        fields = ('id', 'body', 'is_internal')
        read_only_fields = ('id',)

    def validate_is_internal(self, value):
        """Тільки support/admin може створювати внутрішні коментарі."""
        request = self.context.get('request')
        if value and request and not request.user.is_support:
            raise serializers.ValidationError(
                'Внутрішні коментарі доступні лише співробітникам підтримки.'
            )
        return value

    def create(self, validated_data):
        ticket = self.context['ticket']
        author = self.context['request'].user
        return TicketComment.objects.create(
            ticket=ticket,
            author=author,
            **validated_data,
        )


class TicketSerializer(serializers.ModelSerializer):
    """Серіалізатор для читання заявок (з розгорнутими об'єктами)."""

    author = UserShortSerializer(read_only=True)
    assignee = UserShortSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    attachments_count = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'title', 'description',
            'status', 'status_display',
            'priority', 'priority_display',
            'category', 'author', 'assignee',
            'attachments', 'attachments_count',
            'comments', 'comments_count',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'author')

    def get_attachments_count(self, obj):
        return obj.attachments.count()

    def get_comments(self, obj):
        request = self.context.get('request')
        qs = obj.comments.select_related('author')
        # Приховати внутрішні коментарі від клієнтів
        if request and not request.user.is_support:
            qs = qs.filter(is_internal=False)
        return CommentSerializer(qs, many=True, context=self.context).data

    def get_comments_count(self, obj):
        return obj.comments.count()


class TicketCreateSerializer(serializers.ModelSerializer):
    """Серіалізатор для створення / оновлення заявки."""

    class Meta:
        model = Ticket
        fields = ('id', 'title', 'description', 'status', 'priority', 'category', 'assignee')
        read_only_fields = ('id',)

    def validate_assignee(self, value):
        """Виконавець має бути співробітником підтримки або адміністратором."""
        from .models import User
        if value is not None and value.role == User.Role.CLIENT:
            raise serializers.ValidationError(
                'Виконавцем може бути лише співробітник підтримки або адміністратор.'
            )
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['author'] = request.user
        return super().create(validated_data)

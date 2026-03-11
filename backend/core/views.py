from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import TicketFilter
from .models import Category, Ticket, TicketAttachment, TicketComment
from .serializers import (
    AttachmentSerializer,
    AttachmentUploadSerializer,
    CategorySerializer,
    CommentCreateSerializer,
    CommentSerializer,
    TicketCreateSerializer,
    TicketSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD для категорій.

    list   GET    /api/categories/
    create POST   /api/categories/
    retrieve GET  /api/categories/{id}/
    update PUT    /api/categories/{id}/
    partial_update PATCH /api/categories/{id}/
    destroy DELETE /api/categories/{id}/
    """

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class TicketViewSet(viewsets.ModelViewSet):
    """
    CRUD для заявок з повною фільтрацією.

    list   GET    /api/tickets/          — список заявок
    create POST   /api/tickets/          — створення нової заявки
    retrieve GET  /api/tickets/{id}/     — деталі заявки
    update PUT    /api/tickets/{id}/     — повне оновлення
    partial_update PATCH /api/tickets/{id}/ — часткове оновлення
    destroy DELETE /api/tickets/{id}/   — видалення

    Параметри фільтрації:
      ?status=new|in_progress|resolved|closed
      ?status__in=new,in_progress
      ?priority=low|medium|high|critical
      ?priority__in=low,high
      ?category=<id>
      ?author=<id>
      ?assignee=<id>
      ?assignee__isnull=true       — нерозподілені заявки
      ?my=true                     — тільки мої заявки
      ?created_after=YYYY-MM-DD
      ?created_before=YYYY-MM-DD
      ?search=<text>               — пошук по title та description
      ?ordering=-created_at|priority|status|updated_at
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TicketFilter
    search_fields = ['title', 'description', 'author__username', 'author__email']
    ordering_fields = ['created_at', 'updated_at', 'priority', 'status', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Ticket.objects.select_related(
            'author', 'assignee', 'category'
        ).prefetch_related(
            'attachments__uploaded_by',
            'comments__author',
        )

        # Role-based access: клієнти бачать тільки свої заявки
        user = self.request.user
        if user.is_authenticated and user.is_client:
            qs = qs.filter(author=user)

        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TicketCreateSerializer
        return TicketSerializer

    @action(
        detail=True,
        methods=['get', 'post'],
        url_path='attachments',
        parser_classes=[MultiPartParser, FormParser],
    )
    def attachments(self, request, pk=None):
        """
        GET  /api/tickets/{id}/attachments/  — список вкладень заявки
        POST /api/tickets/{id}/attachments/  — завантажити новий файл
        """
        ticket = self.get_object()

        if request.method == 'GET':
            qs = ticket.attachments.select_related('uploaded_by').all()
            serializer = AttachmentSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)

        # POST — upload
        serializer = AttachmentUploadSerializer(
            data=request.data,
            context={'request': request, 'ticket': ticket},
        )
        serializer.is_valid(raise_exception=True)
        attachment = serializer.save()
        out = AttachmentSerializer(attachment, context={'request': request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['get', 'post'],
        url_path='comments',
    )
    def comments(self, request, pk=None):
        """
        GET  /api/tickets/{id}/comments/  — список коментарів заявки
        POST /api/tickets/{id}/comments/  — додати коментар
        """
        ticket = self.get_object()

        if request.method == 'GET':
            qs = ticket.comments.select_related('author')
            # Клієнти не бачать внутрішніх коментарів
            if not request.user.is_support:
                qs = qs.filter(is_internal=False)
            serializer = CommentSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)

        serializer = CommentCreateSerializer(
            data=request.data,
            context={'request': request, 'ticket': ticket},
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()
        out = CommentSerializer(comment, context={'request': request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['patch', 'delete'],
        url_path=r'comments/(?P<comment_id>\d+)',
    )
    def manage_comment(self, request, pk=None, comment_id=None):
        """
        PATCH  /api/tickets/{id}/comments/{comment_id}/  — редагувати коментар
        DELETE /api/tickets/{id}/comments/{comment_id}/  — видалити коментар
        """
        ticket = self.get_object()
        try:
            comment = ticket.comments.get(pk=comment_id)
        except TicketComment.DoesNotExist:
            return Response({'detail': 'Коментар не знайдено.'}, status=status.HTTP_404_NOT_FOUND)

        # Тільки автор або support може редагувати/видаляти
        if comment.author != request.user and not request.user.is_support:
            return Response({'detail': 'Немає дозволу.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'DELETE':
            comment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH
        serializer = CommentCreateSerializer(
            comment, data=request.data, partial=True,
            context={'request': request, 'ticket': ticket},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        out = CommentSerializer(comment, context={'request': request})
        return Response(out.data)

    @action(
        detail=True,
        methods=['delete'],
        url_path=r'attachments/(?P<attachment_id>\d+)',
    )
    def delete_attachment(self, request, pk=None, attachment_id=None):
        """
        DELETE /api/tickets/{id}/attachments/{attachment_id}/  — видалити вкладення
        """
        ticket = self.get_object()
        try:
            attachment = ticket.attachments.get(pk=attachment_id)
        except TicketAttachment.DoesNotExist:
            return Response({'detail': 'Вкладення не знайдено.'}, status=status.HTTP_404_NOT_FOUND)

        # Тільки автор завантаження або staff може видаляти
        if attachment.uploaded_by != request.user and not request.user.is_support:
            return Response({'detail': 'Немає дозволу.'}, status=status.HTTP_403_FORBIDDEN)

        attachment.file.delete(save=False)  # видалити фізичний файл
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

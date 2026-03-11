from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Кастомна модель користувача з роллю."""

    class Role(models.TextChoices):
        CLIENT = 'client', 'Клієнт'
        SUPPORT = 'support', 'Співробітник підтримки'
        ADMIN = 'admin', 'Адміністратор'

    role = models.CharField(
        'Роль',
        max_length=20,
        choices=Role.choices,
        default=Role.CLIENT,
    )
    phone = models.CharField('Телефон', max_length=30, blank=True)
    department = models.CharField('Відділ', max_length=120, blank=True)
    avatar = models.URLField('Аватар', blank=True)
    bio = models.TextField('Про себе', blank=True)

    class Meta:
        verbose_name = 'Користувач'
        verbose_name_plural = 'Користувачі'
        ordering = ['username']

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.get_role_display()})'

    @property
    def is_client(self):
        return self.role == self.Role.CLIENT

    @property
    def is_support(self):
        return self.role in (self.Role.SUPPORT, self.Role.ADMIN)


class Category(models.Model):
    name = models.CharField('Назва', max_length=120, unique=True)
    description = models.TextField('Опис', blank=True)
    is_active = models.BooleanField('Активна', default=True)
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    updated_at = models.DateTimeField('Оновлено', auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Категорія'
        verbose_name_plural = 'Категорії'

    def __str__(self):
        return self.name


class Ticket(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', 'Нова'
        IN_PROGRESS = 'in_progress', 'В роботі'
        RESOLVED = 'resolved', 'Вирішена'
        CLOSED = 'closed', 'Закрита'

    class Priority(models.TextChoices):
        LOW = 'low', 'Низький'
        MEDIUM = 'medium', 'Середній'
        HIGH = 'high', 'Високий'
        CRITICAL = 'critical', 'Критичний'

    title = models.CharField('Тема', max_length=255)
    description = models.TextField('Опис')
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )
    priority = models.CharField(
        'Пріоритет',
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets',
        verbose_name='Категорія',
    )
    author = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name='tickets',
        verbose_name='Автор',
    )
    assignee = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        verbose_name='Виконавець',
    )
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    updated_at = models.DateTimeField('Оновлено', auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Заявка'
        verbose_name_plural = 'Заявки'

    def __str__(self):
        return f'#{self.pk} {self.title}'


class TicketComment(models.Model):
    """Коментар до заявки."""

    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Заявка',
    )
    author = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Автор',
    )
    body = models.TextField('Текст коментаря')
    is_internal = models.BooleanField(
        'Внутрішній',
        default=False,
        help_text='Внутрішні коментарі видно лише співробітникам підтримки.',
    )
    created_at = models.DateTimeField('Створено', auto_now_add=True)
    updated_at = models.DateTimeField('Оновлено', auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Коментар'
        verbose_name_plural = 'Коментарі'

    def __str__(self):
        return f'Коментар #{self.pk} до Ticket #{self.ticket_id} від {self.author}'


def attachment_upload_path(instance, filename):
    """Зберігати файли у media/tickets/<ticket_id>/<filename>"""
    return f'tickets/{instance.ticket_id}/{filename}'


class TicketAttachment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='Заявка',
    )
    file = models.FileField(
        'Файл',
        upload_to=attachment_upload_path,
    )
    original_name = models.CharField('Оригінальна назва', max_length=255)
    mime_type = models.CharField('MIME-тип', max_length=120, blank=True)
    size_bytes = models.PositiveIntegerField('Розмір (байти)', default=0)
    uploaded_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_attachments',
        verbose_name='Завантажено',
    )
    created_at = models.DateTimeField('Завантажено о', auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Вкладення'
        verbose_name_plural = 'Вкладення'

    def __str__(self):
        return f'{self.original_name} → Ticket #{self.ticket_id}'

    @property
    def size_kb(self):
        return max(1, round(self.size_bytes / 1024))

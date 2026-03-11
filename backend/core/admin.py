from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Category, Ticket, TicketAttachment, TicketComment, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active', 'last_login')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone')
    ordering = ('username',)

    fieldsets = UserAdmin.fieldsets + (
        ('Профіль HelpDesk', {
            'fields': ('role', 'phone', 'department', 'avatar', 'bio'),
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Профіль HelpDesk', {
            'fields': ('email', 'first_name', 'last_name', 'role', 'phone', 'department'),
        }),
    )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    ordering = ('name',)
    list_per_page = 25


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status', 'priority', 'category', 'author', 'assignee', 'created_at')
    list_filter = ('status', 'priority', 'category', 'created_at')
    search_fields = ('title', 'description', 'author__username', 'assignee__username')
    ordering = ('-created_at',)
    list_per_page = 25
    raw_id_fields = ('author', 'assignee')


@admin.register(TicketAttachment)
class TicketAttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'original_name', 'mime_type', 'size_kb', 'ticket', 'uploaded_by', 'created_at')
    list_filter = ('mime_type', 'created_at')
    search_fields = ('original_name', 'ticket__title', 'uploaded_by__username')
    ordering = ('-created_at',)
    raw_id_fields = ('ticket', 'uploaded_by')
    readonly_fields = ('original_name', 'mime_type', 'size_bytes', 'uploaded_by', 'created_at')


class TicketCommentInline(admin.TabularInline):
    model = TicketComment
    extra = 0
    readonly_fields = ('author', 'created_at', 'updated_at')
    fields = ('author', 'body', 'is_internal', 'created_at')


@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket', 'author', 'is_internal', 'created_at', 'short_body')
    list_filter = ('is_internal', 'created_at')
    search_fields = ('body', 'author__username', 'ticket__title')
    ordering = ('-created_at',)
    raw_id_fields = ('ticket', 'author')
    readonly_fields = ('created_at', 'updated_at')

    def short_body(self, obj):
        return obj.body[:80] + '...' if len(obj.body) > 80 else obj.body
    short_body.short_description = 'Текст'


admin.site.site_header = 'Адмін-панель HelpDesk'
admin.site.site_title = 'HelpDesk: адміністративний портал'
admin.site.index_title = 'Керування категоріями, заявками та користувачами'

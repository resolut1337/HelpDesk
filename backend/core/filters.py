import django_filters

from .models import Ticket


class TicketFilter(django_filters.FilterSet):
    """
    Фільтр для заявок.

    Підтримувані query-параметри:
      status          — точний збіг: new | in_progress | resolved | closed
      status__in      — список через кому: ?status__in=new,in_progress
      priority        — точний збіг: low | medium | high | critical
      priority__in    — список через кому
      category        — ID категорії
      author          — ID автора
      assignee        — ID виконавця
      assignee__isnull — true/false (нерозподілені заявки)
      my              — true → тільки заявки поточного користувача
      created_after   — дата від (YYYY-MM-DD)
      created_before  — дата до (YYYY-MM-DD)
      search          — повнотекстовий пошук по title та description (через SearchFilter)
      ordering        — поле сортування: created_at | -created_at | priority | status
    """

    # Точні фільтри
    status = django_filters.ChoiceFilter(choices=Ticket.Status.choices)
    priority = django_filters.ChoiceFilter(choices=Ticket.Priority.choices)
    category = django_filters.NumberFilter(field_name='category_id')
    author = django_filters.NumberFilter(field_name='author_id')
    assignee = django_filters.NumberFilter(field_name='assignee_id')

    # Множинний вибір через кому
    status__in = django_filters.BaseInFilter(
        field_name='status',
        lookup_expr='in',
    )
    priority__in = django_filters.BaseInFilter(
        field_name='priority',
        lookup_expr='in',
    )

    # Нерозподілені заявки: ?assignee__isnull=true
    assignee__isnull = django_filters.BooleanFilter(
        field_name='assignee',
        lookup_expr='isnull',
    )

    # Фільтр по даті створення
    created_after = django_filters.DateFilter(
        field_name='created_at',
        lookup_expr='date__gte',
    )
    created_before = django_filters.DateFilter(
        field_name='created_at',
        lookup_expr='date__lte',
    )

    # Мої заявки: ?my=true
    my = django_filters.BooleanFilter(method='filter_my')

    class Meta:
        model = Ticket
        fields = [
            'status', 'status__in',
            'priority', 'priority__in',
            'category', 'author', 'assignee',
            'assignee__isnull',
            'created_after', 'created_before',
            'my',
        ]

    def filter_my(self, queryset, name, value):
        if value:
            return queryset.filter(author=self.request.user)
        return queryset

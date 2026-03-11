from django.core.management.base import BaseCommand
from core.models import Category


class Command(BaseCommand):
    help = 'Seed default ticket categories'

    def handle(self, *args, **options):
        categories = [
            {
                'name': 'Access Issues',
                'description': 'Problems with login, permissions, and account access.'
            },
            {
                'name': 'Billing',
                'description': 'Payment, invoices, and subscription questions.'
            },
            {
                'name': 'Software Bug',
                'description': 'Unexpected behavior or errors in the application.'
            },
            {
                'name': 'Hardware',
                'description': 'Issues related to physical devices and equipment.'
            },
            {
                'name': 'Network',
                'description': 'Connectivity, VPN, and internet-related problems.'
            },
            {
                'name': 'Other',
                'description': 'Any other issues not covered by existing categories.'
            }
        ]

        for category_data in categories:
            category, created = Category.objects.get_or_create(
                name=category_data['name'],
                defaults={'description': category_data['description']}
            )
            status = 'Created' if created else 'Already exists'
            self.stdout.write(
                self.style.SUCCESS(
                    f'{status}: {category.name}'
                )
            )

# Generated migration for seeding initial Category data

from django.db import migrations


def seed_categories(apps, schema_editor):
    """Populate initial Category data."""
    Category = apps.get_model('core', 'Category')
    
    categories_data = [
        {
            'name': 'Access Issues',
            'description': 'Problems with login, permissions, and account access.',
            'is_active': True,
        },
        {
            'name': 'Billing',
            'description': 'Payment, invoices, and subscription questions.',
            'is_active': True,
        },
        {
            'name': 'Software Bug',
            'description': 'Unexpected behavior or errors in the application.',
            'is_active': True,
        },
        {
            'name': 'Hardware',
            'description': 'Issues related to physical devices and equipment.',
            'is_active': True,
        },
        {
            'name': 'Network',
            'description': 'Connectivity, VPN, and internet-related problems.',
            'is_active': True,
        },
        {
            'name': 'Other',
            'description': 'Any other issues not covered by existing categories.',
            'is_active': True,
        },
    ]
    
    for category_data in categories_data:
        Category.objects.get_or_create(**category_data)


def reverse_seed_categories(apps, schema_editor):
    """Remove seeded categories."""
    Category = apps.get_model('core', 'Category')
    
    category_names = [
        'Access Issues',
        'Billing',
        'Software Bug',
        'Hardware',
        'Network',
        'Other',
    ]
    
    Category.objects.filter(name__in=category_names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_ticketcomment'),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_seed_categories),
    ]

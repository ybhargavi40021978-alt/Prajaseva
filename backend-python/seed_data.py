"""Legacy compatibility module.

PrajaSeva no longer seeds demo users, profiles, applications, grievances,
or other fabricated user data. Database initialization creates schema only.
Official service/departments data must be managed as live master data.
"""

def seed_database():
    # Intentionally a no-op. Kept only so older imports do not break.
    return None

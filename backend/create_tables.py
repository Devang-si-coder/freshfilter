import models
from database import engine, Base

print("Creating FreshFilter database tables...")

Base.metadata.create_all(bind=engine)

print("All database tables created successfully!")
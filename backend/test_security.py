from app.config.security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_token
)

password = "Admin@123"

hashed = hash_password(password)

print("Hashed Password:")
print(hashed)

print()

print("Password Verification:")
print(verify_password(password, hashed))

print()

token = create_access_token(
    {
        "email": "admin@gmail.com"
    }
)

print("JWT Token:")
print(token)

print()

print("Decoded Token:")
print(verify_token(token))
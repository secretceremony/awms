# 13 - Security Guide

This document outlines the security architecture, credential governance, and operational security guidelines for AWMS.

---

## 1. Secrets Management & Environment Isolation

- **Zero Committed Secrets**: No passwords, database URIs, or signing keys are stored in version control. All sensitive keys are loaded via `.env` files ignored by `.gitignore`.
- **Reference Templates**: Developers must copy [.env.example](.env.example) and populate their local credentials.

---

## 2. Authentication & Session Security

- **Password Hashing**: User passwords are encrypted using `bcrypt` with work factor 10 before storage in the database.
- **HttpOnly JWT Cookies**: Authentication tokens are transmitted in `HttpOnly`, `SameSite=Lax` (or `Strict`), and `Secure` (in production) cookies, mitigating Cross-Site Scripting (XSS) token exfiltration.
- **Session Expiration**: Token lifetimes are bounded (default `8h`) to limit exposure from unattended terminals.

---

## 3. Network & Transport Security

- **HTTPS Mandatory in Production**: In production, all HTTP traffic must be redirected to HTTPS (TLS 1.2+) via an upstream reverse proxy (e.g. Nginx, Caddy).
- **CORS Restricted**: The NestJS API rejects requests originating from unauthorized client domains by strictly validating against `FRONTEND_URL`.

---

## 4. Authorization & Role-Based Access

- **Route Guards**: Critical administrative mutation endpoints are protected by NestJS `JwtAuthGuard` and role guards.
- **Audit Logging**: Every create, update, delete, issue, and print action is captured in `audit_logs` with actor ID, IP address, and payload delta.

---

## 5. Database Backup Security

- **Restricted Access**: Logical database dumps and physical WAL archives must be encrypted at rest (using AES-256 or GPG) and restricted to authorized sysadmins.
- **Off-Site Transfer**: Encrypted backups transferred to external cloud storage must use TLS connections and dedicated IAM service credentials with least privilege.

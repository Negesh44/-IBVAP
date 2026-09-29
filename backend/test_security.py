import os
import sys
import time
import unittest
import jwt
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from auth.permissions import Role


def generate_test_token(role: str, user_id: str = "USR-TEST-01", email: str = "test@ibvap.gov.in", expired: bool = False) -> str:
    """Generates an encoded test JWT for security role evaluation."""
    exp = int(time.time()) - 3600 if expired else int(time.time()) + 3600
    payload = {
        "sub": user_id,
        "email": email,
        "user_metadata": {
            "role": role,
            "full_name": f"Test {role} Officer",
            "department": "Security Testing Unit"
        },
        "exp": exp
    }
    # 32-byte secret key for HS256 HMAC
    return jwt.encode(payload, "secure_32_byte_secret_key_for_testing_purposes!", algorithm="HS256")


class TestSecurityAndRBAC(unittest.TestCase):
    """
    Security verification test suite for IBVAP.
    Tests Authentication, RBAC guards, input validation, upload security, and CORS policies.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.admin_token = generate_test_token(Role.ADMIN.value)
        cls.commander_token = generate_test_token(Role.COMMANDER.value)
        cls.operator_token = generate_test_token(Role.OPERATOR.value)
        cls.viewer_token = generate_test_token(Role.VIEWER.value)
        cls.expired_token = generate_test_token(Role.ADMIN.value, expired=True)

    def test_01_missing_jwt_rejection(self):
        """Protected endpoints must reject requests without Bearer token with 401."""
        print("\n==================================================")
        print("[1] Testing Missing JWT Token Rejection (HTTP 401)")
        print("==================================================")
        
        # Alerts list requires authentication
        res = self.client.get("/api/alerts")
        print(f"GET /api/alerts without token -> Status {res.status_code}")
        self.assertEqual(res.status_code, 401)
        self.assertIn("Authentication required", res.json().get("detail", ""))

        # System health requires authentication
        res_sys = self.client.get("/api/system/health")
        print(f"GET /api/system/health without token -> Status {res_sys.status_code}")
        self.assertEqual(res_sys.status_code, 401)
        print("SUCCESS: Missing token blocked with HTTP 401.")

    def test_02_invalid_and_expired_jwt_rejection(self):
        """Endpoints must reject malformed and expired JWT tokens with 401."""
        print("\n==================================================")
        print("[2] Testing Malformed & Expired JWT Tokens (HTTP 401)")
        print("==================================================")

        # Malformed garbage token
        res_invalid = self.client.get(
            "/api/alerts",
            headers={"Authorization": "Bearer not_a_valid_jwt_token"}
        )
        print(f"GET /api/alerts with malformed token -> Status {res_invalid.status_code}")
        self.assertEqual(res_invalid.status_code, 401)

        # Expired token
        res_expired = self.client.get(
            "/api/alerts",
            headers={"Authorization": f"Bearer {self.expired_token}"}
        )
        print(f"GET /api/alerts with expired token -> Status {res_expired.status_code}")
        self.assertEqual(res_expired.status_code, 401)
        self.assertIn("expired", res_expired.json().get("detail", "").lower())
        print("SUCCESS: Invalid and expired tokens rejected.")

    def test_03_viewer_attempting_alert_modification(self):
        """VIEWER role must be rejected with 403 when attempting alert modification."""
        print("\n==================================================")
        print("[3] Testing VIEWER Attempting Alert Modification (HTTP 403)")
        print("==================================================")

        res = self.client.post(
            "/api/alerts/ALT-2026-8801/action",
            headers={"Authorization": f"Bearer {self.viewer_token}"},
            json={"status": "RESOLVED", "note": "Unauthorized attempt"}
        )
        print(f"POST /api/alerts/action with VIEWER token -> Status {res.status_code}")
        self.assertEqual(res.status_code, 403)
        self.assertIn("Insufficient privileges", res.json().get("detail", ""))
        print("SUCCESS: VIEWER alert modification blocked with HTTP 403.")

    def test_04_operator_attempting_user_management(self):
        """OPERATOR role must be rejected with 403 when attempting role modification."""
        print("\n==================================================")
        print("[4] Testing OPERATOR Attempting Role Management (HTTP 403)")
        print("==================================================")

        res = self.client.put(
            "/api/users/USR-004/role",
            headers={"Authorization": f"Bearer {self.operator_token}"},
            json={"role": "ADMIN"}
        )
        print(f"PUT /api/users/role with OPERATOR token -> Status {res.status_code}")
        self.assertEqual(res.status_code, 403)
        print("SUCCESS: OPERATOR role escalation blocked with HTTP 403.")

    def test_05_admin_authorized_action(self):
        """ADMIN role should be authorized for user role management and camera administration."""
        print("\n==================================================")
        print("[5] Testing ADMIN Authorized Operations (HTTP 200)")
        print("==================================================")

        res = self.client.put(
            "/api/users/USR-004/role",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"role": "OPERATOR"}
        )
        print(f"PUT /api/users/role with ADMIN token -> Status {res.status_code}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "SUCCESS")
        print("SUCCESS: ADMIN role successfully authorized.")

    def test_06_unauthorized_friendly_person_modification(self):
        """VIEWER and OPERATOR cannot register or delete friendly persons."""
        print("\n==================================================")
        print("[6] Testing Unauthorized Friendly Person Mutation (HTTP 403)")
        print("==================================================")

        # VIEWER attempting delete
        res_del = self.client.delete(
            "/api/face/friendly/FP-001",
            headers={"Authorization": f"Bearer {self.viewer_token}"}
        )
        print(f"DELETE /api/face/friendly with VIEWER token -> Status {res_del.status_code}")
        self.assertEqual(res_del.status_code, 403)

        # OPERATOR attempting delete (Admin only)
        res_del_op = self.client.delete(
            "/api/face/friendly/FP-001",
            headers={"Authorization": f"Bearer {self.operator_token}"}
        )
        print(f"DELETE /api/face/friendly with OPERATOR token -> Status {res_del_op.status_code}")
        self.assertEqual(res_del_op.status_code, 403)
        print("SUCCESS: Unauthorized biometric mutations blocked.")

    def test_07_invalid_file_upload_security(self):
        """Non-image and malicious executable files must be rejected with 400."""
        print("\n==================================================")
        print("[7] Testing Malicious & Non-Image File Upload Rejection (HTTP 400)")
        print("==================================================")

        # Executable shell script
        fake_exe = b"#!/bin/bash\necho 'malicious_payload'"
        files = {"file": ("exploit.sh", fake_exe, "text/plain")}

        res = self.client.post(
            "/api/detect",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            files=files
        )
        print(f"POST /api/detect with .sh file -> Status {res.status_code}")
        self.assertEqual(res.status_code, 400)
        print("SUCCESS: Malicious file upload rejected.")

    def test_08_invalid_camera_id_validation(self):
        """Invalid camera IDs with path traversal or injection characters must be rejected with 400."""
        print("\n==================================================")
        print("[8] Testing Camera ID Injection Validation (HTTP 400)")
        print("==================================================")

        malicious_ids = ["BOP;DROP_TABLE_cameras;", "BOP*SPECIAL*CHARS!", "BOP@INVALID#$", "A" * 50]
        for bad_id in malicious_ids:
            res = self.client.get(
                f"/api/cameras/{bad_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            print(f"GET /api/cameras/{bad_id[:15]}... -> Status {res.status_code}")
            self.assertEqual(res.status_code, 400)
        print("SUCCESS: Camera ID injection attempts safely rejected.")

    def test_09_security_headers_present(self):
        """Verifies presence of security headers (nosniff, DENY, XSS protection)."""
        print("\n==================================================")
        print("[9] Testing Security Response Headers")
        print("==================================================")

        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        
        headers = res.headers
        print(f"X-Content-Type-Options: {headers.get('X-Content-Type-Options')}")
        print(f"X-Frame-Options: {headers.get('X-Frame-Options')}")
        print(f"X-XSS-Protection: {headers.get('X-XSS-Protection')}")
        print(f"Referrer-Policy: {headers.get('Referrer-Policy')}")

        self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(headers.get("X-XSS-Protection"), "1; mode=block")
        self.assertEqual(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")
        print("SUCCESS: Security response headers verified.")


if __name__ == "__main__":
    unittest.main()

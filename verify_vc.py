#!/usr/bin/env python3
"""
VC verification script for Docker startup
Verifies Verifiable Credential before starting the application
"""
import os
import sys
import json
import requests
import base64
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.backends import default_backend

# Configuration
# Domain can be configured via environment variable, default to tw7613781.olares.com
OLARES_DOMAIN = os.environ.get("OLARES_DOMAIN", "tw7613781.olares.com")
VERIFY_API_URL = f"https://4c94e3111.{OLARES_DOMAIN}/api/grpc/AuthService/VerifyLicense"
RSA_PUBKEY_API_URL = f"https://api.olares.com/did/domain/faster_search/{OLARES_DOMAIN}"
ENV_VC_KEY = "VERIFIABLE_CREDENTIAL"


def get_rsa_public_key():
    """Fetch RSA public key from API"""
    try:
        response = requests.get(RSA_PUBKEY_API_URL, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get("code") != 0:
            print(f"Error: Failed to get RSA public key, code: {data.get('code')}")
            return None
        
        tags = data.get("data", {}).get("tags", [])
        for tag in tags:
            if tag.get("name") == "rsaPubKey":
                pubkey_hex = tag.get("valueFormated")
                if not pubkey_hex:
                    print("Error: RSA public key valueFormated is empty")
                    return None
                # Remove quotes if present (some APIs return JSON string with quotes)
                if isinstance(pubkey_hex, str):
                    pubkey_hex = pubkey_hex.strip('"')
                return pubkey_hex
        
        print("Error: RSA public key not found in tags")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error: Failed to fetch RSA public key: {e}")
        return None
    except Exception as e:
        print(f"Error: Unexpected error while getting RSA public key: {e}")
        return None


def hex_to_pem(hex_key):
    """Convert hex-encoded RSA public key to PEM format"""
    try:
        # Remove '0x' prefix if present
        if isinstance(hex_key, str) and hex_key.startswith("0x"):
            hex_key = hex_key[2:]

        # Convert hex to bytes
        key_bytes = bytes.fromhex(hex_key)

        # Load as DER format and convert to PEM
        public_key = serialization.load_der_public_key(
            key_bytes, backend=default_backend()
        )
        pem_key = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        return pem_key
    except Exception as e:
        print(f"Error: Failed to convert hex key to PEM: {e}")
        return None


def build_signature_message(data_dict):
    """Build JSON string exactly like the signing side (Node.js JSON.stringify)."""
    # timestamp: Node 端是 number，这里尽量还原为数字
    ts_raw = data_dict.get("timestamp")
    try:
        timestamp = int(ts_raw)
    except (TypeError, ValueError):
        timestamp = ts_raw

    message_obj = {
        # 保持与签名端对象定义顺序一致: timestamp, olaresId, productId
        "timestamp": timestamp,
        "olaresId": data_dict.get("olaresId"),
        "productId": data_dict.get("productId"),
    }

    # Node.js JSON.stringify 默认不加空格、按插入顺序输出 key
    return json.dumps(message_obj, separators=(",", ":"), ensure_ascii=False)


def verify_signature(public_key_pem, signature_b64, data_dict):
    """Verify RSA signature against data using PKCS1v15 + SHA256."""
    try:
        public_key = serialization.load_pem_public_key(
            public_key_pem, backend=default_backend()
        )

        signature_bytes = base64.b64decode(signature_b64)
        message_json = build_signature_message(data_dict)
        message_bytes = message_json.encode("utf-8")

        public_key.verify(
            signature_bytes,
            message_bytes,
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except Exception as e:
        print(f"Error: Signature verification failed: {e}")
        return False


def verify_vc(vc):
    """Verify Verifiable Credential"""
    if not vc:
        print("Error: VERIFIABLE_CREDENTIAL environment variable is not set")
        return False

    # Debug: print basic info about VC (do not print full value to avoid log flooding)
    try:
        print(f"Debug: Using Olares domain: {OLARES_DOMAIN}")
        print(f"Debug: VERIFY_API_URL: {VERIFY_API_URL}")
        print(f"Debug: RSA_PUBKEY_API_URL: {RSA_PUBKEY_API_URL}")
        print(f"Debug: VC length: {len(vc)}")
        # Print VC prefix/suffix for sanity check
        vc_preview_start = vc[:60]
        vc_preview_end = vc[-60:] if len(vc) > 60 else ""
        print(f"Debug: VC prefix: {vc_preview_start}")
        if vc_preview_end:
            print(f"Debug: VC suffix: {vc_preview_end}")
    except Exception as e:
        print(f"Debug: Failed to print VC debug info: {e}")

    # Step 1: Get RSA public key
    print("Fetching RSA public key...")
    rsa_pubkey_hex = get_rsa_public_key()
    if not rsa_pubkey_hex:
        return False
    
    # Step 2: Convert hex key to PEM format
    print("Converting RSA public key to PEM format...")
    rsa_pubkey_pem = hex_to_pem(rsa_pubkey_hex)
    if not rsa_pubkey_pem:
        return False
    
    # Step 3: Call verification API
    print("Calling verification API...")
    try:
        print("Debug: Sending POST request with JSON body: {\"credential\": \"<vc omitted>\"}")
        response = requests.post(
            VERIFY_API_URL,
            json={"credential": vc},
            timeout=30,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        result = response.json()
        print(f"Debug: Raw API response JSON: {json.dumps(result, ensure_ascii=False)}")
        
        if result.get("code") != 0:
            print(f"Error: Verification API returned error, code: {result.get('code')}")
            return False
        
        data = result.get("data")
        if not data:
            print("Error: Verification API response missing data field")
            return False
        
        signature = data.get("signature")
        if not signature:
            print("Error: Verification response missing signature")
            return False

        # Step 4: Verify signature (matches Node.js signing logic)
        print("Verifying signature with RSA public key...")
        if verify_signature(rsa_pubkey_pem, signature, data):
            print("VC verification successful!")
            print(f"Olares ID: {data.get('olaresId')}")
            print(f"Product ID: {data.get('productId')}")
            print(f"Timestamp: {data.get('timestamp')}")
            return True
        else:
            print("Error: Signature verification failed")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Error: Failed to call verification API: {e}")
        return False
    except Exception as e:
        print(f"Error: Unexpected error during verification: {e}")
        return False


def main():
    """Main entry point"""
    vc = os.environ.get(ENV_VC_KEY)
    
    if not verify_vc(vc):
        print("VC verification failed. Container will not start.")
        sys.exit(1)
    
    print("VC verification passed. Proceeding with container startup.")
    sys.exit(0)


if __name__ == "__main__":
    main()

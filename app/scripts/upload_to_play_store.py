#!/usr/bin/env python3
"""
Upload Android AAB to Google Play Store using Workload Identity Federation
This script bypasses Fastlane and uses the Google Play Developer API directly
"""

import os
import sys
import json
import argparse
from pathlib import Path

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.auth import default
except ImportError:
    print("❌ Error: Required packages not installed.")
    print("Run: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
    sys.exit(1)


def get_credentials():
    """Get credentials using ADC (Workload Identity Federation)"""
    print("🔑 Authenticating using Application Default Credentials...")
    try:
        # Use the default() function which properly handles WIF
        # This should work now that the audience is configured correctly
        print("🔄 Using Google's default credential chain...")
        credentials, project = default(scopes=['https://www.googleapis.com/auth/androidpublisher'])
        print(f"✅ Authentication successful! Project: {project}")
        print(f"🔍 Credential type: {type(credentials).__name__}")

        # Ensure credentials are ready for use
        if hasattr(credentials, 'refresh') and hasattr(credentials, 'valid') and not credentials.valid:
            print("🔄 Refreshing credentials...")
            import google.auth.transport.requests
            request = google.auth.transport.requests.Request()
            credentials.refresh(request)
            print("✅ Credentials refreshed successfully")

        return credentials

    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        print(f"❌ Error type: {type(e).__name__}")

        # Debug information
        creds_file = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if creds_file:
            print(f"🔍 Credentials file: {creds_file}")
            if os.path.exists(creds_file):
                try:
                    with open(creds_file, 'r') as f:
                        creds_info = json.load(f)
                    print(f"🔍 Credential type in file: {creds_info.get('type', 'unknown')}")
                    if 'audience' in creds_info:
                        print(f"🔍 Credential audience: {creds_info['audience']}")
                except:
                    print("🔍 Could not read credentials file content")
            else:
                print("🔍 Credentials file does not exist")
        else:
            print("🔍 GOOGLE_APPLICATION_CREDENTIALS not set")

        sys.exit(1)


def should_hold_for_manual_review(track):
    """
    Determine if changes should be held for manual review based on track type.

    Returns True only for production releases or when you need manual control.
    For internal, alpha, beta tracks, changes are automatically sent for review.
    """
    # Only hold for manual review on production track
    # For other tracks (internal, alpha, beta), let changes go for automatic review
    return track == 'production'


def upload_to_play_store(aab_path, package_name, track, credentials):
    """Upload AAB to Google Play Store"""
    print(f"📤 Uploading {aab_path} to Play Store...")

    try:
        # Build the service
        service = build('androidpublisher', 'v3', credentials=credentials)

        # Create an edit
        print("🚀 Creating edit transaction...")
        edit_request = service.edits().insert(body={}, packageName=package_name)
        edit = edit_request.execute()
        edit_id = edit['id']
        print(f"✅ Edit created: {edit_id}")

        # Upload the AAB
        print("📦 Uploading AAB file...")
        media = MediaFileUpload(aab_path, mimetype='application/octet-stream')
        upload_request = service.edits().bundles().upload(
            packageName=package_name,
            editId=edit_id,
            media_body=media
        )
        bundle_response = upload_request.execute()
        version_code = bundle_response['versionCode']
        print(f"✅ AAB uploaded. Version code: {version_code}")

        # Assign to track
        print(f"🎯 Assigning to track: {track}")
        track_request = service.edits().tracks().update(
            packageName=package_name,
            editId=edit_id,
            track=track,
            body={
                'track': track,
                'releases': [{
                    'versionCodes': [str(version_code)],
                    'status': 'completed'
                }]
            }
        )
        track_response = track_request.execute()
        print(f"✅ Assigned to track: {track_response['track']}")

        # Commit the edit
        print("💾 Committing changes...")

        # Determine if we should hold changes for manual review
        hold_for_manual_review = should_hold_for_manual_review(track)

        if hold_for_manual_review:
            # For production or when manual review is needed
            commit_request = service.edits().commit(
                packageName=package_name,
                editId=edit_id,
                changesNotSentForReview=True
            )
            commit_response = commit_request.execute()
            print(f"✅ Upload completed successfully! Edit ID: {commit_response['id']}")
            print(f"📝 Note: Changes committed but held for manual review (production track)")
        else:
            # For internal, alpha, beta tracks - let changes go for automatic review
            commit_request = service.edits().commit(
                packageName=package_name,
                editId=edit_id
            )
            commit_response = commit_request.execute()
            print(f"✅ Upload completed successfully! Edit ID: {commit_response['id']}")
            print(f"📝 Note: Changes committed and sent for automatic review ({track} track)")

        return True

    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Upload Android AAB to Google Play Store using WIF')
    parser.add_argument('--aab', required=True, help='Path to the AAB file')
    parser.add_argument('--package-name', required=True, help='Android package name')
    parser.add_argument('--track', default='internal', help='Release track (internal, alpha, beta, production)')

    args = parser.parse_args()

    # Validate AAB file exists
    aab_path = Path(args.aab)
    if not aab_path.exists():
        print(f"❌ Error: AAB file not found: {aab_path}")
        sys.exit(1)

    print("🚀 Starting Google Play Store upload with Workload Identity Federation")
    print(f"📦 AAB: {aab_path}")
    print(f"📱 Package: {args.package_name}")
    print(f"🎯 Track: {args.track}")
    print()

    # Get credentials and upload
    credentials = get_credentials()
    success = upload_to_play_store(str(aab_path), args.package_name, args.track, credentials)

    if success:
        print("\n🎉 Upload completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Upload failed!")
        sys.exit(1)


if __name__ == '__main__':
    main()

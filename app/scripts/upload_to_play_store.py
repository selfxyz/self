#!/usr/bin/env python3
"""
Upload Android AAB to Google Play Store using Workload Identity Federation
This script bypasses Fastlane and uses the Google Play Developer API directly
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path

try:
    import google_auth_httplib2
    import httplib2
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
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


# Number of low-level retries googleapiclient performs on each request,
# applying exponential backoff to transient 5xx/socket errors.
REQUEST_NUM_RETRIES = 5

# Play can take longer than the httplib2 default socket timeout to process a
# larger bundle upload. Keep this above the observed failure window.
HTTP_TIMEOUT_SECONDS = 600


def build_play_service(credentials):
    """Build the Android Publisher service with an explicit socket timeout."""
    authorized_http = google_auth_httplib2.AuthorizedHttp(
        credentials,
        http=httplib2.Http(timeout=HTTP_TIMEOUT_SECONDS),
    )
    return build(
        'androidpublisher',
        'v3',
        http=authorized_http,
        cache_discovery=False,
    )


def is_version_already_committed_error(exc):
    """True if exc reports the AAB's version code as already used by Play."""
    if not isinstance(exc, HttpError):
        return False
    status = getattr(getattr(exc, 'resp', None), 'status', None)
    try:
        content = exc.content.decode('utf-8', 'replace') if isinstance(exc.content, (bytes, bytearray)) else str(exc.content)
    except Exception:
        content = str(exc)
    needle = content.lower()
    markers = ('already been used', 'already used', 'apkupgradeversionconflict', 'bundleversioncodeused')
    return status in (400, 403, 409) and any(m in needle for m in markers)


def track_contains_version_code(service, package_name, edit_id, track, version_code):
    """Check whether the current edit view of a track contains version_code."""
    track_request = service.edits().tracks().get(
        packageName=package_name,
        editId=edit_id,
        track=track,
    )
    track_response = track_request.execute(num_retries=REQUEST_NUM_RETRIES)
    expected = str(version_code)
    for release in track_response.get('releases', []):
        if expected in {str(code) for code in release.get('versionCodes', [])}:
            return True
    return False


def with_retry(description, fn, max_attempts=3, base_delay=15):
    """Run fn(attempt), retrying the whole operation on transient failures.

    fn receives the 1-based attempt number so it can distinguish a first run
    from a retry. This matters because retrying a Play upload is NOT fully
    idempotent: if a prior attempt committed the edit but its response was
    lost, re-running starts a fresh edit and re-uploads the same version code,
    which Play rejects. fn is expected to recognize that case on attempt > 1,
    verify the track state, and treat it as success only after verification.

    Re-raises the last error once attempts are exhausted so persistent
    failures still fail the job.
    """
    for attempt in range(1, max_attempts + 1):
        try:
            return fn(attempt)
        except Exception as e:
            if attempt < max_attempts:
                delay = base_delay * (2 ** (attempt - 1))
                print(f"⚠️  {description} failed (attempt {attempt}/{max_attempts}): {e}")
                print(f"⏳ Retrying in {delay}s...")
                time.sleep(delay)
            else:
                print(f"❌ {description} failed after {max_attempts} attempts: {e}")
                raise


def should_hold_for_manual_review(track):
    """
    Determine if changes should be held for manual review based on track type.

    Returns True only for production releases or when you need manual control.
    For internal, alpha, beta tracks, changes are automatically sent for review.
    """
    # Only hold for manual review on production track
    # For other tracks (internal, alpha, beta), let changes go for automatic review
    return track == 'production'


def upload_to_internal_app_sharing(aab_path, package_name, credentials):
    """Upload AAB to Google Play Internal App Sharing.

    Returns a unique downloadUrl per upload. Designed for per-PR/per-build
    preview distribution: does NOT advance any track, does NOT require a
    unique versionCode, and does NOT go through review.
    """
    print(f"📤 Uploading {aab_path} to Internal App Sharing...")

    service = build_play_service(credentials)

    media = MediaFileUpload(
        aab_path,
        mimetype='application/octet-stream',
    )
    request = service.internalappsharingartifacts().uploadbundle(
        packageName=package_name,
        media_body=media,
    )
    response = request.execute(num_retries=REQUEST_NUM_RETRIES)

    download_url = response.get('downloadUrl')
    sha256 = response.get('sha256')
    cert_fingerprint = response.get('certificateFingerprint')

    if not download_url:
        raise RuntimeError(f"IAS upload returned no downloadUrl. Response: {response}")

    print(f"✅ Uploaded to Internal App Sharing")
    print(f"🔗 downloadUrl: {download_url}")
    if sha256:
        print(f"🔐 sha256: {sha256}")
    if cert_fingerprint:
        print(f"📜 certificateFingerprint: {cert_fingerprint}")

    # Expose the URL to GitHub Actions via $GITHUB_OUTPUT when available
    github_output = os.environ.get('GITHUB_OUTPUT')
    if github_output:
        with open(github_output, 'a') as f:
            f.write(f"download_url={download_url}\n")
            if sha256:
                f.write(f"sha256={sha256}\n")

    return True


def upload_to_play_store(aab_path, package_name, track, credentials, attempt=1, retry_state=None):
    """Upload AAB to Google Play Store"""
    print(f"📤 Uploading {aab_path} to Play Store...")

    service = build_play_service(credentials)

    # Create an edit
    print("🚀 Creating edit transaction...")
    edit_request = service.edits().insert(body={}, packageName=package_name)
    edit = edit_request.execute(num_retries=REQUEST_NUM_RETRIES)
    edit_id = edit['id']
    print(f"✅ Edit created: {edit_id}")

    # Upload the AAB
    print("📦 Uploading AAB file...")
    media = MediaFileUpload(
        aab_path,
        mimetype='application/octet-stream',
    )
    upload_request = service.edits().bundles().upload(
        packageName=package_name,
        editId=edit_id,
        media_body=media
    )
    try:
        bundle_response = upload_request.execute(num_retries=REQUEST_NUM_RETRIES)
    except HttpError as e:
        if attempt > 1 and is_version_already_committed_error(e):
            expected_version_code = (retry_state or {}).get('version_code')
            if expected_version_code and track_contains_version_code(
                service,
                package_name,
                edit_id,
                track,
                expected_version_code,
            ):
                print("ℹ️  Play reports this version code as already used, and "
                      f"track {track} already contains version code "
                      f"{expected_version_code}. Treating this retry as a "
                      "successful release.")
                return True
            print("⚠️  Play reports this version code as already used, but the "
                  f"expected version code {expected_version_code or 'unknown'} "
                  f"was not found on track {track}. Failing instead of reporting "
                  "an unverified release as successful.")
        raise
    version_code = bundle_response['versionCode']
    if retry_state is not None:
        retry_state['version_code'] = str(version_code)
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
    track_response = track_request.execute(num_retries=REQUEST_NUM_RETRIES)
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
        commit_response = commit_request.execute(num_retries=REQUEST_NUM_RETRIES)
        print(f"✅ Upload completed successfully! Edit ID: {commit_response['id']}")
        print(f"📝 Note: Changes committed but held for manual review (production track)")
    else:
        # For internal, alpha, beta tracks - let changes go for automatic review
        commit_request = service.edits().commit(
            packageName=package_name,
            editId=edit_id
        )
        commit_response = commit_request.execute(num_retries=REQUEST_NUM_RETRIES)
        print(f"✅ Upload completed successfully! Edit ID: {commit_response['id']}")
        print(f"📝 Note: Changes committed and sent for automatic review ({track} track)")

    return True


def query_track(package_name, track, credentials):
    """Print the current Play track releases for package_name."""
    service = build_play_service(credentials)
    edit_request = service.edits().insert(body={}, packageName=package_name)
    edit = edit_request.execute(num_retries=REQUEST_NUM_RETRIES)
    edit_id = edit['id']

    try:
        track_request = service.edits().tracks().get(
            packageName=package_name,
            editId=edit_id,
            track=track,
        )
        track_response = track_request.execute(num_retries=REQUEST_NUM_RETRIES)

        print(f"📍 Track: {track_response.get('track', track)}")
        releases = track_response.get('releases', [])
        if not releases:
            print("No releases found.")
            return True

        for index, release in enumerate(releases, start=1):
            version_codes = ', '.join(str(code) for code in release.get('versionCodes', []))
            status = release.get('status', 'unknown')
            name = release.get('name', '(unnamed)')
            print(f"Release {index}: {name}")
            print(f"  status: {status}")
            print(f"  versionCodes: {version_codes or '(none)'}")

        return True
    finally:
        # query is read-only: discard the edit so it doesn't linger as an
        # "active edit" in the Play Console (Google auto-expires after ~7 days).
        try:
            service.edits().delete(packageName=package_name, editId=edit_id).execute()
        except Exception as cleanup_error:
            print(f"⚠️  Could not delete query edit {edit_id}: {cleanup_error}", flush=True)


def main():
    parser = argparse.ArgumentParser(description='Upload Android AAB to Google Play Store using WIF')
    parser.add_argument('--aab', help='Path to the AAB file. Required unless --mode=query.')
    parser.add_argument('--package-name', required=True, help='Android package name')
    parser.add_argument('--track', default='internal', help='Release track (internal, alpha, beta, production). Ignored when --mode=ias.')
    parser.add_argument('--mode', default='track', choices=['track', 'ias', 'query'],
                        help='Mode: "track" promotes to a Play Store track; "ias" uploads to Internal App Sharing; "query" prints current track releases.')

    args = parser.parse_args()

    # Validate AAB file exists
    aab_path = None
    if args.mode != 'query':
        if not args.aab:
            print("❌ Error: --aab is required unless --mode=query")
            sys.exit(1)
        aab_path = Path(args.aab)
        if not aab_path.exists():
            print(f"❌ Error: AAB file not found: {aab_path}")
            sys.exit(1)

    print("🚀 Starting Google Play upload with Workload Identity Federation")
    if aab_path:
        aab_mib = aab_path.stat().st_size / (1024 * 1024)
        print(f"📦 AAB: {aab_path} ({aab_mib:.1f} MiB)")
    print(f"📱 Package: {args.package_name}")
    print(f"🧭 Mode: {args.mode}")
    if args.mode in ('track', 'query'):
        print(f"🎯 Track: {args.track}")
    print()

    # Get credentials and upload
    credentials = get_credentials()
    try:
        if args.mode == 'ias':
            success = with_retry(
                "Internal App Sharing upload",
                lambda attempt: upload_to_internal_app_sharing(str(aab_path), args.package_name, credentials),
            )
        elif args.mode == 'query':
            success = query_track(args.package_name, args.track, credentials)
        else:
            retry_state = {}
            success = with_retry(
                "Play Store upload",
                lambda attempt: upload_to_play_store(
                    str(aab_path),
                    args.package_name,
                    args.track,
                    credentials,
                    attempt=attempt,
                    retry_state=retry_state,
                ),
            )
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        success = False

    if success:
        print("\n🎉 Upload completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Upload failed!")
        sys.exit(1)


if __name__ == '__main__':
    main()

# SPDX-License-Identifier: BUSL-1.1

require "json"
require "time"

module Fastlane
  module Helpers
    module VersionManager
      extend self

      VERSION_FILE_PATH = File.expand_path("../../version.json", __dir__)

      def read_version_file
        unless File.exist?(VERSION_FILE_PATH)
          UI.user_error!("version.json not found at #{VERSION_FILE_PATH}")
        end

        JSON.parse(File.read(VERSION_FILE_PATH))
      rescue JSON::ParserError => e
        UI.user_error!("Failed to parse version.json: #{e.message}")
      end

      def write_version_file(data)
        File.write(VERSION_FILE_PATH, JSON.pretty_generate(data) + "\n")
        UI.success("Updated version.json")
      rescue => e
        UI.user_error!("Failed to write version.json: #{e.message}")
      end

      def get_current_version
        # Version comes from package.json, not version.json
        package_json_path = File.expand_path("../../package.json", __dir__)
        package_data = JSON.parse(File.read(package_json_path))
        package_data["version"]
      end

      def get_ios_build_number
        data = read_version_file
        data["ios"]["build"]
      end

      def get_android_build_number
        data = read_version_file
        data["android"]["build"]
      end

      def bump_local_build_number(platform)
        unless %w[ios android].include?(platform)
          UI.user_error!("Invalid platform: #{platform}. Must be 'ios' or 'android'")
        end

        data = read_version_file
        data[platform]["build"] += 1

        write_version_file(data)
        UI.success("Bumped #{platform} build number to #{data[platform]["build"]}")

        data[platform]["build"]
      end

      def verify_ci_version_match
        # Verify that versions were pre-set by CI
        unless ENV["CI_VERSION"] && ENV["CI_IOS_BUILD"] && ENV["CI_ANDROID_BUILD"]
          UI.user_error!("CI must set CI_VERSION, CI_IOS_BUILD, and CI_ANDROID_BUILD environment variables")
        end

        pkg_version = get_current_version
        ios_build = get_ios_build_number
        android_build = get_android_build_number

        expected_version = ENV["CI_VERSION"]
        expected_ios_build = ENV["CI_IOS_BUILD"].to_i
        expected_android_build = ENV["CI_ANDROID_BUILD"].to_i

        version_matches = pkg_version == expected_version
        ios_matches = ios_build == expected_ios_build
        android_matches = android_build == expected_android_build

        unless version_matches && ios_matches && android_matches
          UI.error("❌ Version mismatch detected!")
          UI.error("Expected: v#{expected_version} (iOS: #{expected_ios_build}, Android: #{expected_android_build})")
          UI.error("Actual:   v#{pkg_version} (iOS: #{ios_build}, Android: #{android_build})")
          UI.error("")

          # Add specific diagnostics
          UI.error("Mismatched fields:")
          UI.error("  • package.json version") unless version_matches
          UI.error("  • version.json iOS build") unless ios_matches
          UI.error("  • version.json Android build") unless android_matches
          UI.error("")

          UI.error("💡 Common causes:")
          UI.error("  1. version-manager.cjs 'apply' command didn't run in workflow")
          UI.error("  2. Files were modified after version bump was applied")
          UI.error("  3. CI_VERSION, CI_IOS_BUILD, or CI_ANDROID_BUILD env vars are incorrect")
          UI.error("")
          UI.error("🔍 Debug: Check workflow logs for 'Apply version bump' step")

          UI.user_error!("Version verification failed")
        end

        UI.success("✅ Version verification passed:")
        UI.message("   Version: #{pkg_version}")
        UI.message("   iOS Build: #{ios_build}")
        UI.message("   Android Build: #{android_build}")

        { version: pkg_version, ios_build: ios_build, android_build: android_build }
      end

      def update_deployment_timestamp(platform)
        unless %w[ios android].include?(platform)
          UI.user_error!("Invalid platform: #{platform}. Must be 'ios' or 'android'")
        end

        data = read_version_file
        timestamp = Time.now.utc.iso8601

        data[platform]["lastDeployed"] = timestamp

        write_version_file(data)
        UI.success("Updated #{platform} deployment timestamp")
      end

      def sync_build_numbers_to_native
        data = read_version_file
        version = get_current_version

        UI.message("Version #{version} (from package.json)")
        UI.message("iOS build: #{data["ios"]["build"]}")
        UI.message("Android build: #{data["android"]["build"]}")

        # Return the build numbers for use in Fastlane
        {
          ios: data["ios"]["build"],
          android: data["android"]["build"],
        }
      end
    end
  end
end

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

      def bump_ios_build_number
        data = read_version_file
        current = data["ios"]["build"]
        data["ios"]["build"] = current + 1
        write_version_file(data)
        UI.success("iOS build number bumped from #{current} to #{data["ios"]["build"]}")
        data["ios"]["build"]
      end

      def bump_android_build_number
        data = read_version_file
        current = data["android"]["build"]
        data["android"]["build"] = current + 1
        write_version_file(data)
        UI.success("Android build number bumped from #{current} to #{data["android"]["build"]}")
        data["android"]["build"]
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

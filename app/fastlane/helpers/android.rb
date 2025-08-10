# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

module Fastlane
  module Helpers
    module Android
      @@android_has_permissions = false

      def self.set_permissions(value)
        @@android_has_permissions = value
      end

      # Decode keystore from ENV for local development
      def android_create_keystore(path)
        return nil unless ENV["ANDROID_KEYSTORE"]

        FileUtils.mkdir_p(File.dirname(path))
        File.write(path, Base64.decode64(ENV["ANDROID_KEYSTORE"]))
        File.realpath(path)
      end

      # Decode Play Store JSON key from ENV
      def android_create_play_store_key(path)
        return nil unless ENV["ANDROID_PLAY_STORE_JSON_KEY_BASE64"]

        FileUtils.mkdir_p(File.dirname(path))
        File.write(path, Base64.decode64(ENV["ANDROID_PLAY_STORE_JSON_KEY_BASE64"]))
        File.realpath(path)
      end

      # Verify that the current version code is greater than the latest version on Play Store
      # This method compares the versionCode in the gradle file against the latest version
      # published on the Play Store internal track to ensure no version conflicts occur
      #
      # @param gradle_file [String] Path to the build.gradle file containing versionCode
      # @return [void] Reports success or error based on version comparison
      def android_verify_version_code(gradle_file)
        latest = Fastlane::Actions::GooglePlayTrackVersionCodesAction.run(
          track: "internal",
          json_key: ENV["ANDROID_PLAY_STORE_JSON_KEY_PATH"],
          package_name: ENV["ANDROID_PACKAGE_NAME"],
        ).first

        line = File.readlines(gradle_file).find { |l| l.include?("versionCode") }
        return report_error(
                 "Could not find versionCode in gradle file",
                 "Please ensure the gradle file contains a valid versionCode declaration",
                 "Version code verification failed"
               ) unless line

        match = line.match(/versionCode\s+(\d+)/)
        return report_error(
                 "Could not parse versionCode from gradle file",
                 "Expected format: versionCode <number>",
                 "Version code verification failed"
               ) unless match

        current = match[1].to_i

        if current <= latest
          report_error(
            "Version code must be greater than latest Play Store version!",
            "Latest: #{latest} Current: #{current}",
            "Version code verification failed"
          )
        else
          report_success("Version code verified (Current: #{current}, Latest: #{latest})")
        end
      end

      # Increment version code locally (Play Store fetch disabled)
      def android_increment_version_code(gradle_file)
        full = File.expand_path(gradle_file)
        raise "Could not find build.gradle" unless File.exist?(full)
        content = File.read(full)
        match = content.match(/versionCode\s+(\d+)/)

        raise "Could not find versionCode in gradle file. Expected format: versionCode <number>" unless match

        current = match[1].to_i
        new_version = current + 1
        if @@android_has_permissions
          File.write(full, content.gsub(/versionCode\s+\d+/, "versionCode #{new_version}"))
          report_success("Version code incremented from #{current} to #{new_version} and written to file")
          new_version
        else
          report_success("Version code incremented from #{current} to #{new_version} (read-only mode)")
          current
        end
      end
    end
  end
end

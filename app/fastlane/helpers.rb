require 'fastlane'

module Fastlane
  module Helpers
    def self.report_error(message, suggestion = nil, abort_message = nil)
      UI.error("❌ #{message}")
      UI.error(suggestion) if suggestion
      UI.abort_with_message!(abort_message || message)
    end

    def self.report_success(message)
      UI.success("✅ #{message}")
    end

    def self.verify_env_vars(required_vars)
      missing_vars = required_vars.select { |var| ENV[var].nil? || ENV[var].to_s.strip.empty? }
      
      if missing_vars.any?
        report_error(
          "Missing required environment variables: #{missing_vars.join(', ')}",
          "Please check your .env.secrets file",
          "Environment verification failed"
        )
      else
        report_success("All required environment variables are present")
      end
    end

    def self.should_upload_app(platform)
      if ENV["ACT"]
        puts "Skipping upload to #{platform} we are testing using `act`"
        return false
      end

      if ENV['IS_PR']
        puts "Skipping upload to #{platform} because we are in a pull request"
        return false
      end

      # if we are in CI, upload the app
      ENV['CI']
    end

    def self.verify_ios_app_store_build_number
      api_key = Fastlane::Actions::AppStoreConnectApiKeyAction.run(
        key_id: ENV["IOS_CONNECT_KEY_ID"],
        issuer_id: ENV["IOS_CONNECT_ISSUER_ID"],
        key_content: ENV["IOS_CONNECT_API_KEY"],
        in_house: false
      )
      
      latest_build = Fastlane::Actions::LatestTestflightBuildNumberAction.run(
        api_key: api_key,
        app_identifier: ENV["IOS_APP_IDENTIFIER"],
        platform: "ios"
      )
      
      project = Xcodeproj::Project.open("../ios/Self.xcodeproj")
      target = project.targets.first
      current_build = target.build_configurations.first.build_settings["CURRENT_PROJECT_VERSION"]
      
      if current_build.to_i <= latest_build.to_i
        report_error(
          "Build number must be greater than latest TestFlight build!",
          "Latest TestFlight build: #{latest_build}\nCurrent build: #{current_build}\nPlease increment the build number in the project settings",
          "Build number verification failed"
        )
      else
        report_success("Build number verified (Current: #{current_build}, Latest TestFlight: #{latest_build})")
      end
    end

    def self.verify_android_version_code
      latest_version = Fastlane::Actions::GooglePlayTrackVersionCodesAction.run(
        track: "internal",
        json_key_data: ENV["ANDROID_PLAY_STORE_JSON_KEY"]
      ).first

      gradle_file = "../android/app/build.gradle"
      version_code_line = File.readlines(gradle_file).find { |line| line.include?("versionCode") }
      current_version = version_code_line.match(/versionCode\s+(\d+)/)[1].to_i

      if current_version <= latest_version
        report_error(
          "Version code must be greater than latest Play Store version!",
          "Latest Play Store version: #{latest_version}\nCurrent version: #{current_version}\nPlease increment the version code in android/app/build.gradle",
          "Version code verification failed"
        )
      else
        report_success("Version code verified (Current: #{current_version}, Latest Play Store: #{latest_version})")
      end
    end

    def self.create_android_keystore
      keystore_path = "../android/app/upload-keystore.jks"
      if ENV["ANDROID_KEYSTORE"]
        puts "Decoding Android keystore..."
        FileUtils.mkdir_p(File.dirname(keystore_path))
        File.write(keystore_path, Base64.decode64(ENV["ANDROID_KEYSTORE"]))
      end

      File.realpath(keystore_path)
    end
  end
end 
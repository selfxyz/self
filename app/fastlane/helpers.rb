require 'fastlane'

module Fastlane
  module Helpers
    # UI and Reporting Methods
    def self.report_error(message, suggestion = nil, abort_message = nil)
      UI.error("❌ #{message}")
      UI.error(suggestion) if suggestion
      UI.abort_with_message!(abort_message || message)
    end

    def self.report_success(message)
      UI.success("✅ #{message}")
    end

    # Environment and Configuration Methods
    def self.verify_env_vars(required_vars)
      missing_vars = required_vars.select { |var| ENV[var].nil? || ENV[var].to_s.strip.empty? }
      
      if missing_vars.any?
        report_error(
          "Missing required environment variables: #{missing_vars.join(', ')}",
          "Please check your secrets",
          "Environment verification failed"
        )
      else
        report_success("All required environment variables are present")
      end
    end

    def self.should_upload_app(platform)
      if ENV["ACT"] == 'true'
        puts "Skipping upload to #{platform} we are testing using `act`"
        return false
      end

      if ENV['IS_PR'] == 'true'
        puts "Skipping upload to #{platform} because we are in a pull request"
        return false
      end

      # upload app if we are in CI or forcing local upload
      ENV['CI'] == 'true' || ENV['FORCE_UPLOAD_LOCAL_DEV'] == 'true'
    end

    def self.confirm_force_upload
      UI.important "⚠️  FORCE_UPLOAD_LOCAL_DEV is set to true. This will upload the build to the store."
      UI.important "Are you sure you want to continue? (y/n)"
      response = STDIN.gets.chomp
      unless response.downcase == 'y'
        UI.user_error!("Upload cancelled by user")
      end
    end

    def self.with_retry(max_retries: 3, delay: 5)
      attempts = 0
      begin
        yield
      rescue => e
        attempts += 1
        if attempts < max_retries
          UI.important("Retry ##{attempts} after error: #{e.message}")
          sleep(delay)
          retry
        else
          UI.user_error!("Failed after #{max_retries} retries: #{e.message}")
        end
      end
    end

    # iOS-specific Methods
    def self.setup_ios_connect_api_key
      api_key_path = File.expand_path("../../ios/certs/connect_api_key.p8", __FILE__)
      ENV["IOS_CONNECT_API_KEY_PATH"] = api_key_path
      create_ios_connect_api_key(api_key_path)

      # confirm file exists
      unless File.exist?(api_key_path)
        UI.user_error!("Connect API key file not found at: #{api_key_path}")
      end
    end

    def self.create_ios_connect_api_key(api_key_path)
      if ENV["IOS_CONNECT_API_KEY_BASE64"]
        puts "Decoding iOS Connect API key..."
        FileUtils.mkdir_p(File.dirname(api_key_path))
        File.write(api_key_path, Base64.decode64(ENV["IOS_CONNECT_API_KEY_BASE64"]))
      end

      File.realpath(api_key_path)
    end

    def self.verify_distribution_certificate
      unless File.exist?(ENV["IOS_DIST_CERT_PATH"])
        report_error(
          "Distribution certificate not found at #{ENV["IOS_DIST_CERT_PATH"]}",
          "Please ensure the distribution certificate is present in the ios/certs directory",
          "Certificate verification failed"
        )
      end

      cert_size = File.size(ENV["IOS_DIST_CERT_PATH"])
      if cert_size == 0
        report_error(
          "Distribution certificate at #{ENV["IOS_DIST_CERT_PATH"]} is empty",
          "Please ensure the distribution certificate has valid contents",
          "Certificate verification failed"
        )
      end

      report_success("Distribution certificate verified")
    end

    def self.verify_ios_app_store_build_number(project_name)
      api_key = Fastlane::Actions::AppStoreConnectApiKeyAction.run(
        key_id: ENV["IOS_CONNECT_KEY_ID"],
        issuer_id: ENV["IOS_CONNECT_ISSUER_ID"],
        key_filepath: ENV["IOS_CONNECT_API_KEY_PATH"],
        in_house: false
      )
      
      latest_build = Fastlane::Actions::LatestTestflightBuildNumberAction.run(
        api_key: api_key,
        app_identifier: ENV["IOS_APP_IDENTIFIER"],
        platform: "ios"
      )
      
      project = Xcodeproj::Project.open("../ios/#{project_name}.xcodeproj")
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

    def self.ensure_apple_generic_versioning(project_name)
      project_path = "../ios/#{project_name}.xcodeproj"
      puts "Opening Xcode project at: #{File.expand_path(project_path)}"
      
      unless File.exist?(project_path)
        report_error(
          "Xcode project not found at #{project_path}",
          "Please ensure you're running this command from the correct directory",
          "Project file not found"
        )
      end
      
      project = Xcodeproj::Project.open(project_path)
      
      project.targets.each do |target|
        target.build_configurations.each do |config|
          if config.build_settings['VERSIONING_SYSTEM'] != 'apple-generic'
            puts "Enabling Apple Generic Versioning for #{target.name} - #{config.name}"
            config.build_settings['VERSIONING_SYSTEM'] = 'apple-generic'
            config.build_settings['CURRENT_PROJECT_VERSION'] ||= '1'
          end
        end
      end
      
      project.save
      report_success("Enabled Apple Generic Versioning in Xcode project")
    end

    def self.increment_build_number_from_testflight(project_name)
      # First ensure Apple Generic Versioning is enabled
      ensure_apple_generic_versioning(project_name)
      
      api_key = Fastlane::Actions::AppStoreConnectApiKeyAction.run(
        key_id: ENV["IOS_CONNECT_KEY_ID"],
        issuer_id: ENV["IOS_CONNECT_ISSUER_ID"],
        key_filepath: ENV["IOS_CONNECT_API_KEY_PATH"],
        in_house: false
      )
      
      latest_build = Fastlane::Actions::LatestTestflightBuildNumberAction.run(
        api_key: api_key,
        app_identifier: ENV["IOS_APP_IDENTIFIER"],
        platform: "ios"
      )
      
      Fastlane::Actions::IncrementBuildNumberAction.run(
        build_number: latest_build + 1,
        xcodeproj: "../ios/#{project_name}.xcodeproj"
      )
      
      report_success("Incremented build number to #{latest_build + 1} (previous TestFlight build: #{latest_build})")
    end

    # Android-specific Methods
    def self.create_android_keystore
      keystore_path = "../android/app/upload-keystore.jks"
      if ENV["ANDROID_KEYSTORE"]
        puts "Decoding Android keystore..."
        FileUtils.mkdir_p(File.dirname(keystore_path))
        File.write(keystore_path, Base64.decode64(ENV["ANDROID_KEYSTORE"]))
      end

      File.realpath(keystore_path)
    end

    def self.verify_android_version_code
      latest_version = Fastlane::Actions::GooglePlayTrackVersionCodesAction.run(
        track: "internal",
        json_key: ENV["ANDROID_PLAY_STORE_KEY_PATH"]
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

    def self.increment_version_code_from_play_store
      latest_version = Fastlane::Actions::GooglePlayTrackVersionCodesAction.run(
        track: "internal",
        json_key: ENV["ANDROID_PLAY_STORE_KEY_PATH"],
        package_name: ENV["ANDROID_PACKAGE_NAME"]
      ).first || 0
      
      new_version = latest_version + 1
      
      Fastlane::Actions::IncrementVersionCodeAction.run(
        version_code: new_version,
        gradle_file_path: "android/app/build.gradle"
      )
      
      report_success("Incremented version code to #{new_version} (previous Play Store version: #{latest_version})")
      
      new_version
    end
  end
end 
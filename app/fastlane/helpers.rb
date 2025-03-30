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

    ### iOS-specific Methods ###

    def self.ios_verify_app_store_build_number(project_name)
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

    def self.ios_ensure_generic_versioning(project_name)
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

    def self.ios_increment_build_number(project_name)
      # First ensure Apple Generic Versioning is enabled
      ios_ensure_generic_versioning(project_name)
      
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

    def self.ios_dev_setup_connect_api_key
      api_key_path = File.expand_path("../../ios/certs/connect_api_key.p8", __FILE__)
      ENV["IOS_CONNECT_API_KEY_PATH"] = api_key_path
      ios_dev_create_connect_api_key(api_key_path)

      # confirm file exists
      unless File.exist?(api_key_path)
        UI.user_error!("Connect API key file not found at: #{api_key_path}")
      end
    end

    def self.ios_dev_create_connect_api_key(api_key_path)
      if ENV["IOS_CONNECT_API_KEY_BASE64"]
        puts "Decoding iOS Connect API key..."
        FileUtils.mkdir_p(File.dirname(api_key_path))
        File.write(api_key_path, Base64.decode64(ENV["IOS_CONNECT_API_KEY_BASE64"]))
      end

      File.realpath(api_key_path)
    end

    # TODO: fix this

    # def self.ios_dev_setup_provisioning_profile
    #   profile_path = ios_dev_get_provisioning_profile_path
    #   FileUtils.cp(profile_path, ENV["IOS_PROV_PROFILE_PATH"])
    #   report_success("Provisioning profile copied to: #{ENV['IOS_PROV_PROFILE_PATH']}")
    # end

    # def self.ios_dev_get_provisioning_profile_path
    #   profile_name = ENV["IOS_PROV_PROFILE_NAME"]
    #   profile_path = File.expand_path("../../ios/certs/#{profile_name}.mobileprovision", __FILE__)
      
    #   unless File.exist?(profile_path)
    #     report_error(
    #       "Provisioning profile not found at: #{profile_path}",
    #       "Please ensure the profile is downloaded and placed in the correct location",
    #       "Provisioning profile not found"
    #     )
    #   end
      
    #   profile_path
    # end

    def self.ios_verify_provisioning_profile
      puts "Verifying provisioning profile at: #{ENV['IOS_PROV_PROFILE_PATH']}"

      # check if file exists
      unless File.exist?(ENV["IOS_PROV_PROFILE_PATH"])
        report_error("Provisioning profile not found at: #{ENV['IOS_PROV_PROFILE_PATH']}")
      end

      report_success("iOS provisioning profile verified successfully")
    end

    ### Android-specific Methods ###

    def self.android_create_keystore
      keystore_path = "../android/app/upload-keystore.jks"
      if ENV["ANDROID_KEYSTORE"]
        puts "Decoding Android keystore..."
        FileUtils.mkdir_p(File.dirname(keystore_path))
        File.write(keystore_path, Base64.decode64(ENV["ANDROID_KEYSTORE"]))
      end

      File.realpath(keystore_path)
    end

    def self.android_create_play_store_key
      key_path = "../android/app/play-store-key.json"
      if ENV["ANDROID_PLAY_STORE_JSON_KEY_BASE64"]
        puts "Decoding Android Play Store JSON key..."
        FileUtils.mkdir_p(File.dirname(key_path))
        File.write(key_path, Base64.decode64(ENV["ANDROID_PLAY_STORE_JSON_KEY_BASE64"]))
      end

      File.realpath(key_path)
    end

    # this method is not used
    # if we ever get the correct json key permissions re-enable
    def self.android_verify_version_code
      latest_version = Fastlane::Actions::GooglePlayTrackVersionCodesAction.run(
        track: "internal",
        json_key: ENV["ANDROID_PLAY_STORE_JSON_KEY_PATH"],
        package_name: ENV["ANDROID_PACKAGE_NAME"]
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
    
    def self.android_increment_version_code
      gradle_file = "../android/app/build.gradle"
      gradle_file_path = File.expand_path(gradle_file, File.dirname(__FILE__))
      
      unless File.exist?(gradle_file_path)
        UI.error("Could not find build.gradle at: #{gradle_file_path}")
        UI.user_error!("Please ensure the Android project is properly set up")
      end
      
      # Read current version code
      gradle_content = File.read(gradle_file_path)
      version_code_match = gradle_content.match(/versionCode\s+(\d+)/)
      current_version_code = version_code_match ? version_code_match[1].to_i : 0
      new_version = current_version_code + 1
      
      # Update version code in file
      updated_content = gradle_content.gsub(/versionCode\s+\d+/, "versionCode #{new_version}")
      File.write(gradle_file_path, updated_content)
      
      report_success("Version code incremented from #{current_version_code} to #{new_version}")
      new_version
    end

    # Helper to log keychain diagnostics
    def self.log_keychain_diagnostics(certificate_name)
      puts "--- Fastlane Pre-Build Diagnostics ---"
      begin
        sh "echo 'Running as user: $(whoami)'"
        sh "echo 'Default keychain:'"
        sh "security list-keychains -d user"
        sh "echo 'Identities in build.keychain:'"
        # Use the absolute path expected in the GH runner environment
        keychain_path = "/Users/runner/Library/Keychains/build.keychain-db"
        sh "security find-identity -v -p codesigning #{keychain_path} || echo 'No identities found or build.keychain doesn\'t exist at #{keychain_path}'"
      rescue => e
        puts "Error running security command: #{e.message}"
      end
      puts "Certificate name constructed by Fastlane: #{certificate_name}"
      puts "--- End Fastlane Diagnostics ---"
    end
  end
end 
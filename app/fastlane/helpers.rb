require 'fastlane'
require 'tempfile'
require 'fileutils'
require 'base64'
require 'shellwords'

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

    def self.ios_verify_app_store_build_number(ios_xcode_profile_path)
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
      
      project = Xcodeproj::Project.open(ios_xcode_profile_path)
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

    def self.ios_ensure_generic_versioning(ios_xcode_profile_path)
      puts "Opening Xcode project at: #{File.expand_path(ios_xcode_profile_path)}"
      
      unless File.exist?(ios_xcode_profile_path)
        report_error(
          "Xcode project not found at #{project_path}",
          "Please ensure you're running this command from the correct directory",
          "Project file not found"
        )
      end
      
      project = Xcodeproj::Project.open(ios_xcode_profile_path)
      
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

    def self.ios_increment_build_number(ios_xcode_profile_path)
      # First ensure Apple Generic Versioning is enabled
      ios_ensure_generic_versioning(ios_xcode_profile_path)
      
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
        xcodeproj: ios_xcode_profile_path
      )
      
      report_success("Incremented build number to #{latest_build + 1} (previous TestFlight build: #{latest_build})")
    end

    def self.ios_dev_setup_certificate
      unless ENV["IOS_DIST_CERT_BASE64"]
        report_error(
          "Missing IOS_DIST_CERT_BASE64 environment variable.",
          "This variable is required for local certificate installation.",
          "Certificate installation failed"
        )
      end
      unless ENV["IOS_P12_PASSWORD"]
        report_error(
          "Missing IOS_P12_PASSWORD environment variable.",
          "This password is required to import the certificate (.p12 file).",
          "Certificate installation failed"
        )
      end

      decoded_cert_data = Base64.decode64(ENV["IOS_DIST_CERT_BASE64"])
      if decoded_cert_data.empty?
        report_error(
          "IOS_DIST_CERT_BASE64 seems to be empty or invalid.",
          "Please check the value of the environment variable.",
          "Certificate decoding failed"
        )
      end

      cert_password = ENV['IOS_P12_PASSWORD'] || ''
      temp_p12 = nil

      begin
        temp_p12 = Tempfile.new(['fastlane_local_cert', '.p12'])
        temp_p12.binmode
        temp_p12.write(decoded_cert_data)
        temp_p12.close
        puts "Temporarily wrote decoded certificate to: #{temp_p12.path}"

        # Import the certificate into the default keychain
        # Omitting -k targets the default keychain.
        # -T /usr/bin/codesign allows codesign to use the key without prompting every time.
        import_command = "security import #{Shellwords.escape(temp_p12.path)} -P #{Shellwords.escape(cert_password)} -T /usr/bin/codesign"
        puts "Running: #{import_command}"
        import_output = `#{import_command} 2>&1`

        unless $?.success?
           report_error(
            "Failed to import certificate into default keychain.",
            "Command: #{import_command}\nOutput: #{import_output}",
            "Certificate import failed"
          )
        end
        report_success("Certificate imported successfully into default keychain.")

      rescue => e
        report_error("An error occurred during certificate installation: #{e.message}", e.backtrace.join("\n"), "Certificate installation failed")
      ensure
        # Clean up temporary file
        if temp_p12
          temp_p12.unlink
          puts "Cleaned up temp certificate: #{temp_p12.path}"
        end
      end
    end

    def self.ios_dev_setup_connect_api_key(api_key_path)
      api_key_full_path = File.expand_path(api_key_path, File.dirname(__FILE__))
      ENV["IOS_CONNECT_API_KEY_PATH"] = api_key_full_path

      if ENV["IOS_CONNECT_API_KEY_BASE64"]
        puts "Decoding iOS Connect API key..."
        begin
          decoded_key = Base64.decode64(ENV["IOS_CONNECT_API_KEY_BASE64"])
          if decoded_key.empty?
             report_error(
               "IOS_CONNECT_API_KEY_BASE64 seems to be empty or invalid.",
               "Please check the value of the environment variable.",
               "Connect API Key decoding failed"
             )
          end
          FileUtils.mkdir_p(File.dirname(api_key_full_path))
          File.write(api_key_full_path, decoded_key)
          report_success("Connect API Key written to: #{api_key_full_path}")
        rescue => e
          report_error("Error writing decoded API key: #{e.message}", nil, "Connect API Key setup failed")
        end
      elsif !File.exist?(api_key_full_path)
        report_error(
          "IOS_CONNECT_API_KEY_BASE64 not set and key file not found.",
          "Please provide the key via environment variable or ensure it exists at #{api_key_full_path}",
          "Connect API Key setup failed"
        )
      else
         puts "Using existing Connect API Key at: #{api_key_full_path}"
      end

      begin
        verified_path = File.realpath(api_key_full_path)
        puts "Verified Connect API Key path: #{verified_path}"
        verified_path
      rescue Errno::ENOENT
         report_error("Connect API Key file not found at expected location: #{api_key_full_path}", nil, "Connect API Key verification failed")
      end
    end

    def self.ios_dev_setup_provisioning_profile(provisioning_profile_directory)
      unless ENV["IOS_PROV_PROFILE_BASE64"]
        report_error(
          "Missing IOS_PROV_PROFILE_BASE64 environment variable.",
          "This variable is required for local development profile setup.",
          "Provisioning profile setup failed"
        )
      end

      decoded_profile_data = Base64.decode64(ENV["IOS_PROV_PROFILE_BASE64"])
      if decoded_profile_data.empty?
        report_error(
          "IOS_PROV_PROFILE_BASE64 seems to be empty or invalid.",
          "Please check the value of the environment variable.",
          "Provisioning profile decoding failed"
        )
      end

      temp_profile = nil
      temp_plist = nil
      final_path = nil

      begin
        temp_profile = Tempfile.new(['fastlane_local_profile', '.mobileprovision'])
        temp_profile.binmode
        temp_profile.write(decoded_profile_data)
        temp_profile.close
        puts "Temporarily wrote decoded profile to: #{temp_profile.path}"

        temp_plist = Tempfile.new(['fastlane_temp_plist', '.plist'])
        temp_plist_path = temp_plist.path
        temp_plist.close
        puts "Temporary plist path: #{temp_plist_path}"

        security_command = "security cms -D -i #{Shellwords.escape(temp_profile.path)} -o #{Shellwords.escape(temp_plist_path)}"
        puts "Running: #{security_command}"
        security_output = `#{security_command} 2>&1`

        unless $?.success?
          report_error(
            "Failed to extract plist from provisioning profile using security cms.",
            "Command failed: #{security_command}\nOutput: #{security_output}",
            "Provisioning profile UUID extraction failed"
          )
        end
        puts "Successfully extracted plist."

        unless File.exist?(temp_plist_path) && File.size(temp_plist_path) > 0
           report_error(
             "Plist file was not created or is empty after security command.",
             "Expected plist at: #{temp_plist_path}",
            "Provisioning profile UUID extraction failed"
          )
        end

        plistbuddy_command = "/usr/libexec/PlistBuddy -c \"Print :UUID\" #{Shellwords.escape(temp_plist_path)}"
        puts "Running: #{plistbuddy_command}"
        profile_uuid = `#{plistbuddy_command} 2>&1`.strip

        unless $?.success? && !profile_uuid.empty? && profile_uuid !~ /does not exist/
           report_error(
            "Failed to extract UUID using PlistBuddy or UUID was empty.",
            "Command: #{plistbuddy_command}\nOutput: #{profile_uuid}",
            "Provisioning profile UUID extraction failed"
          )
        end
        report_success("Extracted profile UUID: #{profile_uuid}")

        profile_dir = File.expand_path(provisioning_profile_directory)
        FileUtils.mkdir_p(profile_dir)
        final_path = File.join(profile_dir, "#{profile_uuid}.mobileprovision")

        puts "Copying profile to: #{final_path}"
        FileUtils.cp(temp_profile.path, final_path)
        report_success("Provisioning profile installed successfully.")

        ENV['IOS_PROV_PROFILE_PATH'] = final_path

      rescue => e
        report_error("An error occurred during provisioning profile setup: #{e.message}", e.backtrace.join("\n"), "Provisioning profile setup failed")
      ensure
        if temp_profile
          temp_profile.unlink
          puts "Cleaned up temp profile: #{temp_profile.path}"
        end
         if temp_plist_path && File.exist?(temp_plist_path)
          File.unlink(temp_plist_path)
          puts "Cleaned up temp plist: #{temp_plist_path}"
        end
      end

      final_path
    end

    def self.ios_verify_provisioning_profile
      profile_path = ENV['IOS_PROV_PROFILE_PATH']

      unless profile_path && !profile_path.empty?
         report_error(
          "ENV['IOS_PROV_PROFILE_PATH'] is not set.",
          "Ensure ios_dev_setup_provisioning_profile ran successfully or the path is set correctly in CI.",
          "Provisioning profile verification failed"
         )
      end

      puts "Verifying provisioning profile exists at: #{profile_path}"

      begin
        File.realpath(profile_path)
        report_success("iOS provisioning profile verified successfully at #{profile_path}")
      rescue Errno::ENOENT
        report_error("Provisioning profile not found at: #{profile_path}")
      rescue => e
         report_error("Error accessing provisioning profile at #{profile_path}: #{e.message}")
      end

      # Print current user
      current_user = ENV['USER'] || `whoami`.strip
      puts "Current user: #{current_user}"

      # List all provisioning profiles in user's directory
      profiles_dir = File.expand_path("~/Library/MobileDevice/Provisioning Profiles")
      if Dir.exist?(profiles_dir)
        puts "Listing mobile provisioning profiles in #{profiles_dir}:"
        profiles = Dir.glob(File.join(profiles_dir, "*.mobileprovision"))
        if profiles.empty?
          puts "  No provisioning profiles found"
        else
          profiles.each do |profile|
            uuid = File.basename(profile, ".mobileprovision")
            puts "  - #{uuid}.mobileprovision"
          end
          puts "Total provisioning profiles found: #{profiles.count}"
        end
      else
        puts "Provisioning profiles directory not found at: #{profiles_dir}"
      end
      
      # Advanced checks for provisioning profile
      puts "\n--- Advanced Provisioning Profile Diagnostics ---"
      
      # Check if profile can be parsed
      if File.exist?(profile_path)
        puts "Testing if profile can be parsed with security tool:"
        temp_plist = Tempfile.new(['profile_info', '.plist'])
        begin
          security_cmd = "security cms -D -i #{Shellwords.escape(profile_path)} -o #{Shellwords.escape(temp_plist.path)}"
          security_output = `#{security_cmd} 2>&1`
          security_success = $?.success?
          
          if security_success
            puts "✅ Profile can be parsed successfully"
            
            # Extract and display important profile information
            puts "\nExtracting profile information:"
            
            # Get profile UUID
            uuid_cmd = "/usr/libexec/PlistBuddy -c 'Print :UUID' #{Shellwords.escape(temp_plist.path)}"
            uuid = `#{uuid_cmd}`.strip
            puts "Profile UUID: #{uuid}"
            
            # Get App ID/Bundle ID
            app_id_cmd = "/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' #{Shellwords.escape(temp_plist.path)}"
            app_id = `#{app_id_cmd}`.strip
            puts "App Identifier: #{app_id}"
            
            # Get Team ID
            team_id_cmd = "/usr/libexec/PlistBuddy -c 'Print :TeamIdentifier:0' #{Shellwords.escape(temp_plist.path)}"
            team_id = `#{team_id_cmd}`.strip
            puts "Team Identifier: #{team_id}"
            
            # Get profile type (development, distribution, etc.)
            profile_type_cmd = "/usr/libexec/PlistBuddy -c 'Print :Entitlements:get-task-allow' #{Shellwords.escape(temp_plist.path)} 2>/dev/null"
            get_task_allow = `#{profile_type_cmd}`.strip.downcase
            
            if get_task_allow == "true"
              puts "Profile Type: Development"
            else
              distribution_cmd = "/usr/libexec/PlistBuddy -c 'Print :ProvisionsAllDevices' #{Shellwords.escape(temp_plist.path)} 2>/dev/null"
              provisions_all = `#{distribution_cmd}`.strip.downcase
              
              if provisions_all == "true"
                puts "Profile Type: Enterprise Distribution"
              else
                puts "Profile Type: App Store Distribution"
              end
            end
            
            # Get expiration date
            expiration_cmd = "/usr/libexec/PlistBuddy -c 'Print :ExpirationDate' #{Shellwords.escape(temp_plist.path)}"
            expiration = `#{expiration_cmd}`.strip
            puts "Expiration Date: #{expiration}"
          else
            puts "❌ Failed to parse profile: #{security_output}"
          end
        ensure
          temp_plist.close
          temp_plist.unlink
        end
      end
      
      # Check code signing identities
      puts "\nInspecting code signing identities:"
      signing_identities = `security find-identity -v -p codesigning 2>&1`
      puts signing_identities
      
      # Check keychain configuration
      puts "\nKeychain configuration:"
      puts `security list-keychains -d user 2>&1`
      
      # Check Xcode configuration
      puts "\nXcode code signing search paths:"
      puts "Provisioning profiles search path: ~/Library/MobileDevice/Provisioning Profiles/"
      puts "Recommended check: In Xcode settings, verify your Apple ID is correctly logged in"
      
      puts "--- End of Provisioning Profile Diagnostics ---\n"
    end

    ### Android-specific Methods ###

    def self.android_create_keystore(keystore_path)
      if ENV["ANDROID_KEYSTORE"]
        puts "Decoding Android keystore..."
        FileUtils.mkdir_p(File.dirname(keystore_path))
        File.write(keystore_path, Base64.decode64(ENV["ANDROID_KEYSTORE"]))
      end

      File.realpath(keystore_path)
    end

    def self.android_create_play_store_key(key_path)
      if ENV["ANDROID_PLAY_STORE_JSON_KEY_BASE64"]
        puts "Decoding Android Play Store JSON key..."
        FileUtils.mkdir_p(File.dirname(key_path))
        File.write(key_path, Base64.decode64(ENV["ANDROID_PLAY_STORE_JSON_KEY_BASE64"]))
      end

      File.realpath(key_path)
    end

    # unused to do api key permissions
    def self.android_verify_version_code(gradle_file_path)
      latest_version = Fastlane::Actions::GooglePlayTrackVersionCodesAction.run(
        track: "internal",
        json_key: ENV["ANDROID_PLAY_STORE_JSON_KEY_PATH"],
        package_name: ENV["ANDROID_PACKAGE_NAME"]
      ).first

      version_code_line = File.readlines(gradle_file_path).find { |line| line.include?("versionCode") }
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
    
    def self.android_increment_version_code(gradle_file_path)
      gradle_file_full_path = File.expand_path(gradle_file_path, File.dirname(__FILE__))
      
      unless File.exist?(gradle_file_full_path)
        UI.error("Could not find build.gradle at: #{gradle_file_full_path}")
        UI.user_error!("Please ensure the Android project is properly set up")
      end
      
      # Read current version code
      gradle_content = File.read(gradle_file_full_path)
      version_code_match = gradle_content.match(/versionCode\s+(\d+)/)
      current_version_code = version_code_match ? version_code_match[1].to_i : 0
      new_version = current_version_code + 1
      
      # Update version code in file
      updated_content = gradle_content.gsub(/versionCode\s+\d+/, "versionCode #{new_version}")
      File.write(gradle_file_full_path, updated_content)
      
      report_success("Version code incremented from #{current_version_code} to #{new_version}")
      new_version
    end

    # Helper to log keychain diagnostics
    def self.log_keychain_diagnostics(certificate_name)
      puts "--- Fastlane Pre-Build Diagnostics ---"
      begin
        system("echo 'Running as user: $(whoami)'")
        system("echo 'Default keychain:'")
        system("security list-keychains -d user")
        system("echo 'Identities in build.keychain:'")
        # Use the absolute path expected in the GH runner environment
        keychain_path = "/Users/runner/Library/Keychains/build.keychain-db"
        system("security find-identity -v -p codesigning #{keychain_path} || echo 'No identities found or build.keychain doesn\'t exist at #{keychain_path}'")
      rescue => e
        puts "Error running security command: #{e.message}"
      end
      puts "Certificate name constructed by Fastlane: #{certificate_name}"
      puts "--- End Fastlane Diagnostics ---"
    end
  end
end 
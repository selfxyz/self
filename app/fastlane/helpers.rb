require "bundler/setup"
require "fastlane"
require "tempfile"
require "fileutils"
require "base64"
require "shellwords"
require "net/http"
require "uri"
require "json"
require "mime/types"
require "multipart/post"
require "net/http/post/multipart" # For UploadIO

# Load secrets before defining constants
module Fastlane
  module Helpers
    def self.is_ci_environment?
      ENV["CI"] == "true" && ENV["ACT"] != "true"
    end

    def self.dev_load_dotenv_secrets
      if !is_ci_environment?
        puts "Loading .env.secrets"
        require "dotenv"
        Dotenv.load("./.env.secrets")
      end
    end

    # Simple multipart boundary generator
    def self.generate_boundary
      "----FastlaneSlackUploadBoundary#{rand(1000000)}"
    end

    # Helper to build a multipart request body
    def self.build_multipart_body(params, boundary, file_path)
      body = ""

      # Add regular params
      params.each do |key, value|
        body << "--#{boundary}\r\n"
        body << "Content-Disposition: form-data; name=\"#{key}\"\r\n\r\n"
        body << "#{value}\r\n"
      end

      # Add file part
      if file_path && File.exist?(file_path)
        filename = File.basename(file_path)
        content_type = MIME::Types.type_for(file_path).first&.content_type || "application/octet-stream"

        body << "--#{boundary}\r\n"
        body << "Content-Disposition: form-data; name=\"file\"; filename=\"#{filename}\"\r\n"
        body << "Content-Type: #{content_type}\r\n\r\n"
        body << File.binread(file_path)
        body << "\r\n"
      end

      # Add final boundary
      body << "--#{boundary}--\r\n"

      body
    end
  end
end

# Call load_dotenv_secrets before setting constants
Fastlane::Helpers.dev_load_dotenv_secrets

# Now set constants after secrets are loaded
SLACK_TOKEN = ENV["SLACK_API_TOKEN"]
CHANNEL_NAME = ENV["SLACK_ANNOUNCE_CHANNEL_NAME"] || "deploy-mobile"

module Fastlane
  module Helpers
    @@android_has_permissions = false

    ### UI and Reporting Methods ###
    def self.report_error(message, suggestion = nil, abort_message = nil)
      UI.error("❌ #{message}")
      UI.error(suggestion) if suggestion
      UI.abort_with_message!(abort_message || message)
    end

    def self.report_success(message)
      UI.success("✅ #{message}")
    end

    ### Environment and Configuration Methods ###
    def self.verify_env_vars(required_vars)
      missing_vars = required_vars.select { |var| ENV[var].nil? || ENV[var].to_s.strip.empty? }

      if missing_vars.any?
        report_error(
          "Missing required environment variables: #{missing_vars.join(", ")}",
          "Please check your secrets",
          "Environment verification failed"
        )
      else
        report_success("All required environment variables are present")
      end
    end

    def self.should_upload_app(platform)
      if ENV["ACT"] == "true"
        puts "Skipping upload to #{platform} we are testing using `act`"
        return false
      end

      if ENV["IS_PR"] == "true"
        puts "Skipping upload to #{platform} because we are in a pull request"
        return false
      end

      # upload app if we are in CI or forcing local upload
      ENV["CI"] == "true" || ENV["FORCE_UPLOAD_LOCAL_DEV"] == "true"
    end

    def self.confirm_force_upload
      UI.important "⚠️  FORCE_UPLOAD_LOCAL_DEV is set to true. This will upload the build to the store."
      UI.important "Are you sure you want to continue? (y/n)"
      response = STDIN.gets.chomp
      unless response.downcase == "y"
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

    def self.ios_verify_app_store_build_number(ios_xcode_profile_path)
      api_key = Fastlane::Actions::AppStoreConnectApiKeyAction.run(
        key_id: ENV["IOS_CONNECT_KEY_ID"],
        issuer_id: ENV["IOS_CONNECT_ISSUER_ID"],
        key_filepath: ENV["IOS_CONNECT_API_KEY_PATH"],
        in_house: false,
      )

      latest_build = Fastlane::Actions::LatestTestflightBuildNumberAction.run(
        api_key: api_key,
        app_identifier: ENV["IOS_APP_IDENTIFIER"],
        platform: "ios",
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
          if config.build_settings["VERSIONING_SYSTEM"] != "apple-generic"
            puts "Enabling Apple Generic Versioning for #{target.name} - #{config.name}"
            config.build_settings["VERSIONING_SYSTEM"] = "apple-generic"
            config.build_settings["CURRENT_PROJECT_VERSION"] ||= "1"
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
        in_house: false,
      )

      latest_build = Fastlane::Actions::LatestTestflightBuildNumberAction.run(
        api_key: api_key,
        app_identifier: ENV["IOS_APP_IDENTIFIER"],
        platform: "ios",
      )

      new_build_number = latest_build + 1

      Fastlane::Actions::IncrementBuildNumberAction.run(
        build_number: new_build_number,
        xcodeproj: ios_xcode_profile_path,
      )

      report_success("Incremented build number to #{new_build_number} (previous TestFlight build: #{latest_build})")

      new_build_number
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

      cert_password = ENV["IOS_P12_PASSWORD"] || ""
      temp_p12 = nil

      begin
        temp_p12 = Tempfile.new(["fastlane_local_cert", ".p12"])
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
        temp_profile = Tempfile.new(["fastlane_local_profile", ".mobileprovision"])
        temp_profile.binmode
        temp_profile.write(decoded_profile_data)
        temp_profile.close
        puts "Temporarily wrote decoded profile to: #{temp_profile.path}"

        temp_plist = Tempfile.new(["fastlane_temp_plist", ".plist"])
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

        ENV["IOS_PROV_PROFILE_PATH"] = final_path
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
      profile_path = ENV["IOS_PROV_PROFILE_PATH"]

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
      current_user = ENV["USER"] || `whoami`.strip
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
        temp_plist = Tempfile.new(["profile_info", ".plist"])
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
        package_name: ENV["ANDROID_PACKAGE_NAME"],
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

      # TODO: fetch version code from play store when we have permissions
      new_version = current_version_code + 1

      # Update version code in file
      if @@android_has_permissions
        updated_content = gradle_content.gsub(/versionCode\s+\d+/, "versionCode #{new_version}")
        File.write(gradle_file_full_path, updated_content)
      end

      report_success("Version code incremented from #{current_version_code} to #{new_version}")

      @@android_has_permissions ? new_version : current_version_code
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

    ### Slack Methods ###

    # Resolve the channel ID from its name
    def self.get_channel_id
      # Verify Slack token is present
      unless SLACK_TOKEN && !SLACK_TOKEN.empty?
        UI.important("⚠️ SLACK_API_TOKEN environment variable is not set")
        return nil
      end

      uri = URI("https://slack.com/api/conversations.list?types=private_channel")
      req = Net::HTTP::Get.new(uri)
      req["Authorization"] = "Bearer #{SLACK_TOKEN}"

      res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
        http.request(req)
      end

      # Parse response
      response = JSON.parse(res.body)

      if !response["ok"]
        UI.important("⚠️ Slack API Error: #{response["error"]}")
        return nil
      end

      channels = response["channels"]
      if channels.nil? || channels.empty?
        UI.important("⚠️ No channels found in Slack response. Check your Slack token permissions.")
        return nil
      end

      # Find channel by name
      match = channels.find { |channel| channel["name"] == CHANNEL_NAME }

      if match
        UI.message("Found Slack channel: #{match["name"]} (ID: #{match["id"]})")
        return match["id"]
      else
        UI.important("⚠️ Channel '#{CHANNEL_NAME}' not found in the workspace")
        return nil
      end
    end

    # Post a message to the Slack channel
    def self.post_deploy_message(channel_id:, platform:, version:, build:)
      text = ":rocket: A new *#{platform}* app has been released! `v#{version}` (build #{build})"
      uri = URI("https://slack.com/api/chat.postMessage")

      req = Net::HTTP::Post.new(uri)
      req["Authorization"] = "Bearer #{SLACK_TOKEN}"
      req["Content-Type"] = "application/json"
      req.body = {
        channel: channel_id,
        text: text,
      }.to_json

      Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
        http.request(req)
      end
    end

    # Upload the file (IPA or AAB)
    def self.upload_build_file(channel_id:, file_path:)
      # Check if file exists and has content before attempting upload
      unless File.exist?(file_path) && File.size?(file_path)
        UI.error("❌ File does not exist or is empty at path: #{file_path}")
        return
      end

      file_size = File.size(file_path)
      UI.message("Uploading file to Slack: #{file_path} (size: #{file_size} bytes)")

      # Alternative: Try to upload as a direct attachment to a message instead
      # This may work better for downloading as it bypasses the Slack file sharing system
      UI.message("Trying alternative method: uploading using the recommended API flow...")

      begin
        # Get the file size to set Content-Length
        file_size = File.size(file_path)

        # Check if file is larger than Slack's upload limit (typically ~50MB)
        if file_size > 50 * 1024 * 1024
          UI.important("⚠️ File is larger than 50MB (#{(file_size.to_f / 1024 / 1024).round(2)}MB), which may exceed Slack's upload limits")
          UI.important("Suggesting a different approach to share large files...")

          # Post a message with suggestions for sharing large binary files
          alt_message = "The #{File.basename(file_path)} file is too large to upload directly to Slack (#{(file_size.to_f / 1024 / 1024).round(2)}MB).\n" +
                        "Please consider one of these alternatives:\n" +
                        "• Share via Google Drive or Dropbox link\n" +
                        "• Upload to TestFlight/AppCenter for iOS apps\n" +
                        "• Upload to Play Store internal testing for Android apps\n" +
                        "• Create a GitHub release with the binary attached"

          alt_msg_uri = URI("https://slack.com/api/chat.postMessage")
          alt_msg_req = Net::HTTP::Post.new(alt_msg_uri)
          alt_msg_req["Authorization"] = "Bearer #{SLACK_TOKEN}"
          alt_msg_req["Content-Type"] = "application/json"
          alt_msg_req.body = JSON.generate({ channel: channel_id, text: alt_message })

          Net::HTTP.start(alt_msg_uri.hostname, alt_msg_uri.port, use_ssl: true) do |http|
            http.request(alt_msg_req)
          end

          UI.important("Shared alternative suggestions for large file sharing")
          return
        end

        # Step 1: Get upload URL - Same as our original method with better error handling
        upload_url_uri = URI("https://slack.com/api/files.getUploadURLExternal")
        upload_url_req = Net::HTTP::Post.new(upload_url_uri)
        upload_url_req["Authorization"] = "Bearer #{SLACK_TOKEN}"
        upload_url_req.set_form_data({
          length: file_size.to_s,
          filename: File.basename(file_path),
          alt_text: "#{File.basename(file_path)} - Mobile app binary",
        })

        UI.message("Requesting upload URL for file: #{File.basename(file_path)}")

        upload_url_response = nil
        Net::HTTP.start(upload_url_uri.hostname, upload_url_uri.port, use_ssl: true) do |http|
          upload_url_response = http.request(upload_url_req)
        end

        upload_url_result = JSON.parse(upload_url_response.body)
        unless upload_url_result["ok"]
          UI.error("❌ Failed to get upload URL: #{upload_url_result["error"]}")
          raise "Failed to get upload URL: #{upload_url_result["error"]}"
        end

        upload_url = upload_url_result["upload_url"]
        file_id = upload_url_result["file_id"]

        UI.message("Upload URL received. File ID: #{file_id}")
        UI.message("Upload URL: #{upload_url}")

        # Step 2: Upload content to the URL
        content_type = MIME::Types.type_for(file_path).first&.content_type || "application/octet-stream"
        upload_uri = URI(upload_url)

        UI.message("Uploading file content to Slack's servers...")
        UI.message("URI host: #{upload_uri.host}, path: #{upload_uri.path}, query: #{upload_uri.query || "none"}")

        # Setup for handling redirects
        max_redirects = 5
        redirect_count = 0
        current_uri = upload_uri

        UI.message("Starting file upload with redirect handling (max #{max_redirects} redirects)")

        while redirect_count < max_redirects
          http = Net::HTTP.new(current_uri.host, current_uri.port)
          http.use_ssl = (current_uri.scheme == "https")
          http.set_debug_output($stdout) if ENV["DEBUG_SLACK_UPLOAD"] == "true"

          # Create the request for the current URI
          current_path = current_uri.path
          current_path += "?#{current_uri.query}" if current_uri.query

          upload_req = Net::HTTP::Put.new(current_path)
          upload_req["Content-Type"] = content_type
          upload_req["Content-Length"] = file_size.to_s

          # Only open the file once and reuse the handle to avoid issues
          if redirect_count == 0
            @file_handle = File.open(file_path, "rb")
            upload_req.body_stream = @file_handle
          else
            # For redirects, we need to reopen the file since body_stream can only be read once
            @file_handle.close if @file_handle && !@file_handle.closed?
            @file_handle = File.open(file_path, "rb")
            upload_req.body_stream = @file_handle
          end

          UI.message("Uploading to #{current_uri.host}#{current_path} (attempt #{redirect_count + 1})")

          # Send the request
          upload_response = http.request(upload_req)

          # Check for redirect
          if upload_response.code.to_i >= 300 && upload_response.code.to_i < 400
            location = upload_response["location"]

            if location
              UI.message("Following redirect to: #{location}")
              redirect_count += 1
              current_uri = URI(location)
            else
              UI.error("❌ Received redirect without Location header")
              break
            end
          elsif upload_response.code.to_i == 200
            UI.success("✅ Upload successful after #{redirect_count} redirects")
            break
          else
            UI.error("❌ Failed to upload file content: #{upload_response.code} - #{upload_response.message}")
            UI.error("Response: #{upload_response.body}")
            raise "Failed to upload file content: HTTP #{upload_response.code}"
          end
        end

        # Make sure to close the file handle
        @file_handle.close if @file_handle && !@file_handle.closed?

        if redirect_count >= max_redirects
          UI.error("❌ Too many redirects (#{max_redirects})")
          raise "Too many redirects while uploading file"
        end

        UI.message("File content uploaded successfully. Completing upload...")

        # Step 3: Complete the upload and share in channel
        complete_uri = URI("https://slack.com/api/files.completeUploadExternal")
        complete_req = Net::HTTP::Post.new(complete_uri)
        complete_req["Authorization"] = "Bearer #{SLACK_TOKEN}"
        complete_req["Content-Type"] = "application/json"

        # Add channels parameter to share the file in the channel
        complete_req.body = JSON.generate({
          files: [
            {
              id: file_id,
              title: File.basename(file_path),
              channels: [channel_id],
            },
          ],
        })

        complete_response = nil
        Net::HTTP.start(complete_uri.hostname, complete_uri.port, use_ssl: true) do |http|
          complete_response = http.request(complete_req)
        end

        complete_result = JSON.parse(complete_response.body)

        if complete_result["ok"]
          UI.success("✅ File uploaded and shared in channel successfully")
          uploaded_file = complete_result["files"]&.first

          if uploaded_file
            download_link = uploaded_file["url_private_download"]
            permalink = uploaded_file["permalink"]

            UI.message("File details:")
            UI.message("- Download link: #{download_link}")
            UI.message("- Permalink: #{permalink}")

            # Send a follow-up message with clear instructions
            instructions = "📱 *New build uploaded:* `#{File.basename(file_path)}`\n\n" +
                           "To download the file:\n" +
                           "1. Click on the file above\n" +
                           "2. Click the download button (⬇️) in the top right\n" +
                           "3. If prompted for login, use your Slack credentials"

            inst_uri = URI("https://slack.com/api/chat.postMessage")
            inst_req = Net::HTTP::Post.new(inst_uri)
            inst_req["Authorization"] = "Bearer #{SLACK_TOKEN}"
            inst_req["Content-Type"] = "application/json"
            inst_req.body = JSON.generate({
              channel: channel_id,
              text: instructions,
              mrkdwn: true,
            })

            Net::HTTP.start(inst_uri.hostname, inst_uri.port, use_ssl: true) do |http|
              http.request(inst_req)
            end
          end
        else
          UI.error("❌ Failed to complete upload: #{complete_result["error"]}")
          UI.error("Response: #{complete_response.body}")
          raise "Failed to complete upload: #{complete_result["error"]}"
        end
      rescue => e
        UI.error("❌ Error during upload process: #{e.message}")
        UI.error(e.backtrace.join("\n"))

        # Last resort: Just send instructions for finding the file in Slack
        UI.important("Sending manual instructions as a fallback...")
        manual_instructions = "🔍 *A new build has been uploaded but couldn't be shared automatically*\n\n" +
                              "File details:\n" +
                              "• Name: `#{File.basename(file_path)}`\n" +
                              "• Size: #{(File.size(file_path).to_f / 1024 / 1024).round(2)} MB\n\n" +
                              "*Alternative options:*\n" +
                              "1. Ask a developer to share the file via a cloud storage link\n" +
                              "2. For iOS: Check TestFlight for the latest build\n" +
                              "3. For Android: Check internal testing track on Play Store"

        begin
          manual_uri = URI("https://slack.com/api/chat.postMessage")
          manual_req = Net::HTTP::Post.new(manual_uri)
          manual_req["Authorization"] = "Bearer #{SLACK_TOKEN}"
          manual_req["Content-Type"] = "application/json"
          manual_req.body = JSON.generate({
            channel: channel_id,
            text: manual_instructions,
            mrkdwn: true,
          })

          Net::HTTP.start(manual_uri.hostname, manual_uri.port, use_ssl: true) do |http|
            http.request(manual_req)
          end
          UI.important("Sent manual instructions as final fallback")
        rescue => e2
          UI.error("Even the fallback message failed: #{e2.message}")
        end
      end
    end

    # Wrapper method
    def self.notify_mobile_app_deploy(platform:, version:, build:, file_path:)
      UI.message("Starting mobile app deploy notification process...")

      # Debug information about environment variables
      UI.message("SLACK_API_TOKEN present: #{!SLACK_TOKEN.nil? && !SLACK_TOKEN.empty?}")
      UI.message("SLACK_ANNOUNCE_CHANNEL_NAME: #{CHANNEL_NAME || "not set"}")

      if CHANNEL_NAME.nil? || CHANNEL_NAME.empty? || SLACK_TOKEN.nil? || SLACK_TOKEN.empty?
        UI.important("⚠️ Skipping Slack notification - channel name or token not available")
        return
      end

      # Debug information about the file
      if file_path
        if File.exist?(file_path)
          UI.message("File for upload exists at path: #{file_path}")
          UI.message("File size: #{File.size(file_path)} bytes")
        else
          UI.error("❌ File for upload does not exist at path: #{file_path}")
        end
      else
        UI.error("❌ File path is nil or empty")
      end

      channel_id = get_channel_id

      if channel_id.nil?
        UI.important("⚠️ Skipping Slack notification - channel ID not available")
        return
      end

      UI.message("Sending notification to Slack channel: #{channel_id}")
      post_deploy_message(channel_id: channel_id, platform: platform, version: version, build: build)

      # Try uploading with a simple method first instead of the complex flow
      if simple_upload_file(channel_id: channel_id, file_path: file_path)
        UI.success("✅ File uploaded successfully using the simple method")
        return
      end

      # If simple upload fails, try the more complex method
      upload_build_file(channel_id: channel_id, file_path: file_path)
    end

    # Simple upload method that tries to use files.upload directly
    def self.simple_upload_file(channel_id:, file_path:)
      return false unless File.exist?(file_path)

      begin
        UI.message("Attempting simple file upload via curl command...")

        # Create a temporary file to hold the curl output
        output_file = Tempfile.new(["slack_upload", ".log"])

        # Build the curl command - this is often more reliable than using Ruby's HTTP libraries
        curl_cmd = [
          "curl",
          "-X", "POST",
          "-H", "Authorization: Bearer #{SLACK_TOKEN}",
          "-F", "channels=#{channel_id}",
          "-F", "initial_comment=📱 New build uploaded: #{File.basename(file_path)}",
          "-F", "file=@#{file_path}",
          "-o", output_file.path,
          "-v",
          "https://slack.com/api/files.upload",
        ].join(" ")

        UI.message("Executing curl upload...")

        # Execute the curl command
        exit_status = system(curl_cmd)

        # Check if the command executed successfully
        if exit_status
          # Read and parse the response
          response_text = File.read(output_file.path)

          # Try to parse as JSON
          begin
            response = JSON.parse(response_text)

            if response["ok"]
              UI.success("✅ File uploaded successfully via curl")

              # Post a follow-up message with clear instructions
              instructions = "📱 *New build uploaded:* `#{File.basename(file_path)}`\n\n" +
                             "To download the file:\n" +
                             "1. Click on the file above\n" +
                             "2. Click the download button (⬇️) in the top right\n" +
                             "3. If prompted for login, use your Slack credentials"

              inst_uri = URI("https://slack.com/api/chat.postMessage")
              inst_req = Net::HTTP::Post.new(inst_uri)
              inst_req["Authorization"] = "Bearer #{SLACK_TOKEN}"
              inst_req["Content-Type"] = "application/json"
              inst_req.body = JSON.generate({
                channel: channel_id,
                text: instructions,
                mrkdwn: true,
              })

              Net::HTTP.start(inst_uri.hostname, inst_uri.port, use_ssl: true) do |http|
                http.request(inst_req)
              end

              return true
            else
              UI.important("Curl upload failed: #{response["error"]}")
            end
          rescue JSON::ParserError => e
            UI.important("Could not parse curl response as JSON: #{e.message}")
            UI.important("Raw response: #{response_text[0..500]}...")
          end
        else
          UI.important("Curl command failed with non-zero exit status")
        end

        # Try the native Ruby approach as a fallback
        UI.message("Trying native Ruby upload as fallback...")

        uri = URI("https://slack.com/api/files.upload")

        # Create the HTTP request with form data
        request = Net::HTTP::Post.new(uri)
        request["Authorization"] = "Bearer #{SLACK_TOKEN}"

        # Open the file in binary mode
        file_data = File.binread(file_path)

        # Create form data
        form_data = {
          "channels" => channel_id,
          "initial_comment" => "📱 New build: #{File.basename(file_path)}",
          "filename" => File.basename(file_path),
          "file" => UploadIO.new(StringIO.new(file_data), "application/octet-stream", File.basename(file_path)),
        }

        # Set form data
        request.set_form(form_data, "multipart/form-data")

        # Send the request
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.read_timeout = 300  # Set a longer timeout (5 minutes)

        response = http.request(request)

        # Parse the response
        result = JSON.parse(response.body)

        if result["ok"]
          UI.success("✅ File uploaded successfully via Ruby method")
          return true
        else
          UI.important("Ruby upload failed: #{result["error"]}")
          return false
        end
      rescue => e
        UI.important("Simple upload error: #{e.message}")
        UI.important(e.backtrace.join("\n"))
        return false
      ensure
        # Clean up temp file
        output_file.close
        output_file.unlink
      end
    end
  end
end

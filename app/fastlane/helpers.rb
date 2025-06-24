# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

require "bundler/setup"
require "fastlane"
require "tempfile"
require "fileutils"
require "base64"
require "shellwords"
require "net/http"
require "uri"
require "json"

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
    # Uploads a file to Slack using the files.upload API endpoint.
    # Handles multipart/form-data request construction.
    #
    # Args:
    #   file_path (String): Path to the file to upload.
    #   channel_id (String): ID of the channel to upload the file to.
    #   initial_comment (String, optional): Message to post alongside the file.
    #   thread_ts (String, optional): Timestamp of a message to reply to (creates a thread).
    #   title (String, optional): Title for the uploaded file (defaults to filename).
    def self.upload_file_to_slack(file_path:, channel_id:, initial_comment: nil, thread_ts: nil, title: nil)
      unless SLACK_TOKEN && !SLACK_TOKEN.strip.empty?
        report_error("Missing SLACK_API_TOKEN environment variable.", "Cannot upload file to Slack without API token.", "Slack Upload Failed")
        return false
      end

      unless File.exist?(file_path)
        report_error("File not found at path: #{file_path}", "Please ensure the file exists before uploading.", "Slack Upload Failed")
        return false
      end

      file_name = File.basename(file_path)
      file_size = File.size(file_path)
      file_title = title || file_name

      begin
        upload_url = nil
        file_id = nil

        # Step 1: Get Upload URL
        with_retry(max_retries: 3, delay: 5) do
          UI.message("Step 1: Getting Slack upload URL for #{file_name}...")
          uri = URI.parse("https://slack.com/api/files.getUploadURLExternal")
          request = Net::HTTP::Post.new(uri)
          request["Authorization"] = "Bearer #{SLACK_TOKEN}"
          request.set_form_data(filename: file_name, length: file_size)

          http = Net::HTTP.new(uri.host, uri.port)
          http.use_ssl = true
          response = http.request(request)

          unless response.is_a?(Net::HTTPSuccess)
            raise "Slack API (files.getUploadURLExternal) failed: #{response.code} #{response.body}"
          end

          response_json = JSON.parse(response.body)
          unless response_json["ok"]
            raise "Slack API Error (files.getUploadURLExternal): #{response_json["error"]}"
          end

          upload_url = response_json["upload_url"]
          file_id = response_json["file_id"]
          UI.message("Got upload URL and file ID: #{file_id}")
        end

        # Step 2: Upload file content to the obtained URL
        with_retry(max_retries: 3, delay: 5) do
          UI.message("Step 2: Uploading file content to Slack...")
          upload_uri = URI.parse(upload_url)
          # Net::HTTP::Post requires the request body to be an IO object or string
          # Reading the file content here for the request body
          file_content = File.binread(file_path)

          upload_request = Net::HTTP::Post.new(upload_uri)
          upload_request.body = file_content
          # Slack's upload URL expects the raw file bytes in the body
          # Content-Type is often application/octet-stream, but Slack might infer
          upload_request["Content-Type"] = "application/octet-stream"
          upload_request["Content-Length"] = file_size.to_s

          upload_http = Net::HTTP.new(upload_uri.host, upload_uri.port)
          upload_http.use_ssl = true
          upload_response = upload_http.request(upload_request)

          # Check for a 200 OK response for the file upload itself
          unless upload_response.is_a?(Net::HTTPOK)
            raise "File content upload failed: #{upload_response.code} #{upload_response.message} Body: #{upload_response.body}"
          end
          UI.message("File content uploaded successfully.")
        end

        # Step 3: Complete the upload
        final_file_info = nil
        with_retry(max_retries: 3, delay: 5) do
          UI.message("Step 3: Completing Slack upload for file ID #{file_id}...")
          complete_uri = URI.parse("https://slack.com/api/files.completeUploadExternal")
          complete_request = Net::HTTP::Post.new(complete_uri)
          complete_request["Authorization"] = "Bearer #{SLACK_TOKEN}"
          complete_request["Content-Type"] = "application/json; charset=utf-8"

          payload = {
            files: [{ id: file_id, title: file_title }],
            channel_id: channel_id,
          }
          payload[:initial_comment] = initial_comment if initial_comment
          payload[:thread_ts] = thread_ts if thread_ts

          complete_request.body = payload.to_json

          complete_http = Net::HTTP.new(complete_uri.host, complete_uri.port)
          complete_http.use_ssl = true
          complete_response = complete_http.request(complete_request)

          unless complete_response.is_a?(Net::HTTPSuccess)
            raise "Slack API (files.completeUploadExternal) failed: #{complete_response.code} #{complete_response.body}"
          end

          complete_response_json = JSON.parse(complete_response.body)
          unless complete_response_json["ok"]
            # Specific error handling for common issues
            if complete_response_json["error"] == "invalid_channel"
              UI.error("Error: Invalid SLACK_CHANNEL_ID: '#{channel_id}'. Please verify the channel ID.")
            elsif complete_response_json["error"] == "channel_not_found"
              UI.error("Error: Channel '#{channel_id}' not found. Ensure the bot is invited or the ID is correct.")
            end
            raise "Slack API Error (files.completeUploadExternal): #{complete_response_json["error"]} - #{complete_response_json["response_metadata"]&.[]("messages")&.join(", ")}"
          end

          # Expecting an array of file objects
          final_file_info = complete_response_json["files"]&.first
          unless final_file_info
            raise "Upload completed but no file information returned in response: #{complete_response.body}"
          end
          report_success("Successfully uploaded and shared #{file_name} (ID: #{final_file_info["id"]}) to Slack channel #{channel_id}")
        end

        return final_file_info # Return the first file object on success
      rescue JSON::ParserError => e
        report_error("Failed to parse Slack API response.", "Error: #{e.message}", "Slack Upload Failed")
        return false
      rescue => e
        # Include backtrace for better debugging
        report_error("Error during Slack upload process: #{e.message}", e.backtrace.join("\n"), "Slack Upload Failed")
        return false
      end
    end
  end
end

# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

module Fastlane
  module Helpers
    module IOS
      # Verify the build number is higher than TestFlight
      def ios_verify_app_store_build_number(xcodeproj)
        api_key = ios_connect_api_key

        latest = Fastlane::Actions::LatestTestflightBuildNumberAction.run(
          api_key: api_key,
          app_identifier: ENV["IOS_APP_IDENTIFIER"],
          platform: "ios",
        )

        project = Xcodeproj::Project.open(xcodeproj)
        target = project.targets.first
        report_error("No targets found in Xcode project") unless target

        config = target.build_configurations.first
        report_error("No build configurations found for target") unless config

        current = config.build_settings["CURRENT_PROJECT_VERSION"]
        report_error("CURRENT_PROJECT_VERSION not set in build settings") unless current

        if current.to_i <= latest.to_i
          report_error(
            "Build number must be greater than latest TestFlight build!",
            "Latest: #{latest} Current: #{current}",
            "Build number verification failed"
          )
        else
          report_success("Build number verified (Current: #{current}, Latest: #{latest})")
        end
      end

      # Ensure Xcode project uses generic versioning
      def ios_ensure_generic_versioning(xcodeproj)
        raise "Xcode project not found" unless File.exist?(xcodeproj)
        project = Xcodeproj::Project.open(xcodeproj)
        project.targets.each do |t|
          t.build_configurations.each do |c|
            next if c.build_settings["VERSIONING_SYSTEM"] == "apple-generic"
            c.build_settings["VERSIONING_SYSTEM"] = "apple-generic"
            c.build_settings["CURRENT_PROJECT_VERSION"] ||= "1"
          end
        end
        project.save
        report_success("Enabled Apple Generic Versioning in Xcode project")
      end

      def ios_connect_api_key
        Fastlane::Actions::AppStoreConnectApiKeyAction.run(
          key_id: ENV["IOS_CONNECT_KEY_ID"],
          issuer_id: ENV["IOS_CONNECT_ISSUER_ID"],
          key_filepath: ENV["IOS_CONNECT_API_KEY_PATH"],
          in_house: false,
        )
      end

      # Increment the build number based on latest TestFlight build
      def ios_increment_build_number(xcodeproj)
        ios_ensure_generic_versioning(xcodeproj)
        api_key = ios_connect_api_key

        latest = Fastlane::Actions::LatestTestflightBuildNumberAction.run(
          api_key: api_key,
          app_identifier: ENV["IOS_APP_IDENTIFIER"],
          platform: "ios",
        )

        new_number = latest + 1
        Fastlane::Actions::IncrementBuildNumberAction.run(
          build_number: new_number,
          xcodeproj: xcodeproj,
        )
        report_success("Incremented build number to #{new_number} (previous #{latest})")
        new_number
      end

      # Decode certificate from ENV and import into keychain
      def ios_dev_setup_certificate
        data = ENV["IOS_DIST_CERT_BASE64"]
        pass = ENV["IOS_P12_PASSWORD"]
        report_error("Missing IOS_P12_PASSWORD") unless pass
        report_error("Missing IOS_DIST_CERT_BASE64") unless data
        tmp = Tempfile.new(["fastlane_local_cert", ".p12"])
        tmp.binmode
        tmp.write(Base64.decode64(data))
        tmp.close
        success = system("security import #{Shellwords.escape(tmp.path)} -P #{Shellwords.escape(pass)} -T /usr/bin/codesign")
        report_error("Failed to import certificate into keychain") unless success
        report_success("Certificate imported successfully into default keychain")
      ensure
        tmp&.unlink
      end

      # Decode API key for local development
      def ios_dev_setup_connect_api_key(path)
        full = File.expand_path(path, File.dirname(__FILE__))
        ENV["IOS_CONNECT_API_KEY_PATH"] = full
        if ENV["IOS_CONNECT_API_KEY_BASE64"]
          FileUtils.mkdir_p(File.dirname(full))
          File.write(full, Base64.decode64(ENV["IOS_CONNECT_API_KEY_BASE64"]))
          File.chmod(0600, full)
          report_success("Connect API Key written to: #{full}")
        end
        File.realpath(full)
      end

      # Decode and install provisioning profile
      def ios_dev_setup_provisioning_profile(dir)
        data = ENV["IOS_PROV_PROFILE_BASE64"]
        report_error("Missing IOS_PROV_PROFILE_BASE64") unless data
        decoded = Base64.decode64(data)
        tmp_profile = Tempfile.new(["fastlane_local_profile", ".mobileprovision"])
        tmp_profile.binmode
        tmp_profile.write(decoded)
        tmp_profile.close

        tmp_plist = Tempfile.new(["fastlane_temp_plist", ".plist"])
        success = system("security cms -D -i #{Shellwords.escape(tmp_profile.path)} -o #{Shellwords.escape(tmp_plist.path)}")
        report_error("Failed to decode provisioning profile") unless success
        uuid = `/usr/libexec/PlistBuddy -c "Print :UUID" #{Shellwords.escape(tmp_plist.path)} 2>/dev/null`.strip
        report_error("Failed to extract UUID from provisioning profile") if uuid.empty?

        target_dir = File.expand_path(dir)
        FileUtils.mkdir_p(target_dir)
        final_path = File.join(target_dir, "#{uuid}.mobileprovision")
        FileUtils.cp(tmp_profile.path, final_path)
        ENV["IOS_PROV_PROFILE_PATH"] = final_path
        report_success("Provisioning profile installed successfully")
        final_path
      ensure
        tmp_profile&.unlink
        tmp_plist&.unlink
      end

      # Ensure installed profile exists
      def ios_verify_provisioning_profile
        path = ENV["IOS_PROV_PROFILE_PATH"]
        report_error("ENV['IOS_PROV_PROFILE_PATH'] is not set") if path.to_s.empty?
        File.realpath(path)
        report_success("iOS provisioning profile verified successfully at #{path}")
      rescue Errno::ENOENT
        report_error("Provisioning profile not found at: #{path}")
      end
    end
  end
end

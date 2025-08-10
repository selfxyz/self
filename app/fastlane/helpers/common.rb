# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

module Fastlane
  module Helpers
    module Common
      # Detect if running in CI (and not locally via `act`)
      def is_ci_environment?
        ENV["CI"] == "true" && ENV["ACT"] != "true"
      end

      # Load development secrets when not in CI
      def dev_load_dotenv_secrets
        return if is_ci_environment?
        require "dotenv"
        puts "Loading .env.secrets"
        Dotenv.load("./.env.secrets")
      end

      # Display an error and abort execution
      def report_error(message, suggestion = nil, abort_message = nil)
        UI.error("❌ #{message}")
        UI.error(suggestion) if suggestion
        UI.abort_with_message!(abort_message || message)
      end

      # Display a success message
      def report_success(message)
        UI.success("✅ #{message}")
      end

      # Ensure a list of environment variables are present
      def verify_env_vars(required_vars)
        missing = required_vars.select { |var| ENV[var].to_s.strip.empty? }
        if missing.any?
          report_error(
            "Missing required environment variables: #{missing.join(", ")}",
            "Please check your secrets",
            "Environment verification failed"
          )
        else
          report_success("All required environment variables are present")
        end
      end

      # Decide if a build should be uploaded to the store
      def should_upload_app(platform)
        return false if ENV["ACT"] == "true" || ENV["IS_PR"] == "true"
        ENV["CI"] == "true" || ENV["FORCE_UPLOAD_LOCAL_DEV"] == "true"
      end

      # Helper wrapper to retry a block with exponential backoff for rate limits
      def with_retry(max_retries: 3, delay: 5)
        attempts = 0
        begin
          yield
        rescue => e
          attempts += 1
          if attempts < max_retries
            # Check if this is a rate limit error (HTTP 429)
            is_rate_limit = e.message.include?("429") || e.message.downcase.include?("rate limit")

            if is_rate_limit
              # Exponential backoff for rate limits: 5s, 10s, 20s, 40s...
              backoff_delay = delay * (2 ** (attempts - 1))
              UI.important("Rate limit hit. Retry ##{attempts} after #{backoff_delay}s: #{e.message}")
              sleep(backoff_delay)
            else
              # Regular retry with fixed delay for other errors
              UI.important("Retry ##{attempts} after #{delay}s: #{e.message}")
              sleep(delay)
            end
            retry
          else
            UI.user_error!("Failed after #{max_retries} retries: #{e.message}")
          end
        end
      end

      # Print basic keychain diagnostics
      def log_keychain_diagnostics(certificate_name)
        puts "--- Fastlane Pre-Build Diagnostics ---"
        system("echo 'Running as user: $(whoami)'")
        system("security list-keychains -d user")
        keychain_path = "/Users/runner/Library/Keychains/build.keychain-db"
        system("security find-identity -v -p codesigning #{keychain_path} || echo 'No identities found'")
        puts "Certificate name constructed by Fastlane: #{certificate_name}"
        puts "--- End Fastlane Diagnostics ---"
      end
    end
  end
end

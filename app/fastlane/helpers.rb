# SPDX-License-Identifier: BUSL-1.1

require "bundler/setup"
require "fastlane"
require "tempfile"
require "fileutils"
require "base64"
require "shellwords"
require "net/http"
require "uri"
require "json"

require_relative "helpers/common"
require_relative "helpers/ios"
require_relative "helpers/android"
require_relative "helpers/version_manager"

module Fastlane
  module Helpers
    extend Fastlane::Helpers::Common
    extend Fastlane::Helpers::IOS
    extend Fastlane::Helpers::Android
    extend Fastlane::Helpers::VersionManager
  end
end

# Load secrets as early as possible
Fastlane::Helpers.dev_load_dotenv_secrets

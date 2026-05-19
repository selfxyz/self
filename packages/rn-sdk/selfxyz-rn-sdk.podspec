# SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
# SPDX-License-Identifier: BUSL-1.1

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "selfxyz-rn-sdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://self.xyz"
  s.license      = { :type => "BUSL-1.1", :file => "../../LICENSE" }
  s.authors      = { "Self Protocol" => "engineering@self.xyz" }
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/selfxyz/self.git", :tag => "rn-sdk-#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.swift_version = "5.5"

  s.dependency "React-Core"
end

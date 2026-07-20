# SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
# SPDX-License-Identifier: BUSL-1.1

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "selfxyz-rn-mrz-scanner"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://self.xyz"
  s.license      = { :type => "BUSL-1.1" }
  s.authors      = { "Self Protocol" => "engineering@self.xyz" }
  s.platforms    = { :ios => "15.0" }
  s.source       = { :git => "https://github.com/selfxyz/self.git", :tag => "rn-mrz-scanner-#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.swift_version = "5.9"

  s.dependency "React-Core"

  # Canonical iOS MRZ Vision engine. RSP-03 resolves the "three copies" open question by
  # DEPENDING on the maintained SelfSdkOcr product (self-sdk-native/self-sdk-swift), not vendoring
  # a third copy of MrzScanEngine/MrzOcrCorrection here. SelfSdkOcr is distributed as a binary
  # xcframework via self-sdk-dist (see self-sdk-native/rn-sdk SelfSdkModule/Passport subspec);
  # SelfSdkProviders is its module dependency. The consuming app must have these pods resolvable
  # (published to self-sdk-dist or vendored locally) — see README. The Swift module is guarded
  # with `#if canImport(SelfSdkOcr)` so the pod still compiles (as an unavailable stub) when the
  # framework is absent.
  s.dependency "SelfSdkOcr"
  s.dependency "SelfSdkProviders"

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
  }
end

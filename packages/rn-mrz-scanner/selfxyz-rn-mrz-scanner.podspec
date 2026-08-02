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
  s.static_framework = true

  s.dependency "React-Core"

  # Canonical iOS MRZ Vision engine. RSP-03 resolves the "three copies" open question by reusing
  # the maintained SelfSdkOcr product (self-sdk-native/self-sdk-swift), not vendoring a third copy
  # of MrzScanEngine/MrzOcrCorrection here. SelfSdkOcr ships as a prebuilt static xcframework (RN-08
  # policy): it is large, private, and unpublished as a pod, so scripts/postinstall.js downloads +
  # sha256-verifies it from the private selfxyz/self-sdk-dist release (rn-v<version>) into
  # ios/Frameworks/ at npm install, then it is vendored here. The shipped SelfSdkOcr.xcframework
  # carries no SelfSdkProviders/SelfSdk symbols — SelfSdkProviders is source-distributed and is not
  # needed by this module, so only SelfSdkOcr is vendored. Without a GitHub token (OSS/CI) the
  # download skips gracefully and the framework is absent — the Swift module then compiles in its
  # stub branch (#if canImport(SelfSdkOcr)) and scan rejects NOT_AVAILABLE, so `pod install` never
  # hard-fails on a missing private artifact.
  mrz_frameworks = %w[SelfSdkOcr]
    .map { |name| "ios/Frameworks/#{name}.xcframework" }
    .select { |path| File.directory?(File.join(__dir__, path)) }
  s.vendored_frameworks = mrz_frameworks unless mrz_frameworks.empty?

  # Honesty guard: define SELF_OCR_AVAILABLE only when the binary is actually vendored.
  # Swift self-guards via `#if canImport(SelfSdkOcr)`; ObjC (SelfMRZScannerModule.m) has no
  # canImport, so the RCT_EXTERN_MODULE registration must be wrapped in `#if SELF_OCR_AVAILABLE`
  # — otherwise the module registers in the stub build and JS isAvailable() reports true even
  # though every scan rejects NOT_AVAILABLE.
  xcconfig = { "DEFINES_MODULE" => "YES" }
  unless mrz_frameworks.empty?
    xcconfig["GCC_PREPROCESSOR_DEFINITIONS"] = "$(inherited) SELF_OCR_AVAILABLE=1"
    xcconfig["SWIFT_ACTIVE_COMPILATION_CONDITIONS"] = "$(inherited) SELF_OCR_AVAILABLE"
  end
  s.pod_target_xcconfig = xcconfig
end

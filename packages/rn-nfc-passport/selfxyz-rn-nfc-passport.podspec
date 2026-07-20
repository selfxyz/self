# SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
# SPDX-License-Identifier: BUSL-1.1

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "selfxyz-rn-nfc-passport"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://self.xyz"
  s.license      = { :type => "BUSL-1.1" }
  s.authors      = { "Self Protocol" => "engineering@self.xyz" }
  s.platforms    = { :ios => "15.0" }
  s.source       = { :git => "https://github.com/selfxyz/self.git", :tag => "rn-nfc-passport-#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.swift_version = "5.9"
  s.static_framework = true

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
  }

  s.dependency "React-Core"

  # NFC readers ship as prebuilt binary xcframeworks (RN-08 policy) — the same b478e1f
  # NFCPassportReader fork app/ios ships (no iOS parity gap). They are fetched + sha256-verified
  # at npm install by scripts/postinstall.js into ios/Frameworks/, then vendored here. When
  # absent, the Swift module compiles in its stub branch (#if canImport(SelfSdkNfc)) and scan
  # rejects NOT_AVAILABLE, so `pod install` never hard-fails on a missing private artifact.
  passport_frameworks = %w[SelfSdkNfc SelfNFCPassportReader Mixpanel]
    .map { |name| "ios/Frameworks/#{name}.xcframework" }
    .select { |path| File.directory?(File.join(__dir__, path)) }
  s.vendored_frameworks = passport_frameworks unless passport_frameworks.empty?

  # Mixpanel is pulled transitively by the reader fork; its SPM resource bundle is needed at
  # runtime (Bundle.module lookup).
  if File.directory?(File.join(__dir__, "ios", "Frameworks", "Mixpanel_Mixpanel.bundle"))
    s.resources = "ios/Frameworks/Mixpanel_Mixpanel.bundle"
  end

  # SelfNFCPassportReader's .swiftinterface does `import OpenSSL`. The public C pod serves it;
  # pinned to the version the binaries were compiled against (self-sdk-swift/Package.resolved).
  # The consumer app must avoid a second OpenSSL.xcframework on the link line — see README
  # (Didit AutoDetection variant workaround mirrored from app/ios/Podfile).
  s.dependency "OpenSSL-Universal", "~> 1.1.2301"
end

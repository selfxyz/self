require "json"

# Handle both local development and published package scenarios
package_json_path = File.join(__dir__, "..", "package.json")
if File.exist?(package_json_path)
  package = JSON.parse(File.read(package_json_path))
else
  # Fallback for when package.json is not found
  package = {
    "version" => "0.1.0",
    "description" => "Self Mobile SDK Alpha",
  }
end
# Exclude the native modules when E2E_TESTING is set. This is because, NFC can't run on simulators.
Pod::Spec.new do |s|
  s.name = "mobile-sdk-alpha"
  s.version = package["version"]
  s.summary = package["description"]
  s.homepage = "https://github.com/selfxyz/self"
  s.license = "BUSL-1.1"
  s.author = { "Self" => "support@self.xyz" }
  s.platform = :ios, "13.0"
  s.source = { :path => "." }
  if ENV["E2E_TESTING"] == "1"
    # For E2E tests, exclude OpenSSL framework headers
    s.source_files = "ios/SelfSDK/**/*.{h,m,mm,swift}"
    s.public_header_files = "ios/SelfSDK/**/*.h"
  else
    # For production, include all files
    s.source_files = "ios/**/*.{h,m,mm,swift}"
    s.public_header_files = "ios/**/*.h"
  end

  # Skip NFCPassportReader for E2E testing to avoid build issues
  unless ENV["E2E_TESTING"] == "1"
    # Vendored prebuilt XCFrameworks for production
    # NFCPassportReader.xcframework contains SelfSDK.framework which re-exports NFCPassportReader
    s.vendored_frameworks = "ios/Frameworks/NFCPassportReader.xcframework", "ios/Frameworks/OpenSSL.xcframework"
  end

  s.dependency "React-Core"
  s.dependency "QKMRZParser"

  # Preserve binary frameworks only when not in E2E testing
  unless ENV["E2E_TESTING"] == "1"
    s.preserve_paths = "ios/Frameworks/**/*"
  end

  # s.pod_target_xcconfig = {
  #   "HEADER_SEARCH_PATHS" => '"$(PODS_ROOT)/Headers/Public/React-Core"',
  #   "DEFINES_MODULE" => "YES",
  #   "FRAMEWORK_SEARCH_PATHS" => "$(inherited) $(PODS_ROOT)/mobile-sdk-alpha/ios/Frameworks",
  #   "SWIFT_INCLUDE_PATHS" => "$(inherited) $(PODS_ROOT)/mobile-sdk-alpha/ios",
  # }

  # Skip framework search paths for E2E testing
  unless ENV["E2E_TESTING"] == "1"
    s.pod_target_xcconfig = {
      "HEADER_SEARCH_PATHS" => '"$(PODS_ROOT)/Headers/Public/React-Core"',
      "DEFINES_MODULE" => "YES",
      "FRAMEWORK_SEARCH_PATHS" => "$(inherited) $(PODS_ROOT)/../mobile-sdk-alpha/ios/Frameworks",
    }

    s.user_target_xcconfig = {
      "FRAMEWORK_SEARCH_PATHS" => "$(inherited) $(PODS_ROOT)/../mobile-sdk-alpha/ios/Frameworks",
    }
  else
    # For E2E tests, use minimal configuration with E2E_TESTING flag
    s.pod_target_xcconfig = {
      "HEADER_SEARCH_PATHS" => '"$(PODS_ROOT)/Headers/Public/React-Core"',
      "DEFINES_MODULE" => "YES",
      "GCC_PREPROCESSOR_DEFINITIONS" => "$(inherited) E2E_TESTING=1",
      "SWIFT_ACTIVE_COMPILATION_CONDITIONS" => "$(inherited) E2E_TESTING",
    }
    s.user_target_xcconfig = {
      "GCC_PREPROCESSOR_DEFINITIONS" => "$(inherited) E2E_TESTING=1",
      "SWIFT_ACTIVE_COMPILATION_CONDITIONS" => "$(inherited) E2E_TESTING",
    }
  end

  # Ensure iOS files are properly linked
  s.platform = :ios, "13.0"
  s.requires_arc = true
end

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

Pod::Spec.new do |s|
  s.name = "mobile-sdk-alpha"
  s.version = package["version"]
  s.summary = package["description"]
  s.homepage = "https://github.com/selfxyz/self"
  s.license = "BUSL-1.1"
  s.author = { "Self" => "support@self.xyz" }
  s.platform = :ios, "13.0"
  s.source = { :path => "." }
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.public_header_files = "ios/**/*.h"

  s.dependency "React-Core"
  s.dependency "QKMRZParser"
  s.dependency "NFCPassportReader"

  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => '"$(PODS_ROOT)/Headers/Public/React-Core"',
    "DEFINES_MODULE" => "YES",
    "SWIFT_INCLUDE_PATHS" => "$(PODS_ROOT)/mobile-sdk-alpha/ios",
  }

  # Ensure iOS files are properly linked
  s.platform = :ios, "13.0"
  s.requires_arc = true
end

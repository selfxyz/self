Pod::Spec.new do |s|
  s.name             = 'DiditSDK'
  s.version          = '3.3.4'
  s.summary          = 'Didit Identity Verification SDK for iOS'
  s.description      = <<-DESC
    The Didit SDK provides a complete identity verification solution including
    document scanning, NFC passport reading, face verification, and more.
    This local podspec excludes the vendored OpenSSL.xcframework to avoid
    conflicts with OpenSSL-Universal (provided by NFCPassportReader).
  DESC

  s.homepage         = 'https://github.com/didit-protocol/sdk-ios'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'Didit' => 'support@didit.me' }
  s.source           = {
    :http => 'https://github.com/didit-protocol/sdk-ios/releases/download/3.3.4/DiditSDK-CocoaPods.zip'
  }

  s.ios.deployment_target = '13.0'
  s.swift_version = '5.0'

  # Remove the vendored OpenSSL.xcframework after download to avoid conflicts
  # with OpenSSL-Universal (provided by NFCPassportReader)
  s.prepare_command = 'rm -rf OpenSSL.xcframework'

  s.vendored_frameworks = 'DiditSDK.xcframework'

  s.dependency 'OpenSSL-Universal', '~> 1.1.1900'

  s.frameworks = 'UIKit', 'SwiftUI', 'AVFoundation', 'CoreNFC', 'CoreLocation'
end

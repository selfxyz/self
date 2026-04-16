Pod::Spec.new do |s|
  s.name         = 'OpenSSL-Universal'
  s.version      = '1.1.1900'
  s.summary      = 'Stub: OpenSSL is provided by DiditSDK vendored xcframework'
  s.homepage     = 'https://github.com/nicklama/openssl-universal'
  s.license      = { :type => 'Dual OpenSSL/SSLeay', :text => 'See OpenSSL license' }
  s.author       = 'stub'
  s.source       = { :git => '', :tag => s.version.to_s }
  s.ios.deployment_target = '13.0'
  s.preserve_paths = 'README.md'

  # Point consumers to DiditSDK's vendored OpenSSL.xcframework so `import OpenSSL` resolves.
  s.pod_target_xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "${PODS_ROOT}/DiditSDK"'
  }
  s.user_target_xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "${PODS_ROOT}/DiditSDK"'
  }
end

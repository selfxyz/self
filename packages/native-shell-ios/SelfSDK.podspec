Pod::Spec.new do |s|
  s.name = 'SelfSDK'
  s.version = '0.1.0'
  s.summary = 'iOS native shell for hosting the Self SDK web experience.'
  s.homepage = 'https://github.com/selfxyz/self'
  s.license = { :type => 'BUSL-1.1', :file => 'LICENSE' }
  s.author = { 'Self' => 'support@self.xyz' }
  s.source = { :git => 'https://github.com/selfxyz/self.git', :tag => s.version.to_s }

  s.ios.deployment_target = '15.0'
  s.swift_version = '5.9'

  s.source_files = 'Sources/SelfNativeShell/**/*.swift'
  s.frameworks = 'UIKit', 'WebKit', 'CryptoKit'
end

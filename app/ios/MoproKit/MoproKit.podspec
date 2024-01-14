#
# Be sure to run `pod lib lint MoproKit.podspec' to ensure this is a
# valid spec before submitting.
#
# Any lines starting with a # are optional, but their use is encouraged
# To learn more about a Podspec see https://guides.cocoapods.org/syntax/podspec.html
#

Pod::Spec.new do |s|
  s.name             = 'MoproKit'
  s.version          = '0.1.0'
  s.summary          = 'A short description of MoproKit.'

# This description is used to generate tags and improve search results.
#   * Think: What does it do? Why did you write it? What is the focus?
#   * Try to keep it short, snappy and to the point.
#   * Write the description between the DESC delimiters below.
#   * Finally, don't worry about the indent, CocoaPods strips it!

  s.description      = <<-DESC
TODO: Add long description of the pod here.
                       DESC

  s.homepage         = 'https://github.com/1552237/MoproKit'
  # s.screenshots     = 'www.example.com/screenshots_1', 'www.example.com/screenshots_2'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { '1552237' => 'oskarth@titanproxy.com' }
  s.source           = { :git => 'https://github.com/1552237/MoproKit.git', :tag => s.version.to_s }
  # s.social_media_url = 'https://twitter.com/<TWITTER_USERNAME>'

  s.ios.deployment_target = '13.0'

  s.source_files = 'MoproKit/Classes/**/*'
 
  # libmopro library, headers and modulemap
  # XXX: static library is not in source control, and needs to be inlcuded manually
  # Have to be mindful of architecture and simulator or not here, should be improved
  s.preserve_paths = 'Libs/libmopro_uniffi.a'
  s.vendored_libraries = 'Libs/libmopro_uniffi.a'
  s.source_files = 'Include/*.h', 'Bindings/*.swift'
  s.resource = 'Resources/moproFFI.modulemap'

  # s.resource_bundles = {
  #   'MoproKit' => ['MoproKit/Assets/*.png']
  # }

  # s.public_header_files = 'Pod/Classes/**/*.h'
  # s.frameworks = 'UIKit', 'MapKit'
  # s.dependency 'AFNetworking', '~> 2.3'
end

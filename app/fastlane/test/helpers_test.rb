require 'minitest/autorun'
require_relative '../helpers'

class HelpersTest < Minitest::Test
  def setup
    @gradle = Tempfile.new(['build', '.gradle'])
    @gradle.write("versionCode 5\n")
    @gradle.close
    Fastlane::Helpers::Android.class_variable_set(:@@android_has_permissions, true)
  end

  def teardown
    @gradle.unlink
  end

  def test_android_increment_version_code
    new_code = Fastlane::Helpers.android_increment_version_code(@gradle.path)
    assert_equal 6, new_code
    assert_includes File.read(@gradle.path), 'versionCode 6'
  end

  def test_should_upload_app
    ENV.delete('CI')
    ENV.delete('FORCE_UPLOAD_LOCAL_DEV')
    ENV.delete('ACT')
    ENV.delete('IS_PR')
    assert_equal false, Fastlane::Helpers.should_upload_app('ios')
    ENV['FORCE_UPLOAD_LOCAL_DEV'] = 'true'
    assert_equal true, Fastlane::Helpers.should_upload_app('ios')
  ensure
    ENV.delete('FORCE_UPLOAD_LOCAL_DEV')
  end
end

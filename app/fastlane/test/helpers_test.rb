require 'minitest/autorun'
require_relative '../helpers'

class HelpersTest < Minitest::Test
  def setup
    @gradle = Tempfile.new(['build', '.gradle'])
    @gradle.write("versionCode 5\n")
    @gradle.close
    Fastlane::Helpers::Android.set_permissions(true)
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
    assert_respond_to Fastlane::Helpers, :should_upload_app
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

  def test_should_upload_app_with_ci
    ENV['CI'] = 'true'
    %w[FORCE_UPLOAD_LOCAL_DEV ACT IS_PR].each { |v| ENV.delete(v) }
    assert_equal true, Fastlane::Helpers.should_upload_app('ios')
  ensure
    ENV.delete('CI')
  end

  def test_should_upload_app_with_act_or_is_pr
    %w[ACT IS_PR].each do |flag|
      ENV[flag] = 'true'
      %w[CI FORCE_UPLOAD_LOCAL_DEV].each { |v| ENV.delete(v) }
      assert_equal false, Fastlane::Helpers.should_upload_app('ios'), "#{flag} should block upload"
      ENV.delete(flag)
    end
  end

  def test_should_upload_app_with_invalid_platform
    %w[CI ACT IS_PR FORCE_UPLOAD_LOCAL_DEV].each { |v| ENV.delete(v) }
    assert_equal false, Fastlane::Helpers.should_upload_app(nil)
  end
end

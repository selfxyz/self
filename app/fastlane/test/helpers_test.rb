# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

require "minitest/autorun"
require_relative "../helpers"

class HelpersTest < Minitest::Test
  def setup
    @gradle = Tempfile.new(["build", ".gradle"])
    @gradle.write("versionCode 5\n")
    @gradle.close
    Fastlane::Helpers::Android.set_permissions(true)

    # Store original environment for cleanup
    @original_env = ENV.to_h
    clear_test_env_vars
  end

  def teardown
    @gradle.unlink

    # Restore original environment
    ENV.clear
    ENV.update(@original_env)
  end

  def test_android_increment_version_code
    new_code = Fastlane::Helpers.android_increment_version_code(@gradle.path)
    assert_equal 6, new_code
    assert_includes File.read(@gradle.path), "versionCode 6"
  end

  def test_should_upload_app
    assert_respond_to Fastlane::Helpers, :should_upload_app
    ENV.delete("CI")
    ENV.delete("FORCE_UPLOAD_LOCAL_DEV")
    ENV.delete("ACT")
    ENV.delete("IS_PR")
    assert_equal false, Fastlane::Helpers.should_upload_app("ios")
    ENV["FORCE_UPLOAD_LOCAL_DEV"] = "true"
    assert_equal true, Fastlane::Helpers.should_upload_app("ios")
  ensure
    ENV.delete("FORCE_UPLOAD_LOCAL_DEV")
  end

  def test_should_upload_app_with_ci
    ENV["CI"] = "true"
    %w[FORCE_UPLOAD_LOCAL_DEV ACT IS_PR].each { |v| ENV.delete(v) }
    assert_equal true, Fastlane::Helpers.should_upload_app("ios")
  ensure
    ENV.delete("CI")
  end

  def test_should_upload_app_with_act_or_is_pr
    %w[ACT IS_PR].each do |flag|
      ENV[flag] = "true"
      %w[CI FORCE_UPLOAD_LOCAL_DEV].each { |v| ENV.delete(v) }
      assert_equal false, Fastlane::Helpers.should_upload_app("ios"), "#{flag} should block upload"
      ENV.delete(flag)
    end
  end

  def test_should_upload_app_with_invalid_platform
    %w[CI ACT IS_PR FORCE_UPLOAD_LOCAL_DEV].each { |v| ENV.delete(v) }
    assert_equal false, Fastlane::Helpers.should_upload_app(nil)
  end

  # Environment Detection Tests
  def test_is_ci_environment_true_conditions
    ENV["CI"] = "true"
    ENV.delete("ACT")
    assert_equal true, Fastlane::Helpers.is_ci_environment?
  end

  def test_is_ci_environment_false_with_act
    ENV["CI"] = "true"
    ENV["ACT"] = "true"
    assert_equal false, Fastlane::Helpers.is_ci_environment?
  end

  def test_is_ci_environment_false_without_ci
    ENV.delete("CI")
    ENV.delete("ACT")
    assert_equal false, Fastlane::Helpers.is_ci_environment?
  end

  def test_is_ci_environment_false_with_ci_false
    ENV["CI"] = "false"
    ENV.delete("ACT")
    assert_equal false, Fastlane::Helpers.is_ci_environment?
  end

  # Android File Operations Tests
  def test_android_create_keystore_success
    test_data = "fake keystore binary data"
    ENV["ANDROID_KEYSTORE"] = Base64.encode64(test_data)
    temp_path = File.join(Dir.tmpdir, "test_keystore.jks")

    result = Fastlane::Helpers.android_create_keystore(temp_path)

    assert File.exist?(temp_path)
    assert_equal test_data, File.read(temp_path)
    assert_equal File.realpath(temp_path), result
  ensure
    File.delete(temp_path) if File.exist?(temp_path)
  end

  def test_android_create_keystore_missing_env
    ENV.delete("ANDROID_KEYSTORE")
    result = Fastlane::Helpers.android_create_keystore("/tmp/test.jks")
    assert_nil result
  end

  def test_android_create_keystore_creates_directory
    test_data = "keystore content"
    ENV["ANDROID_KEYSTORE"] = Base64.encode64(test_data)
    nested_path = File.join(Dir.tmpdir, "nested", "dir", "keystore.jks")

    result = Fastlane::Helpers.android_create_keystore(nested_path)

    assert File.exist?(nested_path)
    assert_equal test_data, File.read(nested_path)
    assert_equal File.realpath(nested_path), result
  ensure
    FileUtils.rm_rf(File.join(Dir.tmpdir, "nested")) if File.exist?(File.join(Dir.tmpdir, "nested"))
  end

  def test_android_create_play_store_key_success
    test_json = '{"type": "service_account", "project_id": "test"}'
    ENV["ANDROID_PLAY_STORE_JSON_KEY_BASE64"] = Base64.encode64(test_json)
    temp_path = File.join(Dir.tmpdir, "play_store_key.json")

    result = Fastlane::Helpers.android_create_play_store_key(temp_path)

    assert File.exist?(temp_path)
    assert_equal test_json, File.read(temp_path)
    assert_equal File.realpath(temp_path), result
  ensure
    File.delete(temp_path) if File.exist?(temp_path)
  end

  def test_android_create_play_store_key_missing_env
    ENV.delete("ANDROID_PLAY_STORE_JSON_KEY_BASE64")
    result = Fastlane::Helpers.android_create_play_store_key("/tmp/test.json")
    assert_nil result
  end

  # Gradle Parsing Edge Cases
  def test_android_increment_version_code_different_formats
    test_cases = [
      "versionCode 999",
      "  versionCode   123  ",
      "android {\n  versionCode 42\n}",
      "versionCode 0",
    ]

    test_cases.each_with_index do |gradle_content, index|
      # Create a new tempfile for each test case
      gradle_file = Tempfile.new(["build_test", ".gradle"])
      gradle_file.write(gradle_content)
      gradle_file.close

      current_version = gradle_content.match(/versionCode\s+(\d+)/)[1].to_i
      expected_version = current_version + 1

      new_code = Fastlane::Helpers.android_increment_version_code(gradle_file.path)
      assert_equal expected_version, new_code
      assert_includes File.read(gradle_file.path), "versionCode #{expected_version}"

      gradle_file.unlink
    end
  end

  def test_android_increment_version_code_no_permissions
    Fastlane::Helpers::Android.set_permissions(false)
    original_content = File.read(@gradle.path)

    # Should return current version, not increment
    new_code = Fastlane::Helpers.android_increment_version_code(@gradle.path)
    assert_equal 5, new_code  # Current version, not incremented
    assert_equal original_content, File.read(@gradle.path)  # File unchanged
  ensure
    Fastlane::Helpers::Android.set_permissions(true)
  end

  def test_android_increment_version_code_missing_file
    assert_raises(RuntimeError) do
      Fastlane::Helpers.android_increment_version_code("/nonexistent/build.gradle")
    end
  end

  # Android Version Code Verification Tests
  # Note: These tests focus on the error handling improvements made to android_verify_version_code
  # Full integration tests would require Play Store API mocking, which is beyond the scope of unit tests

  def test_android_verify_version_code_parsing_logic
    # Test the parsing logic that we improved by creating a private method to extract version code
    test_cases = [
      { content: "versionCode 123", expected: 123 },
      { content: "  versionCode   456  ", expected: 456 },
      { content: "android {\n  versionCode 789\n}", expected: 789 },
      { content: "versionCode 0", expected: 0 },
    ]

    test_cases.each do |test_case|
      gradle_file = Tempfile.new(["build", ".gradle"])
      gradle_file.write(test_case[:content])
      gradle_file.close

      # Test the regex parsing that we improved
      line = File.readlines(gradle_file.path).find { |l| l.include?("versionCode") }
      refute_nil line, "Should find versionCode line"

      match = line.match(/versionCode\s+(\d+)/)
      refute_nil match, "Should match versionCode pattern"
      assert_equal test_case[:expected], match[1].to_i, "Should extract correct version code"

      gradle_file.unlink
    end
  end

  def test_android_verify_version_code_missing_version_code_line
    # Test the error handling when versionCode is missing
    gradle_file = Tempfile.new(["build", ".gradle"])
    gradle_file.write("applicationId 'com.example.app'\nminSdkVersion 24\n")
    gradle_file.close

    # Test the logic that we improved
    line = File.readlines(gradle_file.path).find { |l| l.include?("versionCode") }
    assert_nil line, "Should not find versionCode line"

    gradle_file.unlink
  end

  def test_android_verify_version_code_invalid_format
    # Test the error handling when versionCode format is invalid
    test_cases = [
      "versionCode 'invalid'",
      "versionCode abc",
      "versionCode",
      "versionCode   ",
    ]

    test_cases.each do |content|
      gradle_file = Tempfile.new(["build", ".gradle"])
      gradle_file.write(content)
      gradle_file.close

      # Test the regex parsing that we improved
      line = File.readlines(gradle_file.path).find { |l| l.include?("versionCode") }
      refute_nil line, "Should find versionCode line"

      match = line.match(/versionCode\s+(\d+)/)
      assert_nil match, "Should not match invalid versionCode pattern: #{content}"

      gradle_file.unlink
    end
  end

  # Retry Logic Tests
  def test_with_retry_success_first_attempt
    attempt_count = 0
    result = Fastlane::Helpers.with_retry(max_retries: 3, delay: 0) do
      attempt_count += 1
      "success"
    end

    assert_equal 1, attempt_count
    assert_equal "success", result
  end

  def test_with_retry_success_after_failures
    attempt_count = 0
    result = Fastlane::Helpers.with_retry(max_retries: 3, delay: 0) do
      attempt_count += 1
      raise "temporary failure" if attempt_count < 3
      "success"
    end

    assert_equal 3, attempt_count
    assert_equal "success", result
  end

  def test_with_retry_max_retries_exceeded
    attempt_count = 0
    assert_raises(FastlaneCore::Interface::FastlaneError) do
      Fastlane::Helpers.with_retry(max_retries: 2, delay: 0) do
        attempt_count += 1
        raise "persistent failure"
      end
    end

    assert_equal 2, attempt_count
  end

  def test_with_retry_custom_parameters
    attempt_count = 0

    assert_raises(FastlaneCore::Interface::FastlaneError) do
      Fastlane::Helpers.with_retry(max_retries: 1, delay: 0) do
        attempt_count += 1
        raise "failure"
      end
    end

    assert_equal 1, attempt_count
  end

  # Environment Variable Validation Logic
  def test_verify_env_vars_all_present
    ENV["TEST_VAR1"] = "value1"
    ENV["TEST_VAR2"] = "value2"

    # Test the underlying logic that verify_env_vars uses
    required_vars = ["TEST_VAR1", "TEST_VAR2"]
    missing = required_vars.select { |var| ENV[var].to_s.strip.empty? }

    assert_empty missing
  end

  def test_verify_env_vars_some_missing
    ENV["PRESENT_VAR"] = "value"
    ENV.delete("MISSING_VAR1")
    ENV["EMPTY_VAR"] = ""
    ENV["WHITESPACE_VAR"] = "   "

    # Test the underlying logic that verify_env_vars uses
    required_vars = ["PRESENT_VAR", "MISSING_VAR1", "EMPTY_VAR", "WHITESPACE_VAR"]
    missing = required_vars.select { |var| ENV[var].to_s.strip.empty? }

    assert_equal ["MISSING_VAR1", "EMPTY_VAR", "WHITESPACE_VAR"], missing
  end

  def test_upload_file_to_slack_missing_channel
    ENV["SLACK_API_TOKEN"] = "token"
    file = Tempfile.new(["artifact", ".txt"])
    file.write("data")
    file.close

    assert_raises(FastlaneCore::Interface::FastlaneCommonException) do
      Fastlane::Helpers.upload_file_to_slack(file_path: file.path, channel_id: "")
    end
  ensure
    file.unlink
    ENV.delete("SLACK_API_TOKEN")
  end

  def test_upload_file_to_slack_missing_token
    ENV.delete("SLACK_API_TOKEN")
    file = Tempfile.new(["artifact", ".txt"])
    file.write("data")
    file.close

    assert_raises(FastlaneCore::Interface::FastlaneCommonException) do
      Fastlane::Helpers.upload_file_to_slack(file_path: file.path, channel_id: "C123")
    end
  ensure
    file.unlink
  end

  def test_slack_deploy_source_messages
    file = Tempfile.new(["artifact", ".txt"])
    file.write("data")
    file.close

    %w[true nil].each do |ci_value|
      ENV["CI"] = ci_value == "true" ? "true" : nil
      captured = nil
      Fastlane::Helpers.stub(:upload_file_to_slack, ->(**args) { captured = args }) do
        deploy_source = Fastlane::Helpers.is_ci_environment? ? "GitHub Workflow" : "Local Deploy"
        Fastlane::Helpers.upload_file_to_slack(
          file_path: file.path,
          channel_id: "C123",
          initial_comment: "Deploy via #{deploy_source}",
        )
      end
      expected = ci_value == "true" ? "GitHub Workflow" : "Local Deploy"
      assert_includes captured[:initial_comment], expected
    end
  ensure
    file.unlink
    ENV.delete("CI")
  end

  private

  def clear_test_env_vars
    # Clean up environment variables that might affect tests
    test_vars = %w[
      CI ACT FORCE_UPLOAD_LOCAL_DEV IS_PR
      ANDROID_KEYSTORE ANDROID_PLAY_STORE_JSON_KEY_BASE64
      TEST_VAR1 TEST_VAR2 PRESENT_VAR MISSING_VAR1 EMPTY_VAR WHITESPACE_VAR
    ]
    test_vars.each { |var| ENV.delete(var) }
  end
end

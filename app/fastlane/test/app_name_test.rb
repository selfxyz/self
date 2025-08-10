# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

require "minitest/autorun"
require "json"
require "tmpdir"
require "fileutils"
require_relative "../helpers"

class AppNameTest < Minitest::Test
  def setup
    @orig_env = ENV.to_h
    @tmp = Dir.mktmpdir
  end

  def teardown
    FileUtils.remove_entry(@tmp)
    ENV.clear
    ENV.update(@orig_env)
  end

  def write_app_json(content)
    File.write(File.join(@tmp, "app.json"), content)
  end

  def evaluate_app_name
    ENV["IOS_PROJECT_NAME"] || begin
      app_json_path = File.join(@tmp, "app.json")
      if File.exist?(app_json_path)
        app_config = JSON.parse(File.read(app_json_path))
        app_config["displayName"] if app_config.is_a?(Hash)
      end
    rescue JSON::ParserError, Errno::ENOENT
      Fastlane::UI.ui_object.important("Could not read app.json or invalid JSON format, using default app name")
      nil
    end || "MobileApp"
  end

  def test_env_variable_precedence
    ENV["IOS_PROJECT_NAME"] = "EnvApp"
    assert_equal "EnvApp", evaluate_app_name
  end

  def test_display_name_from_app_json
    ENV.delete("IOS_PROJECT_NAME")
    write_app_json({ displayName: "JsonApp" }.to_json)
    assert_equal "JsonApp", evaluate_app_name
  end

  def test_default_when_app_json_missing_or_malformed
    ENV.delete("IOS_PROJECT_NAME")
    write_app_json("{ invalid json")
    messages = []
    ui_obj = Fastlane::UI.ui_object
    orig = ui_obj.method(:important)
    ui_obj.define_singleton_method(:important) { |msg| messages << msg }
    assert_equal "MobileApp", evaluate_app_name
    assert_includes messages.first, "Could not read app.json"
    ui_obj.define_singleton_method(:important, orig)
  end
end

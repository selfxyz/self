module Helpers
  # for local development
  def self.verify_env_vars(required_vars)
    missing_vars = required_vars.select { |var| ENV[var].nil? || ENV[var].empty? }
    
    if missing_vars.any?
      UI.error("❌ Missing required environment variables: #{missing_vars.join(', ')}")
      UI.error("Please check your .env.secrets file")
      UI.abort_with_message!("Environment verification failed")
    else
      UI.success("✅ All required environment variables are present")
    end
  end

  # Verify build number against App Store Connect
  # Because the app store api will auto increment the build number
  def self.verify_ios_app_store_build_number
    api_key = app_store_connect_api_key(
      key_id: ENV["APP_STORE_CONNECT_KEY_ID"],
      issuer_id: ENV["APP_STORE_CONNECT_ISSUER_ID"],
      key_content: ENV["APP_STORE_CONNECT_API_KEY"],
    )
    
    latest_build = latest_testflight_build_number(
      api_key: api_key,
      app_identifier: ENV["APP_STORE_APP_IDENTIFIER"],
      team_id: ENV["APP_STORE_TEAM_ID"]
    )
    
    project = Xcodeproj::Project.open("../ios/Self.xcodeproj")
    target = project.targets.first
    current_build = target.build_configurations.first.build_settings["CURRENT_PROJECT_VERSION"]
    
    if current_build.to_i <= latest_build.to_i
      UI.error("❌ Build number must be greater than latest TestFlight build!")
      UI.error("Latest TestFlight build: #{latest_build}")
      UI.error("Current build: #{current_build}")
      UI.error("Please increment the build number in the project settings")
      UI.abort_with_message!("Build number verification failed")
    else
      UI.success("✅ Build number verified (Current: #{current_build}, Latest TestFlight: #{latest_build})")
    end
  end
end 

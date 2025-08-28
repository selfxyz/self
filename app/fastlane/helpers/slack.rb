# SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

module Fastlane
  module Helpers
    module Slack
      # Upload a file to Slack using the files.upload API
      def upload_file_to_slack(file_path:, channel_id:, initial_comment: nil, thread_ts: nil, title: nil)
        slack_token = ENV["SLACK_API_TOKEN"]
        report_error("Missing SLACK_API_TOKEN environment variable.", nil, "Slack Upload Failed") if slack_token.to_s.strip.empty?
        report_error("Missing SLACK_CHANNEL_ID environment variable.", nil, "Slack Upload Failed") if channel_id.to_s.strip.empty?
        report_error("File not found at path: #{file_path}", nil, "Slack Upload Failed") unless File.exist?(file_path)

        file_name = File.basename(file_path)
        file_size = File.size(file_path)
        file_title = title || file_name

        upload_url, file_id = request_upload_url(slack_token, file_name, file_size)
        upload_file_content(upload_url, file_path, file_size)
        final_info = complete_upload(slack_token, file_id, file_title, channel_id, initial_comment, thread_ts)

        report_success("Successfully uploaded and shared #{file_name} to Slack channel #{channel_id}")
        final_info
      rescue => e
        report_error("Error during Slack upload process: #{e.message}", e.backtrace.join("\n"), "Slack Upload Failed")
        false
      end

      private

      def request_upload_url(slack_token, file_name, file_size)
        upload_url = nil
        file_id = nil
        with_retry(max_retries: 3, delay: 5) do
          uri = URI.parse("https://slack.com/api/files.getUploadURLExternal")
          request = Net::HTTP::Post.new(uri)
          request["Authorization"] = "Bearer #{slack_token}"
          request.set_form_data(filename: file_name, length: file_size)
          http = Net::HTTP.new(uri.host, uri.port)
          http.use_ssl = true
          response = http.request(request)

          # Handle rate limiting specifically
          if response.code == "429"
            raise "HTTP 429 Rate limit exceeded for Slack API"
          end

          raise "Slack API failed: #{response.code} #{response.body}" unless response.is_a?(Net::HTTPSuccess)
          json = JSON.parse(response.body)
          raise "Slack API Error: #{json["error"]}" unless json["ok"]
          upload_url = json["upload_url"]
          file_id = json["file_id"]
        end
        [upload_url, file_id]
      end

      def upload_file_content(upload_url, file_path, file_size)
        with_retry(max_retries: 3, delay: 5) do
          upload_uri = URI.parse(upload_url)
          upload_request = Net::HTTP::Post.new(upload_uri)
          upload_request.body = File.binread(file_path)
          upload_request["Content-Type"] = "application/octet-stream"
          upload_request["Content-Length"] = file_size.to_s
          upload_http = Net::HTTP.new(upload_uri.host, upload_uri.port)
          upload_http.use_ssl = true
          upload_response = upload_http.request(upload_request)

          # Handle rate limiting specifically
          if upload_response.code == "429"
            raise "HTTP 429 Rate limit exceeded for file upload"
          end

          raise "File upload failed: #{upload_response.code} #{upload_response.message}" unless upload_response.is_a?(Net::HTTPOK)
        end
      end

      def complete_upload(slack_token, file_id, file_title, channel_id, initial_comment, thread_ts)
        final_info = nil
        with_retry(max_retries: 3, delay: 5) do
          complete_uri = URI.parse("https://slack.com/api/files.completeUploadExternal")
          complete_request = Net::HTTP::Post.new(complete_uri)
          complete_request["Authorization"] = "Bearer #{slack_token}"
          complete_request["Content-Type"] = "application/json; charset=utf-8"
          payload = { files: [{ id: file_id, title: file_title }], channel_id: channel_id }
          payload[:initial_comment] = initial_comment if initial_comment
          payload[:thread_ts] = thread_ts if thread_ts
          complete_request.body = payload.to_json
          complete_http = Net::HTTP.new(complete_uri.host, complete_uri.port)
          complete_http.use_ssl = true
          complete_response = complete_http.request(complete_request)

          # Handle rate limiting specifically
          if complete_response.code == "429"
            raise "HTTP 429 Rate limit exceeded for Slack API"
          end

          raise "Slack API failed: #{complete_response.code} #{complete_response.body}" unless complete_response.is_a?(Net::HTTPSuccess)
          json = JSON.parse(complete_response.body)
          raise "Slack API Error: #{json["error"]}" unless json["ok"]
          final_info = json["files"]&.first
        end
        final_info
      end
    end
  end
end

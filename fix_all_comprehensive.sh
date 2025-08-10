#!/bin/bash

echo "🔧 Fixing ALL files missing new lines after license headers..."

# List of files that need fixing (single-line license headers)
single_line_files=(
    "app/react-native.config.cjs"
    "app/scripts/tests/mobile-deploy-confirm-module.test.cjs"
    "app/scripts/tests/cleanup-ios-build.test.cjs"
    "app/scripts/alias-imports.cjs"
    "app/fastlane/helpers/ios.rb"
    "app/env.ts"
    "app/babel.config.cjs"
    "app/src/types/svg.d.ts"
)

# List of files that need fixing (split license headers - shebang + license)
split_header_files=(
    "app/scripts/tests/bundle-analyze-ci.test.cjs"
    "app/scripts/tests/alias-imports.test.cjs"
    "app/scripts/tests/tree-shaking.test.cjs"
    "app/scripts/test-tree-shaking.cjs"
    "app/scripts/analyze-tree-shaking.cjs"
    "app/scripts/bundle-analyze-ci.cjs"
)

# Fix single-line license header files
for file in "${single_line_files[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing single-line: $file"
        sed -i '' '1a\
' "$file"
        echo "✅ Fixed: $file"
    else
        echo "❌ File not found: $file"
    fi
done

# Fix split license header files (shebang + license)
for file in "${split_header_files[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing split-header: $file"
        sed -i '' '2a\
' "$file"
        echo "✅ Fixed: $file"
    else
        echo "❌ File not found: $file"
    fi
done

echo "�� All files fixed!"

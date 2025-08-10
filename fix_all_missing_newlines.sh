#!/bin/bash

echo "🔧 Fixing all files missing new lines after license headers..."

# List of files that need fixing
files=(
    "app/react-native.config.cjs"
    "app/scripts/tests/mobile-deploy-confirm-module.test.cjs"
    "app/scripts/tests/cleanup-ios-build.test.cjs"
    "app/scripts/alias-imports.cjs"
    "app/fastlane/helpers/ios.rb"
    "app/env.ts"
    "app/babel.config.cjs"
    "app/src/types/svg.d.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing: $file"

        # Fix JavaScript/TypeScript files
        if [[ "$file" == *.ts ]] || [[ "$file" == *.tsx ]] || [[ "$file" == *.js ]] || [[ "$file" == *.jsx ]] || [[ "$file" == *.cjs ]]; then
            sed -i '' '1a\
' "$file"
        # Fix Ruby files
        elif [[ "$file" == *.rb ]]; then
            sed -i '' '1a\
' "$file"
        fi

        echo "✅ Fixed: $file"
    else
        echo "❌ File not found: $file"
    fi
done

echo "�� All files fixed!"
